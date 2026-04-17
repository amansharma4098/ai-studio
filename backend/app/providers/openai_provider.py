"""OpenAI provider — supports GPT-4o, GPT-4.1, o3, etc."""
import os
import json
from typing import Any, Dict, Generator, List

from app.providers.base import ModelProvider, ModelInfo, ProviderResponse, ToolCall


class OpenAIProvider(ModelProvider):
    provider_name = "openai"

    MODEL_MAP = {
        "gpt-4o": "gpt-4o",
        "gpt-4.1": "gpt-4.1",
        "gpt-4.1-mini": "gpt-4.1-mini",
        "gpt-4.1-nano": "gpt-4.1-nano",
        "o3": "o3",
        "o4-mini": "o4-mini",
    }

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY is required for OpenAI provider")
        try:
            import openai
            self._client = openai.OpenAI(api_key=self.api_key)
        except ImportError:
            raise ImportError("Install openai package: pip install openai")

    def _resolve(self, model: str) -> str:
        return self.MODEL_MAP.get(model, model if "gpt" in model or model.startswith("o") else "gpt-4o")

    def chat(self, system_prompt, messages, temperature=0.7, max_tokens=4096) -> str:
        oai_messages = [{"role": "system", "content": system_prompt}] + messages
        resp = self._client.chat.completions.create(
            model=self._resolve("gpt-4o"),
            messages=oai_messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content or ""

    def chat_completion(self, system_prompt, messages, model_name, temperature=0.7, max_tokens=4096) -> str:
        oai_messages = [{"role": "system", "content": system_prompt}] + messages
        resp = self._client.chat.completions.create(
            model=self._resolve(model_name),
            messages=oai_messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content or ""

    def chat_with_tools(self, system_prompt, messages, tools, temperature=0.7, max_tokens=4096, model_name="gpt-4o") -> ProviderResponse:
        oai_messages = [{"role": "system", "content": system_prompt}] + messages
        oai_tools = self.normalize_tool_definitions(tools)

        resp = self._client.chat.completions.create(
            model=self._resolve(model_name),
            messages=oai_messages,
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

    def normalize_tool_definitions(self, tools: List[Dict]) -> List[Dict]:
        """Convert Claude-format tools to OpenAI function calling format."""
        oai_tools = []
        for tool in tools:
            oai_tools.append({
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool.get("description", ""),
                    "parameters": tool.get("input_schema", {
                        "type": "object",
                        "properties": {},
                    }),
                },
            })
        return oai_tools

    def format_tool_results(self, tool_calls_with_results):
        """Format tool results for OpenAI's API."""
        return [{
            "role": "tool",
            "tool_call_id": tc["id"],
            "content": str(tc["result"]),
        } for tc in tool_calls_with_results]

    def get_raw_assistant_content(self, response: ProviderResponse):
        """Get raw assistant message for conversation continuation."""
        return response.raw_response.choices[0].message

    def stream(self, system_prompt, messages, temperature=0.7, max_tokens=4096, model_name="gpt-4o") -> Generator[str, None, None]:
        oai_messages = [{"role": "system", "content": system_prompt}] + messages
        stream = self._client.chat.completions.create(
            model=self._resolve(model_name),
            messages=oai_messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def get_models(self) -> List[ModelInfo]:
        return [
            ModelInfo(id="gpt-4o", name="GPT-4o", provider="openai", context_window=128000, max_output_tokens=16384),
            ModelInfo(id="gpt-4.1", name="GPT-4.1", provider="openai", context_window=1047576, max_output_tokens=32768),
            ModelInfo(id="gpt-4.1-mini", name="GPT-4.1 Mini", provider="openai", context_window=1047576, max_output_tokens=32768),
            ModelInfo(id="gpt-4.1-nano", name="GPT-4.1 Nano", provider="openai", context_window=1047576, max_output_tokens=32768),
            ModelInfo(id="o3", name="o3 (Reasoning)", provider="openai", supports_streaming=False, context_window=200000, max_output_tokens=100000),
            ModelInfo(id="o4-mini", name="o4-mini (Reasoning)", provider="openai", supports_streaming=False, context_window=200000, max_output_tokens=100000),
        ]
