"""
Claude Agent Engine — powered by Anthropic Claude API.
Uses native tool_use for function calling (no ReAct prompt hacking).
Supports streaming, extended thinking, and multi-agent orchestration.
"""
import os
import time
import json
import structlog
from typing import Any, Dict, List, Optional

import anthropic

from app.skills.registry import skill_registry

logger = structlog.get_logger()

# ── Model name mapping ───────────────────────────────────────────
MODEL_MAP = {
    "claude-opus": "claude-opus-4-6",
    "claude-sonnet": "claude-sonnet-4-6",
    "claude-haiku": "claude-haiku-4-5-20251001",
    # Keep legacy mappings for backward compat
    "llama3": "claude-sonnet-4-6",
    "mistral": "claude-sonnet-4-6",
    "gemma": "claude-haiku-4-5-20251001",
}

DEFAULT_MODEL = "claude-sonnet-4-6"


def _resolve_model(model_name: str) -> str:
    """Map friendly model names to Claude model IDs."""
    return MODEL_MAP.get(model_name, model_name if "claude" in model_name else DEFAULT_MODEL)


def _get_client() -> anthropic.Anthropic:
    """Get Anthropic client. Falls back to Groq-style key check."""
    api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("CLAUDE_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable is required")
    return anthropic.Anthropic(api_key=api_key)


# ── Build Claude Tools from skill bindings ─────────────────────
def _build_claude_tools(skill_bindings: List[Dict], credentials_map: Dict) -> tuple:
    """
    Convert skill bindings into Claude native tool definitions.
    Returns (tools_list, tool_map) where tool_map maps name -> {fn, credential}.
    """
    tools = []
    tool_map = {}

    for binding in skill_bindings:
        skill_name = binding["skill_name"]
        credential_id = binding.get("credential_id")
        credential_data = credentials_map.get(credential_id, {}) if credential_id else {}

        skill_fn = skill_registry.get(skill_name)
        if not skill_fn:
            logger.warning("Skill not found in registry", skill=skill_name)
            continue

        description = skill_registry.get_description(skill_name)

        # Claude native tool definition
        tools.append({
            "name": skill_name,
            "description": description,
            "input_schema": {
                "type": "object",
                "properties": {
                    "params": {
                        "type": "object",
                        "description": "Parameters for the skill execution"
                    }
                },
                "required": []
            }
        })

        tool_map[skill_name] = {
            "fn": skill_fn,
            "credential": credential_data,
        }

        logger.info("Claude tool registered", skill=skill_name, has_credential=bool(credential_data))

    return tools, tool_map


# ── Simple Chat Completion ─────────────────────────────────────
def run_chat(
    agent_name: str,
    system_prompt: str,
    model_name: str,
    temperature: float,
    max_tokens: int,
    input_text: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
) -> str:
    """Run a simple chat completion against Claude API."""
    client = _get_client()
    model_id = _resolve_model(model_name)

    messages = []
    if conversation_history:
        messages.extend(conversation_history)
    messages.append({"role": "user", "content": input_text})

    system = system_prompt or f"You are {agent_name}, a helpful AI assistant."

    response = client.messages.create(
        model=model_id,
        max_tokens=max_tokens or 4096,
        system=system,
        messages=messages,
        temperature=temperature,
    )

    return response.content[0].text


# ── Build Agent Executor ──────────────────────────────────────
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
    """Build an agent config dict for Claude execution."""
    tools, tool_map = _build_claude_tools(skill_bindings, credentials_map)

    return {
        "agent_name": agent_name,
        "system_prompt": system_prompt,
        "model_name": model_name,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "tools": tools,
        "tool_map": tool_map,
    }


