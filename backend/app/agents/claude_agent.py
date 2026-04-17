"""
Agent Engine — Multi-model support via provider abstraction.
Supports Anthropic Claude, OpenAI, Google Gemini, Groq, and Ollama.
Uses native tool_use/function calling per provider.
"""
import os
import time
import json
import structlog
from typing import Any, Dict, List, Optional

from app.skills.registry import skill_registry
from app.providers.factory import get_provider, parse_model_string

logger = structlog.get_logger()

# Legacy model map kept for backward compatibility
MODEL_MAP = {
    "claude-opus": "claude-opus-4-6",
    "claude-sonnet": "claude-sonnet-4-6",
    "claude-haiku": "claude-haiku-4-5-20251001",
    "llama3": "claude-sonnet-4-6",
    "mistral": "claude-sonnet-4-6",
    "gemma": "claude-haiku-4-5-20251001",
}

DEFAULT_MODEL = "claude-sonnet-4-6"


def _resolve_model(model_name: str) -> str:
    """Map friendly model names to model IDs (legacy compatibility)."""
    return MODEL_MAP.get(model_name, model_name if "claude" in model_name else DEFAULT_MODEL)


# ── Build Tools from skill bindings ─────────────────────
def _build_tools(skill_bindings: List[Dict], credentials_map: Dict) -> tuple:
    """
    Convert skill bindings into tool definitions (Claude format — providers normalize as needed).
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

        logger.info("Tool registered", skill=skill_name, has_credential=bool(credential_data))

    return tools, tool_map


# ── Simple Chat Completion (multi-model) ─────────────────
def run_chat(
    agent_name: str,
    system_prompt: str,
    model_name: str,
    temperature: float,
    max_tokens: int,
    input_text: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
) -> str:
    """Run a simple chat completion against any supported model."""
    provider, model_id = get_provider(model_name)

    messages = []
    if conversation_history:
        messages.extend(conversation_history)
    messages.append({"role": "user", "content": input_text})

    system = system_prompt or f"You are {agent_name}, a helpful AI assistant."

    return provider.chat_completion(
        system_prompt=system,
        messages=messages,
        model_name=model_id,
        temperature=temperature,
        max_tokens=max_tokens or 4096,
    )


# ── Build Agent Executor ──────────────────────────────────
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
    """Build an agent config dict for execution."""
    tools, tool_map = _build_tools(skill_bindings, credentials_map)

    return {
        "agent_name": agent_name,
        "system_prompt": system_prompt,
        "model_name": model_name,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "tools": tools,
        "tool_map": tool_map,
    }


# ── Execute Agent (multi-model) ────────────────────────────
def run_agent(
    executor_config: Dict[str, Any],
    user_input: str,
) -> Dict[str, Any]:
    """Execute an agent with native tool calling via any provider."""
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
            output, tokens = _run_tool_loop(
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
            )
            total_input_tokens = tokens.get("input", 0)
            total_output_tokens = tokens.get("output", 0)

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
    max_iterations: int = 15,
) -> tuple[str, Dict[str, int]]:
    """
    Universal tool loop — works with any provider via the abstraction layer.
    """
    provider, model_id = get_provider(model_name)
    provider_name = provider.provider_name
    token_counter = {"input": 0, "output": 0}

    system = f"""You are {agent_name}, a powerful AI agent with access to specialized tools.

{system_prompt}

