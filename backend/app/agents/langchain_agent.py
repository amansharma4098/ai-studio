"""
Agent Execution Engine
Runs agents using the Groq API directly (no LangChain, no Ollama).
"""
import os
import time
import json
import structlog
from typing import Any, Dict, List, Optional

from groq import Groq

from app.skills.registry import skill_registry

logger = structlog.get_logger()

# ── Model name mapping ───────────────────────────────────────────
MODEL_MAP = {
    "llama3": "llama3-8b-8192",
    "mistral": "mixtral-8x7b-32768",
    "gemma": "gemma-7b-it",
}


def _resolve_model(model_name: str) -> str:
    """Map friendly model names to Groq model IDs."""
    return MODEL_MAP.get(model_name, model_name if model_name in MODEL_MAP.values() else "llama3-8b-8192")


# ── Groq Chat Completion ─────────────────────────────────────────
def run_agent_with_groq(
    agent_name: str,
    system_prompt: str,
    model_name: str,
    temperature: float,
    max_tokens: int,
    input_text: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
) -> str:
    """
    Run a simple chat completion against Groq API.
    Returns the assistant response content.
    """
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    model_id = _resolve_model(model_name)

    messages = [{"role": "system", "content": system_prompt or f"You are {agent_name}, a helpful AI assistant."}]
    if conversation_history:
        messages.extend(conversation_history)
    messages.append({"role": "user", "content": input_text})

    response = client.chat.completions.create(
        model=model_id,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens or 2048,
    )

    return response.choices[0].message.content


# ── Tool-calling agent loop ──────────────────────────────────────
def build_agent_executor(
    agent_name: str,
    system_prompt: str,
    model_name: str,
    temperature: float,
    max_tokens: int,
    skill_bindings: List[Dict],
    credentials_map: Dict[str, Dict],
    memory_enabled: bool = True,
) -> Dict[str, Any]:
    """
    Build an agent config dict (no longer a LangChain executor).
    The actual execution happens in run_agent().
    """
    # Resolve tools from skill bindings
    tools = []
    for binding in skill_bindings:
        skill_name = binding["skill_name"]
        credential_id = binding.get("credential_id")
        credential_data = credentials_map.get(credential_id, {}) if credential_id else {}

        skill_fn = skill_registry.get(skill_name)
        if not skill_fn:
            logger.warning("Skill not found in registry", skill=skill_name)
            continue

        tools.append({
            "name": skill_name,
            "description": skill_registry.get_description(skill_name),
            "fn": skill_fn,
            "credential": credential_data,
        })
        logger.info("Tool registered", skill=skill_name, has_credential=bool(credential_data))

    return {
        "agent_name": agent_name,
        "system_prompt": system_prompt,
        "model_name": model_name,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "tools": tools,
    }


def run_agent(
    executor_config: Dict[str, Any],
    user_input: str,
) -> Dict[str, Any]:
    """
    Execute an agent with tool-calling support via Groq API.
    If the agent has tools, builds a ReAct-style prompt; otherwise does a simple chat.
    """
    start = time.time()
    trace = []
    skills_called = []

    agent_name = executor_config["agent_name"]
    system_prompt = executor_config["system_prompt"]
    model_name = executor_config["model_name"]
    temperature = executor_config["temperature"]
    max_tokens = executor_config["max_tokens"]
    tools = executor_config.get("tools", [])

    try:
        if not tools:
            # Simple chat — no tools
            output = run_agent_with_groq(
                agent_name=agent_name,
                system_prompt=system_prompt,
                model_name=model_name,
                temperature=temperature,
                max_tokens=max_tokens,
                input_text=user_input,
            )
        else:
            # ReAct-style tool loop via Groq
            output = _run_react_loop(
                agent_name=agent_name,
                system_prompt=system_prompt,
                model_name=model_name,
                temperature=temperature,
                max_tokens=max_tokens,
                user_input=user_input,
                tools=tools,
                trace=trace,
                skills_called=skills_called,
            )

        elapsed_ms = int((time.time() - start) * 1000)
        return {
            "output": output,
            "trace": trace,
            "status": "completed",
            "execution_time_ms": elapsed_ms,
            "skills_called": skills_called,
        }

    except Exception as e:
        elapsed_ms = int((time.time() - start) * 1000)
        logger.error("Agent execution failed", error=str(e))
        return {
            "output": f"Agent failed: {str(e)}",
            "trace": trace,
            "status": "failed",
            "execution_time_ms": elapsed_ms,
            "skills_called": skills_called,
            "error": str(e),
        }


