"""Abstract base class for LLM providers."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, Generator, List, Optional


@dataclass
class ToolCall:
    """Normalized tool call from any provider."""
    id: str
    name: str
    arguments: Dict[str, Any]


@dataclass
class ProviderResponse:
    """Normalized response from any provider."""
    content: str = ""
    tool_calls: List[ToolCall] = field(default_factory=list)
    stop_reason: str = "end_turn"  # end_turn | tool_use | max_tokens
    input_tokens: int = 0
    output_tokens: int = 0
    raw_response: Any = None  # provider-specific response object


@dataclass
class ModelInfo:
    """Model metadata."""
    id: str
    name: str
    provider: str
    supports_tools: bool = True
    supports_streaming: bool = True
    context_window: int = 128000
    max_output_tokens: int = 4096


class ModelProvider(ABC):
    """Abstract interface for LLM providers."""

    provider_name: str = "base"

    @abstractmethod
    def chat(
        self,
        system_prompt: str,
        messages: List[Dict[str, Any]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        """Simple chat completion. Returns text string."""
        ...

    @abstractmethod
    def chat_with_tools(
        self,
        system_prompt: str,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> ProviderResponse:
        """Chat with tool/function calling support. Returns normalized response."""
        ...

    @abstractmethod
    def stream(
        self,
        system_prompt: str,
        messages: List[Dict[str, Any]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> Generator[str, None, None]:
        """Stream chat response. Yields text chunks."""
        ...

    def supports_native_tools(self) -> bool:
        """Whether this provider supports native function/tool calling."""
        return True

    @abstractmethod
    def get_models(self) -> List[ModelInfo]:
        """Return list of available models for this provider."""
        ...

    def normalize_tool_definitions(self, tools: List[Dict]) -> List[Dict]:
        """Convert internal tool format to provider-specific format.
        Default implementation returns tools as-is (works for Claude format)."""
        return tools