Important:
- Use tools when they are relevant to answer the user's question
- Never fabricate data — always use tools to fetch real information
- Be thorough but concise in your final response
- If a tool fails, explain what happened and try an alternative approach"""

    # For Anthropic, messages are structured differently than OpenAI-style
    if provider_name == "anthropic":
        return _run_anthropic_tool_loop(
            provider, model_id, system, user_input, tools, tool_map,
            trace, skills_called, token_counter, temperature, max_tokens, max_iterations,
        )
    else:
        return _run_openai_style_tool_loop(
            provider, model_id, system, user_input, tools, tool_map,
            trace, skills_called, token_counter, temperature, max_tokens, max_iterations,
        )


def _run_anthropic_tool_loop(provider, model_id, system, user_input, tools, tool_map,
                              trace, skills_called, token_counter, temperature, max_tokens, max_iterations):
    """Tool loop for Anthropic Claude (uses content blocks)."""
    messages = [{"role": "user", "content": user_input}]

    for iteration in range(max_iterations):
        response = provider.chat_with_tools(
            system_prompt=system,
            messages=messages,
            tools=tools,
            temperature=temperature,
            max_tokens=max_tokens or 4096,
            model_name=model_id,
        )

        token_counter["input"] += response.input_tokens
        token_counter["output"] += response.output_tokens

        if response.stop_reason == "tool_use" and response.tool_calls:
            tool_results = []
            for tc in response.tool_calls:
                result_text = _execute_tool(tool_map.get(tc.name), tc.arguments)
                skills_called.append(tc.name)
                trace.append({
                    "step": tc.name,
                    "input": tc.arguments,
                    "output": str(result_text)[:500],
                    "status": "ok" if not str(result_text).startswith("Error") else "error",
                    "iteration": iteration,
                })
                tool_results.append({"id": tc.id, "result": result_text})

            # Continue conversation with tool results
            raw_content = provider.get_raw_assistant_content(response)
            messages.append({"role": "assistant", "content": raw_content})
            messages.append({"role": "user", "content": provider.format_tool_results(tool_results)})

        elif response.stop_reason == "end_turn":
            return response.content or "Task completed.", token_counter
        else:
            return response.content or "Response truncated.", token_counter

    return "Maximum tool iterations reached. Please try a more specific request.", token_counter


def _run_openai_style_tool_loop(provider, model_id, system, user_input, tools, tool_map,
                                 trace, skills_called, token_counter, temperature, max_tokens, max_iterations):
    """Tool loop for OpenAI-style APIs (OpenAI, Groq, Ollama)."""
    messages = [{"role": "user", "content": user_input}]

    for iteration in range(max_iterations):
        response = provider.chat_with_tools(
            system_prompt=system,
            messages=messages,
            tools=tools,
            temperature=temperature,
            max_tokens=max_tokens or 4096,
            model_name=model_id,
        )

        token_counter["input"] += response.input_tokens
        token_counter["output"] += response.output_tokens

        if response.stop_reason == "tool_use" and response.tool_calls:
            # Add assistant message with tool calls
            raw_content = provider.get_raw_assistant_content(response)
            if hasattr(raw_content, "model_dump"):
                messages.append(raw_content.model_dump())
            elif isinstance(raw_content, dict):
                messages.append({"role": "assistant", **raw_content})
            else:
                messages.append({"role": "assistant", "content": response.content or "", "tool_calls": [
                    {"id": tc.id, "type": "function", "function": {"name": tc.name, "arguments": json.dumps(tc.arguments)}}
                    for tc in response.tool_calls
                ]})

            # Execute tools and add results
            for tc in response.tool_calls:
                result_text = _execute_tool(tool_map.get(tc.name), tc.arguments)
                skills_called.append(tc.name)
                trace.append({
                    "step": tc.name,
                    "input": tc.arguments,
                    "output": str(result_text)[:500],
                    "status": "ok" if not str(result_text).startswith("Error") else "error",
                    "iteration": iteration,
                })
                tool_result_msgs = provider.format_tool_results([{
                    "id": tc.id, "name": tc.name, "result": result_text,
                }])
                messages.extend(tool_result_msgs)

        elif response.stop_reason == "end_turn":
            return response.content or "Task completed.", token_counter
        else:
            return response.content or "Response truncated.", token_counter

    return "Maximum tool iterations reached. Please try a more specific request.", token_counter


def _execute_tool(tool_info: Dict, tool_input: Any) -> str:
    """Execute a skill tool with credential injection."""
    import asyncio
    import inspect

    if not tool_info:
        return "Error: Unknown tool"

    try:
        params = tool_input if isinstance(tool_input, dict) else {}

        if "params" in params and isinstance(params["params"], dict):
            params = params["params"]

        if tool_info.get("credential"):
            params["_credential"] = tool_info["credential"]

        result = tool_info["fn"](params)

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


# ── Smart Agent Builder ───────────────────────────────────
def generate_agent_from_description(description: str, available_skills: List[Dict]) -> Dict[str, Any]:
    """Use Claude to generate a complete agent config from a natural language description."""
    provider, model_id = get_provider("anthropic/claude-sonnet")

    skills_text = "\n".join(
        f"- {s['name']}: {s['description']} (category: {s.get('category', 'general')})"
        for s in available_skills
    )

    response = provider.chat_completion(
        system_prompt="""You are an AI agent architect. Given a user's description of what they want an agent to do,
