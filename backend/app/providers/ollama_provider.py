"""Ollama provider — local model inference via Ollama HTTP API."""
import os
import json
from typing import Any, Dict, Generator, List

import httpx

from app.providers.base import ModelProvider, ModelInfo, ProviderResponse, ToolCall


class OllamaProvider(ModelProvider):
    provider_name = "ollama"

    def __init__(self, base_url: str | None = None):
        self.base_url = (base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")).rstrip("/")

    def _url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    def chat(self, system_prompt, messages, temperature=0.7, max_tokens=4096) -> str:
        return self.chat_completion(system_prompt, messages, "llama3", temperature, max_tokens)

    def chat_completion(self, system_prompt, messages, model_name, temperature=0.7, max_tokens=4096) -> str:
        msgs = [{"role": "system", "content": system_prompt}] + messages
        resp = httpx.post(
            self._url("/api/chat"),
            json={"model": model_name, "messages": msgs, "stream": False,
                   "options": {"temperature": temperature, "num_predict": max_tokens}},
            timeout=120,
        )
        resp.raise_for_status()
        return resp.json().get("message", {}).get("content", "")

    def chat_with_tools(self, system_prompt, messages, tools, temperature=0.7, max_tokens=4096, model_name="llama3") -> ProviderResponse:
        # Ollama supports tool calling for compatible models
        msgs = [{"role": "system", "content": system_prompt}] + messages

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

        payload = {
            "model": model_name,
            "messages": msgs,
            "stream": False,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        }
        if oai_tools:
            payload["tools"] = oai_tools

        resp = httpx.post(self._url("/api/chat"), json=payload, timeout=120)
        resp.raise_for_status()
        data = resp.json()

        content = data.get("message", {}).get("content", "")
        tool_calls = []

        for tc in data.get("message", {}).get("tool_calls", []):
            fn = tc.get("function", {})
            tool_calls.append(ToolCall(
                id=f"ollama-{fn.get('name', 'unknown')}-{id(tc)}",
                name=fn.get("name", ""),
                arguments=fn.get("arguments", {}),
            ))

        return ProviderResponse(
            content=content,
            tool_calls=tool_calls,
            stop_reason="tool_use" if tool_calls else "end_turn",
            raw_response=data,
        )

    def format_tool_results(self, tool_calls_with_results):
        return [{
            "role": "tool",
            "content": str(tc["result"]),
        } for tc in tool_calls_with_results]

    def get_raw_assistant_content(self, response: ProviderResponse):
        return response.raw_response.get("message", {})

    def stream(self, system_prompt, messages, temperature=0.7, max_tokens=4096, model_name="llama3") -> Generator[str, None, None]:
        msgs = [{"role": "system", "content": system_prompt}] + messages
        with httpx.stream(
            "POST",
            self._url("/api/chat"),
            json={"model": model_name, "messages": msgs, "stream": True,
                   "options": {"temperature": temperature, "num_predict": max_tokens}},
            timeout=120,
        ) as resp:
            for line in resp.iter_lines():
                if line:
                    try:
                        data = json.loads(line)
                        text = data.get("message", {}).get("content", "")
                        if text:
                            yield text
                    except json.JSONDecodeError:
                        continue

    def supports_native_tools(self) -> bool:
        return True  # Modern Ollama supports tools for compatible models

    def get_models(self) -> List[ModelInfo]:
        """Try to fetch models from Ollama API, fall back to common models."""
        try:
            resp = httpx.get(self._url("/api/tags"), timeout=5)
            resp.raise_for_status()
            models = []
            for m in resp.json().get("models", []):
                name = m.get("name", "unknown")
                models.append(ModelInfo(
                    id=name,
                    name=name.split(":")[0].title(),
                    provider="ollama",
                    supports_tools=True,
                    context_window=m.get("details", {}).get("parameter_size", 8192),
                ))
            return models if models else self._default_models()
        except Exception:
            return self._default_models()

    def _default_models(self):
        return [
            ModelInfo(id="llama3", name="Llama 3", provider="ollama", context_window=8192),
            ModelInfo(id="mistral", name="Mistral", provider="ollama", context_window=32768),
            ModelInfo(id="codellama", name="Code Llama", provider="ollama", context_window=16384),
            ModelInfo(id="phi3", name="Phi-3", provider="ollama", context_window=128000),
        ]
