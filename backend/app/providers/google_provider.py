"""Google Gemini provider — supports Gemini 2.5 Pro, Flash, etc."""
import os
from typing import Any, Dict, Generator, List

from app.providers.base import ModelProvider, ModelInfo, ProviderResponse, ToolCall


class GoogleProvider(ModelProvider):
    provider_name = "google"

    MODEL_MAP = {
        "gemini-2.5-pro": "gemini-2.5-pro-preview-05-06",
        "gemini-2.5-flash": "gemini-2.5-flash-preview-04-17",
        "gemini-2.0-flash": "gemini-2.0-flash",
    }

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY is required for Google provider")
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            self._genai = genai
        except ImportError:
            raise ImportError("Install google-generativeai: pip install google-generativeai")

    def _resolve(self, model: str) -> str:
        return self.MODEL_MAP.get(model, model if "gemini" in model else "gemini-2.0-flash")

    def _get_model(self, model_name: str):
        return self._genai.GenerativeModel(self._resolve(model_name))

    def chat(self, system_prompt, messages, temperature=0.7, max_tokens=4096) -> str:
        return self.chat_completion(system_prompt, messages, "gemini-2.0-flash", temperature, max_tokens)

    def chat_completion(self, system_prompt, messages, model_name, temperature=0.7, max_tokens=4096) -> str:
        model = self._genai.GenerativeModel(
            self._resolve(model_name),
            system_instruction=system_prompt,
        )
        # Convert messages to Gemini format
        gemini_messages = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            gemini_messages.append({"role": role, "parts": [msg["content"]]})

        resp = model.generate_content(
            gemini_messages,
            generation_config=self._genai.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
        )
        return resp.text

    def chat_with_tools(self, system_prompt, messages, tools, temperature=0.7, max_tokens=4096, model_name="gemini-2.0-flash") -> ProviderResponse:
        # Build function declarations for Gemini
        func_declarations = []
        for tool in tools:
            func_declarations.append(self._genai.protos.FunctionDeclaration(
                name=tool["name"],
                description=tool.get("description", ""),
                parameters=self._convert_schema(tool.get("input_schema", {})),
            ))

        gemini_tools = [self._genai.protos.Tool(function_declarations=func_declarations)] if func_declarations else None

        model = self._genai.GenerativeModel(
            self._resolve(model_name),
            system_instruction=system_prompt,
            tools=gemini_tools,
        )

        gemini_messages = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            gemini_messages.append({"role": role, "parts": [msg["content"]]})

        resp = model.generate_content(
            gemini_messages,
            generation_config=self._genai.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
        )

        content = ""
        tool_calls = []
        for part in resp.candidates[0].content.parts:
            if hasattr(part, "text") and part.text:
                content += part.text
            elif hasattr(part, "function_call") and part.function_call:
                fc = part.function_call
                tool_calls.append(ToolCall(
                    id=f"gemini-{fc.name}-{id(fc)}",
                    name=fc.name,
                    arguments=dict(fc.args) if fc.args else {},
                ))

        stop = "tool_use" if tool_calls else "end_turn"

        return ProviderResponse(
            content=content,
            tool_calls=tool_calls,
            stop_reason=stop,
            input_tokens=getattr(resp, 'usage_metadata', None) and resp.usage_metadata.prompt_token_count or 0,
            output_tokens=getattr(resp, 'usage_metadata', None) and resp.usage_metadata.candidates_token_count or 0,
            raw_response=resp,
        )

    def _convert_schema(self, schema: Dict) -> Any:
        """Convert JSON schema to Gemini Schema proto (simplified)."""
        if not schema or not schema.get("properties"):
            return None
        return self._genai.protos.Schema(
            type=self._genai.protos.Type.OBJECT,
            properties={
                k: self._genai.protos.Schema(type=self._genai.protos.Type.STRING, description=v.get("description", ""))
                for k, v in schema.get("properties", {}).items()
            },
        )

    def format_tool_results(self, tool_calls_with_results):
        """Format tool results for Gemini's API."""
        parts = []
        for tc in tool_calls_with_results:
            parts.append(self._genai.protos.Part(
                function_response=self._genai.protos.FunctionResponse(
                    name=tc["name"],
                    response={"result": str(tc["result"])},
                )
            ))
        return parts

    def get_raw_assistant_content(self, response: ProviderResponse):
        """Get raw assistant content for Gemini."""
        return response.raw_response.candidates[0].content

    def stream(self, system_prompt, messages, temperature=0.7, max_tokens=4096, model_name="gemini-2.0-flash") -> Generator[str, None, None]:
        model = self._genai.GenerativeModel(
            self._resolve(model_name),
            system_instruction=system_prompt,
        )
        gemini_messages = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            gemini_messages.append({"role": role, "parts": [msg["content"]]})

        resp = model.generate_content(
            gemini_messages,
            generation_config=self._genai.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
            stream=True,
        )
        for chunk in resp:
            if chunk.text:
                yield chunk.text

    def get_models(self) -> List[ModelInfo]:
        return [
            ModelInfo(id="gemini-2.5-pro", name="Gemini 2.5 Pro", provider="google", context_window=1048576, max_output_tokens=65536),
            ModelInfo(id="gemini-2.5-flash", name="Gemini 2.5 Flash", provider="google", context_window=1048576, max_output_tokens=65536),
            ModelInfo(id="gemini-2.0-flash", name="Gemini 2.0 Flash", provider="google", context_window=1048576, max_output_tokens=8192),
        ]
