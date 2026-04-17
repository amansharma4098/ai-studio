"""Groq provider — fast inference for open-source models (Llama, Mistral, etc.)."""
import os
import json
from typing import Any, Dict, Generator, List

from app.providers.base import ModelProvider, ModelInfo, ProviderResponse, ToolCall


class GroqProvider(ModelProvider):
    provider_name = "groq"

    MODEL_MAP = {
        "llama-3.3-70b": "llama-3.3-70b-versatile",
        "llama-3.1-8b": "llama-3.1-8b-instant",
        "mixtral-8x7b": "mixtral-8x7b-32768",
        "gemma2-9b": "gemma2-9b-it",
        "deepseek-r1-70b": "deepseek-r1-distill-llama-70b",
    }

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY is required for Groq provider")
        try:
            from groq import Groq
            self._client = Groq(api_key=self.api_key)
        except ImportError:
            raise ImportError("Install groq package: pip install groq")

    def _resolve(self, model: str) -> str:
        return self.MODEL_MAP.get(model, model)

    def chat(self, system_prompt, messages, temperature=0.7, max_tokens=4096) -> str:
        return self.chat_completion(system_prompt, messages, "llama-3.3-70b", temperature, max_tokens)

    def chat_completion(self, system_prompt, messages, model_name, temperature=0.7, max_tokens=4096) -> str:
        msgs = [{"role": "system", "content": system_prompt}] + messages
        resp = self._client.chat.completions.create(
            model=self._resolve(model_name),
            messages=msgs,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content or ""

    def chat_with_tools(self, system_prompt, messages, tools, temperature=0.7, max_tokens=4096, model_name="llama-3.3-70b") -> ProviderResponse:
        msgs = [{"role": "system", "content": system_prompt}] + messages
        oai_tools = self._normalize_tools(tools)

        resp = self._client.chat.completions.create(
            model=self._resolve(model_name),
            messages=msgs,
            tools=oai_tools if oai_tools else None,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        choice = resp.choices[0]
        content = choice.message.content or ""
        tool_calls = []

        if choice.message.tool_calls:
            for tc in choice.message.tool_calls:
                try:
                    args = json.loads(tc.function.arguments)
                except json.JSONDecodeError:
                    args = {"raw": tc.function.arguments}
                tool_calls.append(ToolCall(
                    id=tc.id,
                    name=tc.function.name,
                    arguments=args,
                ))

        stop = "tool_use" if choice.finish_reason == "tool_calls" else (
            "end_turn" if choice.finish_reason == "stop" else "max_tokens"
        )

        return ProviderResponse(
            content=content,
            tool_calls=tool_calls,
            stop_reason=stop,
            input_tokens=resp.usage.prompt_tokens if resp.usage else 0,
            output_tokens=resp.usage.completion_tokens if resp.usage else 0,
            raw_response=resp,
        )

    def _normalize_tools(self, tools: List[Dict]) -> List[Dict]:
        oai_tools = []
        for tool in tools:
            oai_tools.append({
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool.get("description", ""),
                    "parameters": tool.get("input_schema", {"type": "object", "properties": {}}),
                },
            })
        return oai_tools

    def format_tool_results(self, tool_calls_with_results):
        return [{
            "role": "tool",
            "tool_call_id": tc["id"],
            "content": str(tc["result"]),
        } for tc in tool_calls_with_results]

    def get_raw_assistant_content(self, response: ProviderResponse):
        return response.raw_response.choices[0].message

    def stream(self, system_prompt, messages, temperature=0.7, max_tokens=4096, model_name="llama-3.3-70b") -> Generator[str, None, None]:
        msgs = [{"role": "system", "content": system_prompt}] + messages
        stream = self._client.chat.completions.create(
            model=self._resolve(model_name),
            messages=msgs,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def get_models(self) -> List[ModelInfo]:
        return [
            ModelInfo(id="llama-3.3-70b", name="Llama 3.3 70B", provider="groq", context_window=128000, max_output_tokens=32768),
            ModelInfo(id="llama-3.1-8b", name="Llama 3.1 8B", provider="groq", context_window=131072, max_output_tokens=8192),
            ModelInfo(id="mixtral-8x7b", name="Mixtral 8x7B", provider="groq", context_window=32768, max_output_tokens=4096),
            ModelInfo(id="gemma2-9b", name="Gemma 2 9B", provider="groq", context_window=8192, max_output_tokens=4096),
            ModelInfo(id="deepseek-r1-70b", name="DeepSeek R1 70B", provider="groq", context_window=128000, max_output_tokens=16384),
        ]