def _run_react_loop(
    agent_name: str,
    system_prompt: str,
    model_name: str,
    temperature: float,
    max_tokens: int,
    user_input: str,
    tools: List[Dict],
    trace: List[Dict],
    skills_called: List[str],
    max_iterations: int = 10,
) -> str:
    """
    ReAct-style tool loop: ask LLM to reason, call tools, observe, repeat.
    """
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    model_id = _resolve_model(model_name)

    # Build tool descriptions for the system prompt
    tool_descs = "\n".join(
        f"- {t['name']}: {t['description']}" for t in tools
    )
    tool_names = ", ".join(t["name"] for t in tools)
    tool_map = {t["name"]: t for t in tools}

    react_system = f"""You are {agent_name}, an AI assistant with access to specialized tools.

{system_prompt}

You have access to the following tools:
{tool_descs}

Use the following format EXACTLY:

Thought: think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action (valid JSON)
Observation: <will be filled by the system>
... (this Thought/Action/Observation can repeat)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Important rules:
- Always use tools when they are relevant to the question
- Never make up data — use tools to fetch real information
- Action Input must be valid JSON
- Be concise in Final Answer but include all key results"""

    messages = [
        {"role": "system", "content": react_system},
        {"role": "user", "content": user_input},
    ]

    for iteration in range(max_iterations):
        response = client.chat.completions.create(
            model=model_id,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens or 2048,
        )
        assistant_text = response.choices[0].message.content or ""
        messages.append({"role": "assistant", "content": assistant_text})

        # Check for Final Answer
        if "Final Answer:" in assistant_text:
            final = assistant_text.split("Final Answer:")[-1].strip()
            return final

        # Parse Action and Action Input
        action_name, action_input = _parse_action(assistant_text)
        if not action_name:
            # No action found — treat as final answer
            return assistant_text

        # Execute tool
        tool = tool_map.get(action_name)
        if not tool:
            observation = f"Error: Unknown tool '{action_name}'. Available: {tool_names}"
        else:
            observation = _execute_tool(tool, action_input)
            skills_called.append(action_name)

        trace.append({
            "step": action_name,
            "input": action_input,
            "output": str(observation)[:500],
            "status": "ok" if tool else "error",
        })

        # Feed observation back
        messages.append({"role": "user", "content": f"Observation: {observation}"})

    # Max iterations reached
    return assistant_text if 'assistant_text' in dir() else "Agent reached maximum iterations without a final answer."


def _parse_action(text: str):
    """Extract Action and Action Input from ReAct-formatted text."""
    action_name = None
    action_input = ""

    for line in text.split("\n"):
        line = line.strip()
        if line.startswith("Action:") and not line.startswith("Action Input:"):
            action_name = line.split("Action:", 1)[1].strip()
        elif line.startswith("Action Input:"):
            action_input = line.split("Action Input:", 1)[1].strip()

    return action_name, action_input


def _execute_tool(tool: Dict, tool_input: str) -> str:
    """Execute a skill tool with credential injection."""
    try:
        try:
            params = json.loads(tool_input) if tool_input else {}
        except json.JSONDecodeError:
            params = {"input": tool_input}

        if tool.get("credential"):
            params["_credential"] = tool["credential"]

        result = tool["fn"](params)
        return json.dumps(result) if isinstance(result, dict) else str(result)
    except Exception as e:
        return f"Error executing {tool['name']}: {str(e)}"