generate a complete agent configuration. You must return ONLY valid JSON with no markdown or extra text.

Return this exact JSON structure:
{
    "name": "Short agent name",
    "description": "What this agent does",
    "system_prompt": "Detailed system prompt that makes the agent excellent at its job",
    "model_name": "anthropic/claude-sonnet",
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
- Make it production-quality

For model_name, use the format "provider/model-id":
- "anthropic/claude-sonnet" for balanced tasks
- "anthropic/claude-opus" for complex reasoning
- "openai/gpt-4o" for general tasks
- "google/gemini-2.5-pro" for large context tasks
- "groq/llama-3.3-70b" for fast open-source inference""",
        messages=[{
            "role": "user",
            "content": f"""Create an agent for this description: "{description}"

Available skills that can be attached:
{skills_text}

Choose the most relevant skills from the list above. Return ONLY the JSON configuration."""
        }],
        model_name=model_id,
        temperature=0.3,
    )

    text = response.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

    return json.loads(text)


# ── Multi-Agent Orchestration ─────────────────────────────
def run_multi_agent(
    orchestrator_prompt: str,
    sub_agents: List[Dict[str, Any]],
    user_input: str,
    model_name: str = "anthropic/claude-sonnet",
) -> Dict[str, Any]:
    """Run a multi-agent pipeline where an orchestrator delegates to sub-agents."""
    provider, model_id = get_provider(model_name)
    start = time.time()

    agent_descriptions = "\n".join(
        f"- Agent '{a['agent_name']}': {a.get('system_prompt', 'General assistant')[:200]}"
        for a in sub_agents
    )

    plan_text = provider.chat_completion(
        system_prompt=f"""You are an AI orchestrator that coordinates multiple specialized agents.

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
        model_name=model_id,
        temperature=0.2,
    )

    if plan_text.startswith("```"):
        plan_text = plan_text.split("\n", 1)[1]
        if plan_text.endswith("```"):
            plan_text = plan_text[:-3]
    plan = json.loads(plan_text)

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

    synthesis = provider.chat_completion(
        system_prompt="Synthesize the results from multiple agents into a coherent, comprehensive response.",
        messages=[{
            "role": "user",
            "content": f"""Original request: {user_input}

Agent results:
{json.dumps(results, indent=2)}

Synthesis instruction: {plan.get('final_synthesis', 'Combine all results coherently.')}"""
        }],
        model_name=model_id,
        temperature=0.3,
    )

    elapsed_ms = int((time.time() - start) * 1000)

    return {
        "output": synthesis,
        "plan": plan,
        "agent_results": results,
        "execution_time_ms": elapsed_ms,
        "status": "completed",
    }


# ── Streaming Support (multi-model) ─────────────────────
def stream_chat(
    agent_name: str,
    system_prompt: str,
    model_name: str,
    temperature: float,
    max_tokens: int,
    input_text: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
):
    """Stream a chat response from any provider. Yields text chunks."""
    provider, model_id = get_provider(model_name)

    messages = []
    if conversation_history:
        messages.extend(conversation_history)
    messages.append({"role": "user", "content": input_text})

    system = system_prompt or f"You are {agent_name}, a helpful AI assistant."

    yield from provider.stream(
        system_prompt=system,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens or 4096,
        model_name=model_id,
    )