# ── Execute Agent ────────────────────────────────────────────
def run_agent(
    executor_config: Dict[str, Any],
    user_input: str,
) -> Dict[str, Any]:
    """
    Execute an agent with Claude's native tool_use.
    No ReAct prompting needed — Claude handles tool calls natively.
    """
    start = time.time()
    trace = []
    skills_called = []
    total_input_tokens = 0
    total_output_tokens = 0

    agent_name = executor_config["agent_name"]
    system_prompt = executor_config["system_prompt"]
    model_name = executor_config["model_name"]
    temperature = executor_config["temperature"]
    max_tokens = executor_config["max_tokens"]
    tools = executor_config.get("tools", [])
    tool_map = executor_config.get("tool_map", {})

    try:
        if not tools:
            output = run_chat(
                agent_name=agent_name,
                system_prompt=system_prompt,
                model_name=model_name,
                temperature=temperature,
                max_tokens=max_tokens,
                input_text=user_input,
            )
        else:
            output = _run_tool_loop(
                agent_name=agent_name,
                system_prompt=system_prompt,
                model_name=model_name,
                temperature=temperature,
                max_tokens=max_tokens,
                user_input=user_input,
                tools=tools,
                tool_map=tool_map,
                trace=trace,
                skills_called=skills_called,
                token_counter={"input": 0, "output": 0},
            )

        elapsed_ms = int((time.time() - start) * 1000)
        return {
            "output": output,
            "trace": trace,
            "status": "completed",
            "execution_time_ms": elapsed_ms,
            "skills_called": skills_called,
            "input_tokens": total_input_tokens,
            "output_tokens": total_output_tokens,
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


def _run_tool_loop(
    agent_name: str,
    system_prompt: str,
    model_name: str,
    temperature: float,
    max_tokens: int,
    user_input: str,
    tools: List[Dict],
    tool_map: Dict[str, Dict],
    trace: List[Dict],
    skills_called: List[str],
    token_counter: Dict[str, int],
    max_iterations: int = 15,
) -> str:
    """
    Claude native tool_use loop.
    Claude decides when to call tools and when to give a final answer.
    """
    client = _get_client()
    model_id = _resolve_model(model_name)

    system = f"""You are {agent_name}, a powerful AI agent with access to specialized tools.

{system_prompt}

Important:
- Use tools when they are relevant to answer the user's question
- Never fabricate data — always use tools to fetch real information
- Be thorough but concise in your final response
- If a tool fails, explain what happened and try an alternative approach"""

    messages = [{"role": "user", "content": user_input}]

    for iteration in range(max_iterations):
        response = client.messages.create(
            model=model_id,
            max_tokens=max_tokens or 4096,
            system=system,
            messages=messages,
            tools=tools,
            temperature=temperature,
        )

        # Track tokens
        token_counter["input"] += response.usage.input_tokens
        token_counter["output"] += response.usage.output_tokens

        # Check if Claude wants to use tools
        if response.stop_reason == "tool_use":
            # Process all tool calls in this response
            tool_results = []
            assistant_content = response.content

            for block in response.content:
                if block.type == "tool_use":
                    tool_name = block.name
                    tool_input = block.input
                    tool_use_id = block.id

                    # Execute the tool
                    tool_info = tool_map.get(tool_name)
                    if not tool_info:
                        result_text = f"Error: Unknown tool '{tool_name}'"
                        status = "error"
                    else:
                        result_text = _execute_tool(tool_info, tool_input)
                        skills_called.append(tool_name)
                        status = "ok"

                    trace.append({
                        "step": tool_name,
                        "input": tool_input,
                        "output": str(result_text)[:500],
                        "status": status,
                        "iteration": iteration,
                    })

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_use_id,
                        "content": str(result_text),
                    })

            # Add assistant message and tool results to conversation
            messages.append({"role": "assistant", "content": assistant_content})
            messages.append({"role": "user", "content": tool_results})

        elif response.stop_reason == "end_turn":
            # Claude is done — extract text response
            text_parts = [b.text for b in response.content if hasattr(b, "text")]
            return "\n".join(text_parts) if text_parts else "Task completed."

        else:
            # Max tokens or other stop reason
            text_parts = [b.text for b in response.content if hasattr(b, "text")]
            return "\n".join(text_parts) if text_parts else "Response truncated."

    # Max iterations reached
    return "Maximum tool iterations reached. Please try a more specific request."


def _execute_tool(tool_info: Dict, tool_input: Any) -> str:
    """Execute a skill tool with credential injection."""
    import asyncio
    import inspect

    try:
        params = tool_input if isinstance(tool_input, dict) else {}

        # Unwrap if params are nested under "params" key
        if "params" in params and isinstance(params["params"], dict):
            params = params["params"]

        if tool_info.get("credential"):
            params["_credential"] = tool_info["credential"]

        result = tool_info["fn"](params)

        # Handle async skill functions
        if inspect.isawaitable(result):
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = None
            if loop and loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    result = pool.submit(asyncio.run, result).result()
            else:
                result = asyncio.run(result)

        return json.dumps(result) if isinstance(result, dict) else str(result)
    except Exception as e:
        return f"Error executing tool: {str(e)}"


