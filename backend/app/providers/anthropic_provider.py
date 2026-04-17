"""Anthropic Claude provider — wraps the Anthropic SDK."""
import os
from typing import Any, Dict, Generator, List

import anthropic

from app.providers.base import ModelProvider, ModelInfo, ProviderResponse, ToolCall


class AnthropicProvider(ModelProvider):
    provider_name = "anthropic"

    MODEL_MAP = {
        "claude-opus": "claude-opus-4-6",
        "claude-sonnet": "claude-sonnet-4-6",
        "claude-haiku": "claude-haiku-4-5-20251001",
    }

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY") or os.getenv("CLAUDE_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY is required for Anthropic provider")
        self._client = anthropic.Anthropic(api_key=self.api_key)

    def _resolve(self, model: str) -> str:
        return self.MODEL_MAP.get(model, model if "claude" in model else "claude-sonnet-4-6")

    def chat(self, system_prompt, messages, temperature=0.7, max_tokens=4096) -> str:
        resp = self._client.messages.create(
            model=self._resolve(messages[0].get("_model", "claude-sonnet")) if not hasattr(self, "_current_model") else self._resolve(self._current_model),
            max_tokens=max_tokens or 4096,
            system=system_prompt,
            messages=messages,
            temperature=temperature,
        )
        return resp.content[0].text

    def chat_completion(self, system_prompt, messages, model_name, temperature=0.7, max_tokens=4096) -> str:
        resp = self._client.messages.create(
            model=self._resolve(model_name),
            max_tokens=max_tokens or 4096,
            system=system_prompt,
            messages=messages,
            temperature=temperature,
        )
        return resp.content[0].text

    def chat_with_tools(self, system_prompt, messages, tools, temperature=0.7, max_tokens=4096, model_name="claude-sonnet") -> ProviderResponse:
        resp = self._client.messages.create(
            model=self._resolve(model_name),
            max_tokens=max_tokens or 4096,
            system=system_prompt,
            messages=messages,
            tools=tools,
            temperature=temperature,
        )

        content = ""
        tool_calls = []
        for block in resp.content:
            if hasattr(block, "text"):
                content += block.text
            elif block.type == "tool_use":
                tool_calls.append(ToolCall(
                    id=block.id,
                    name=block.name,
                    arguments=block.input,
                ))

        stop = "tool_use" if resp.stop_reason == "tool_use" else (
            "end_turn" if resp.stop_reason == "end_turn" else "max_tokens"
        )

        return ProviderResponse(
            content=content,
            tool_calls=tool_calls,
            stop_reason=stop,
            input_tokens=resp.usage.input_tokens,
            output_tokens=resp.usage.output_tokens,
            raw_response=resp,
        )

    def format_tool_results(self, tool_calls_with_results):
        """Format tool results for Anthropic's API (tool_result blocks)."""
        return [{
            "type": "tool_result",
            "tool_use_id": tc["id"],
            "content": str(tc["result"]),
        } for tc in tool_calls_with_results]

    def get_raw_assistant_content(self, response: ProviderResponse):
        """Get raw assistant content blocks for conversation continuation."""
        return response.raw_response.content

    def stream(self, system_prompt, messages, temperature=0.7, max_tokens=4096, model_name="claude-sonnet") -> Generator[str, None, None]:
        with self._client.messages.stream(
            model=self._resolve(model_name),
            max_tokens=max_tokens or 4096,
            system=system_prompt,
            messages=messages,
            temperature=temperature,
        ) as s:
            for text in s.text_stream:
                yield text

    def get_models(self) -> List[ModelInfo]:
        return [
            ModelInfo(id="claude-opus-4-6", name="Claude Opus", provider="anthropic", context_window=200000, max_output_tokens=4096),
            ModelInfo(id="claude-sonnet-4-6", name="Claude Sonnet", provider="anthropic", context_window=200000, max_output_tokens=8192),
            ModelInfo(id="claude-haiku-4-5-20251001", name="Claude Haiku", provider="anthropic", context_window=200000, max_output_tokens=4096),
        ]
