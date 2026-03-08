"""
LangChain Agent Orchestration Engine
Builds ReAct agents with Groq LLMs and dynamically bound skill tools.
"""
import time
import json
import structlog
from typing import Any, Dict, List, Optional

from langchain.agents import AgentExecutor, create_react_agent
from langchain.memory import ConversationBufferWindowMemory
from langchain_core.prompts import PromptTemplate
from langchain_core.tools import StructuredTool, Tool
from langchain_groq import ChatGroq

from app.utils.config import settings
from app.skills.registry import skill_registry

logger = structlog.get_logger()


# ── Groq LLM Factory ──────────────────────────────────────────────
def build_llm(model_name: str, temperature: float, max_tokens: int) -> ChatGroq:
    """Create a LangChain ChatGroq LLM instance."""
    return ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model=model_name or settings.GROQ_MODEL,
        temperature=temperature,
        max_tokens=max_tokens,
    )


# ── ReAct Prompt ──────────────────────────────────────────────────
REACT_PROMPT_TEMPLATE = """You are {agent_name}, an AI assistant with access to specialized tools.

{system_prompt}

You have access to the following tools:
{tools}

Use the following format EXACTLY:

Question: the input question you must answer
Thought: think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action (valid JSON)
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Important rules:
- Always use tools when they are relevant
- Never make up data — use tools to fetch real information
- For Microsoft Entra or Azure operations, the credential is already injected — just call the tool
- Be concise in Final Answer but include all key results

Begin!

Question: {input}
Thought:{agent_scratchpad}"""

REACT_PROMPT = PromptTemplate(
    template=REACT_PROMPT_TEMPLATE,
    input_variables=["input", "agent_scratchpad", "tools", "tool_names"],
    partial_variables={"agent_name": "AI Assistant", "system_prompt": ""},
)


# ── Agent Builder ─────────────────────────────────────────────────
def build_agent_executor(
    agent_name: str,
    system_prompt: str,
    model_name: str,
    temperature: float,
    max_tokens: int,
    skill_bindings: List[Dict],
    credentials_map: Dict[str, Dict],
    memory_enabled: bool = True,
) -> AgentExecutor:
    """
    Build a LangChain ReAct AgentExecutor with dynamically bound tools.

    Args:
        skill_bindings: List of {skill_id, skill_name, credential_id}
        credentials_map: {credential_id: {tenant_id, client_id, client_secret, ...}}
        memory_enabled: whether to use ConversationBufferWindowMemory
    """
    # 1. Build Groq LLM
    llm = build_llm(model_name, temperature, max_tokens)

    # 2. Build tools from skill bindings
    tools = _build_tools(skill_bindings, credentials_map)

    # 3. Build prompt with agent name + system prompt
    prompt = REACT_PROMPT.partial(
        agent_name=agent_name,
        system_prompt=system_prompt,
    )

    # 4. Create ReAct agent
    agent = create_react_agent(llm=llm, tools=tools, prompt=prompt)

    # 5. Optional memory
    memory = None
    if memory_enabled:
        memory = ConversationBufferWindowMemory(
            k=10,
            memory_key="chat_history",
            return_messages=True,
        )

    # 6. Wrap in AgentExecutor with error handling
    executor = AgentExecutor(
        agent=agent,
        tools=tools,
        memory=memory,
        verbose=True,
        max_iterations=10,
        early_stopping_method="generate",
        handle_parsing_errors=True,
        return_intermediate_steps=True,
    )

    return executor


def _build_tools(skill_bindings: List[Dict], credentials_map: Dict[str, Dict]) -> List[Tool]:
    """
    Dynamically build LangChain Tool objects from skill bindings.
    Each tool gets its credential injected into its closure.
    """
    tools = []

    for binding in skill_bindings:
        skill_name = binding["skill_name"]
        credential_id = binding.get("credential_id")

        # Get decrypted credential data for this skill
        credential_data = credentials_map.get(credential_id, {}) if credential_id else {}

        # Look up the skill handler from the registry
        skill_fn = skill_registry.get(skill_name)
        if not skill_fn:
            logger.warning("Skill not found in registry", skill=skill_name)
            continue

        # Create closure that injects the credential
        def make_tool_fn(fn, cred_data):
            def tool_fn(tool_input: str) -> str:
                try:
                    # Parse JSON input
                    try:
                        params = json.loads(tool_input)
                    except json.JSONDecodeError:
                        params = {"input": tool_input}

                    # Inject credential into params
                    if cred_data:
                        params["_credential"] = cred_data

                    result = fn(params)
                    return json.dumps(result) if isinstance(result, dict) else str(result)
                except Exception as e:
                    return f"Error executing skill: {str(e)}"
            return tool_fn

        tool = Tool(
            name=skill_name,
            func=make_tool_fn(skill_fn, credential_data),
            description=skill_registry.get_description(skill_name),
        )
        tools.append(tool)
        logger.info("Tool registered", skill=skill_name, has_credential=bool(credential_data))

    return tools


# ── Run Agent ─────────────────────────────────────────────────────
def run_agent(
    executor: AgentExecutor,
    user_input: str,
) -> Dict[str, Any]:
    """
    Execute an agent and return structured output with trace.
    """
    start = time.time()
    trace = []

    try:
        result = executor.invoke({"input": user_input})
        elapsed_ms = int((time.time() - start) * 1000)

        # Parse intermediate steps into trace
        for step in result.get("intermediate_steps", []):
            action, observation = step
            trace.append({
                "step": action.tool,
                "input": action.tool_input,
                "output": str(observation)[:500],  # truncate long outputs
                "status": "ok",
            })

        return {
            "output": result.get("output", ""),
            "trace": trace,
            "status": "completed",
            "execution_time_ms": elapsed_ms,
            "skills_called": [t["step"] for t in trace],
        }

    except Exception as e:
        elapsed_ms = int((time.time() - start) * 1000)
        logger.error("Agent execution failed", error=str(e))
        return {
            "output": f"Agent failed: {str(e)}",
            "trace": trace,
            "status": "failed",
            "execution_time_ms": elapsed_ms,
            "skills_called": [t["step"] for t in trace],
            "error": str(e),
        }