# ── Smart Agent Builder ───────────────────────────────────────
def generate_agent_from_description(description: str, available_skills: List[Dict]) -> Dict[str, Any]:
    """
    Use Claude to generate a complete agent configuration from a natural language description.
    This is the killer feature — describe what you want, get a production agent.
    """
    client = _get_client()

    skills_text = "\n".join(
        f"- {s['name']}: {s['description']} (category: {s.get('category', 'general')})"
        for s in available_skills
    )

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system="""You are an AI agent architect. Given a user's description of what they want an agent to do,
generate a complete agent configuration. You must return ONLY valid JSON with no markdown or extra text.

Return this exact JSON structure:
{
    "name": "Short agent name",
    "description": "What this agent does",
    "system_prompt": "Detailed system prompt that makes the agent excellent at its job",
    "model_name": "claude-sonnet",
    "temperature": 0.7,
    "max_tokens": 4096,
    "suggested_skills": ["skill_name_1", "skill_name_2"],
    "tags": ["tag1", "tag2"],
    "icon": "emoji"
}

Guidelines for the system prompt:
- Be specific and detailed about the agent's role and capabilities
- Include instructions for tone, format, and approach
- Reference the tools/skills the agent will have access to
- Include error handling instructions
- Make it production-quality""",
        messages=[{
            "role": "user",
            "content": f"""Create an agent for this description: "{description}"

Available skills that can be attached:
{skills_text}

Choose the most relevant skills from the list above. Return ONLY the JSON configuration."""
        }],
        temperature=0.3,
    )

    text = response.content[0].text.strip()
    # Clean up any markdown code blocks
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

    return json.loads(text)


# ── Multi-Agent Orchestration ─────────────────────────────────
def run_multi_agent(
    orchestrator_prompt: str,
    sub_agents: List[Dict[str, Any]],
    user_input: str,
    model_name: str = "claude-sonnet",
) -> Dict[str, Any]:
    """
    Run a multi-agent pipeline where an orchestrator delegates to sub-agents.
    Each sub-agent is a full agent executor config.
    """
    client = _get_client()
    model_id = _resolve_model(model_name)
    start = time.time()

    agent_descriptions = "\n".join(
        f"- Agent '{a['agent_name']}': {a.get('system_prompt', 'General assistant')[:200]}"
        for a in sub_agents
    )

    # Step 1: Orchestrator decides the plan
    plan_response = client.messages.create(
        model=model_id,
        max_tokens=2048,
        system=f"""You are an AI orchestrator that coordinates multiple specialized agents.

{orchestrator_prompt}

Available agents:
{agent_descriptions}

Given the user's request, create a step-by-step plan using these agents.
Return ONLY valid JSON:
{{
    "steps": [
        {{"agent_name": "...", "task": "What to ask this agent"}},
        ...
    ],
    "final_synthesis": "How to combine results"
}}""",
        messages=[{"role": "user", "content": user_input}],
        temperature=0.2,
    )

    plan_text = plan_response.content[0].text.strip()
    if plan_text.startswith("```"):
        plan_text = plan_text.split("\n", 1)[1]
        if plan_text.endswith("```"):
            plan_text = plan_text[:-3]
    plan = json.loads(plan_text)

    # Step 2: Execute each step
    results = []
    agent_map = {a["agent_name"]: a for a in sub_agents}

    for step in plan.get("steps", []):
        agent_config = agent_map.get(step["agent_name"])
        if not agent_config:
            results.append({"agent": step["agent_name"], "error": "Agent not found"})
            continue

        step_result = run_agent(agent_config, step["task"])
        results.append({
            "agent": step["agent_name"],
            "task": step["task"],
            "output": step_result["output"],
            "status": step_result["status"],
        })

    # Step 3: Synthesize results
    synthesis_response = client.messages.create(
        model=model_id,
        max_tokens=4096,
        system="Synthesize the results from multiple agents into a coherent, comprehensive response.",
        messages=[{
            "role": "user",
            "content": f"""Original request: {user_input}

Agent results:
{json.dumps(results, indent=2)}

Synthesis instruction: {plan.get('final_synthesis', 'Combine all results coherently.')}"""
        }],
        temperature=0.3,
    )

    elapsed_ms = int((time.time() - start) * 1000)

    return {
        "output": synthesis_response.content[0].text,
        "plan": plan,
        "agent_results": results,
        "execution_time_ms": elapsed_ms,
        "status": "completed",
    }


# ── Streaming Support ─────────────────────────────────────────
def stream_chat(
    agent_name: str,
    system_prompt: str,
    model_name: str,
    temperature: float,
    max_tokens: int,
    input_text: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
):
    """
    Stream a chat response from Claude. Yields text chunks.
    Use with FastAPI StreamingResponse for SSE.
    """
    client = _get_client()
    model_id = _resolve_model(model_name)

    messages = []
    if conversation_history:
        messages.extend(conversation_history)
    messages.append({"role": "user", "content": input_text})

    system = system_prompt or f"You are {agent_name}, a helpful AI assistant."

    with client.messages.stream(
        model=model_id,
        max_tokens=max_tokens or 4096,
        system=system,
        messages=messages,
        temperature=temperature,
    ) as stream:
        for text in stream.text_stream:
            yield text
