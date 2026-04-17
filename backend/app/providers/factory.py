"""
Provider factory — resolves model names to provider instances.
Model naming: "provider/model-id" (e.g., "openai/gpt-4o", "google/gemini-2.5-pro")
Legacy names like "claude-sonnet" continue to work.
"""
import os
import structlog
from typing import Dict, List, Optional

from app.providers.base import ModelProvider, ModelInfo

logger = structlog.get_logger()

# Cache provider instances (one per provider)
_provider_cache: Dict[str, ModelProvider] = {}

# Legacy model name → (provider, model_id) mapping for backward compatibility
LEGACY_MAP = {
    "claude-opus": ("anthropic", "claude-opus"),
    "claude-sonnet": ("anthropic", "claude-sonnet"),
    "claude-haiku": ("anthropic", "claude-haiku"),
    "llama3": ("groq", "llama-3.3-70b"),
    "mistral": ("groq", "mixtral-8x7b"),
    "gemma": ("groq", "gemma2-9b"),
    "mixtral": ("groq", "mixtral-8x7b"),
}


def parse_model_string(model_string: str) -> tuple[str, str]:
    """Parse 'provider/model' format. Falls back to legacy map or anthropic default."""
    if "/" in model_string:
        provider, model_id = model_string.split("/", 1)
        return provider, model_id

    if model_string in LEGACY_MAP:
        return LEGACY_MAP[model_string]

    # If it looks like a specific provider model
    if "gpt" in model_string or model_string.startswith("o3") or model_string.startswith("o4"):
        return "openai", model_string
    if "gemini" in model_string:
        return "google", model_string
    if "llama" in model_string or "mixtral" in model_string or "deepseek" in model_string:
        return "groq", model_string
    if "claude" in model_string:
        return "anthropic", model_string

    # Default to anthropic
    return "anthropic", model_string


def _create_provider(provider_name: str) -> ModelProvider:
    """Create a provider instance by name."""
    if provider_name == "anthropic":
        from app.providers.anthropic_provider import AnthropicProvider
        return AnthropicProvider()
    elif provider_name == "openai":
        from app.providers.openai_provider import OpenAIProvider
        return OpenAIProvider()
    elif provider_name == "google":
        from app.providers.google_provider import GoogleProvider
        return GoogleProvider()
    elif provider_name == "groq":
        from app.providers.groq_provider import GroqProvider
        return GroqProvider()
    elif provider_name == "ollama":
        from app.providers.ollama_provider import OllamaProvider
        return OllamaProvider()
    else:
        raise ValueError(f"Unknown provider: {provider_name}")


def get_provider(model_string: str) -> tuple[ModelProvider, str]:
    """
    Get provider instance and resolved model name from a model string.
    Returns (provider_instance, model_id).
    Caches provider instances.
    """
    provider_name, model_id = parse_model_string(model_string)

    if provider_name not in _provider_cache:
        try:
            _provider_cache[provider_name] = _create_provider(provider_name)
            logger.info("Provider initialized", provider=provider_name)
        except (ValueError, ImportError) as e:
            logger.error("Failed to initialize provider", provider=provider_name, error=str(e))
            raise

    return _provider_cache[provider_name], model_id


def is_provider_configured(provider_name: str) -> bool:
    """Check if a provider has its required API key configured."""
    checks = {
        "anthropic": lambda: bool(os.getenv("ANTHROPIC_API_KEY") or os.getenv("CLAUDE_API_KEY")),
        "openai": lambda: bool(os.getenv("OPENAI_API_KEY")),
        "google": lambda: bool(os.getenv("GOOGLE_API_KEY")),
        "groq": lambda: bool(os.getenv("GROQ_API_KEY")),
        "ollama": lambda: True,  # Always "configured" — it's local
    }
    check = checks.get(provider_name)
    return check() if check else False


PROVIDER_DISPLAY = {
    "anthropic": {"name": "Anthropic", "icon": "brain"},
    "openai": {"name": "OpenAI", "icon": "sparkles"},
    "google": {"name": "Google", "icon": "search"},
    "groq": {"name": "Groq", "icon": "zap"},
    "ollama": {"name": "Ollama (Local)", "icon": "server"},
}

ALL_PROVIDERS = ["anthropic", "openai", "google", "groq", "ollama"]


def list_available_models() -> List[Dict]:
    """Return all models grouped by provider, with availability status."""
    result = []
    for provider_name in ALL_PROVIDERS:
        configured = is_provider_configured(provider_name)
        display = PROVIDER_DISPLAY.get(provider_name, {"name": provider_name, "icon": "box"})

        models = []
        if configured:
            try:
                provider = _create_provider(provider_name)
                for m in provider.get_models():
                    models.append({
                        "id": f"{provider_name}/{m.id}",
                        "name": m.name,
                        "supports_tools": m.supports_tools,
                        "supports_streaming": m.supports_streaming,
                        "context_window": m.context_window,
                        "max_output_tokens": m.max_output_tokens,
                    })
            except Exception:
                # Provider configured but failed to init — show default models
                pass
        else:
            # Show models even if not configured (greyed out in UI)
            try:
                # Use a temporary approach — import and get static model list
                provider_cls = {
                    "anthropic": lambda: __import__("app.providers.anthropic_provider", fromlist=["AnthropicProvider"]).AnthropicProvider,
                    "openai": lambda: __import__("app.providers.openai_provider", fromlist=["OpenAIProvider"]).OpenAIProvider,
                    "google": lambda: __import__("app.providers.google_provider", fromlist=["GoogleProvider"]).GoogleProvider,
                    "groq": lambda: __import__("app.providers.groq_provider", fromlist=["GroqProvider"]).GroqProvider,
                    "ollama": lambda: __import__("app.providers.ollama_provider", fromlist=["OllamaProvider"]).OllamaProvider,
                }
                # Get models from class method without instantiation — use hardcoded defaults
                if provider_name == "anthropic":
                    models = [
                        {"id": "anthropic/claude-opus-4-6", "name": "Claude Opus", "supports_tools": True, "supports_streaming": True, "context_window": 200000, "max_output_tokens": 4096},
                        {"id": "anthropic/claude-sonnet-4-6", "name": "Claude Sonnet", "supports_tools": True, "supports_streaming": True, "context_window": 200000, "max_output_tokens": 8192},
                        {"id": "anthropic/claude-haiku-4-5-20251001", "name": "Claude Haiku", "supports_tools": True, "supports_streaming": True, "context_window": 200000, "max_output_tokens": 4096},
                    ]
                elif provider_name == "openai":
                    models = [
                        {"id": "openai/gpt-4o", "name": "GPT-4o", "supports_tools": True, "supports_streaming": True, "context_window": 128000, "max_output_tokens": 16384},
                        {"id": "openai/gpt-4.1", "name": "GPT-4.1", "supports_tools": True, "supports_streaming": True, "context_window": 1047576, "max_output_tokens": 32768},
                        {"id": "openai/gpt-4.1-mini", "name": "GPT-4.1 Mini", "supports_tools": True, "supports_streaming": True, "context_window": 1047576, "max_output_tokens": 32768},
                        {"id": "openai/o3", "name": "o3 (Reasoning)", "supports_tools": True, "supports_streaming": False, "context_window": 200000, "max_output_tokens": 100000},
                        {"id": "openai/o4-mini", "name": "o4-mini (Reasoning)", "supports_tools": True, "supports_streaming": False, "context_window": 200000, "max_output_tokens": 100000},
                    ]
                elif provider_name == "google":
                    models = [
                        {"id": "google/gemini-2.5-pro", "name": "Gemini 2.5 Pro", "supports_tools": True, "supports_streaming": True, "context_window": 1048576, "max_output_tokens": 65536},
                        {"id": "google/gemini-2.5-flash", "name": "Gemini 2.5 Flash", "supports_tools": True, "supports_streaming": True, "context_window": 1048576, "max_output_tokens": 65536},
                        {"id": "google/gemini-2.0-flash", "name": "Gemini 2.0 Flash", "supports_tools": True, "supports_streaming": True, "context_window": 1048576, "max_output_tokens": 8192},
                    ]
                elif provider_name == "groq":
                    models = [
                        {"id": "groq/llama-3.3-70b", "name": "Llama 3.3 70B", "supports_tools": True, "supports_streaming": True, "context_window": 128000, "max_output_tokens": 32768},
                        {"id": "groq/llama-3.1-8b", "name": "Llama 3.1 8B", "supports_tools": True, "supports_streaming": True, "context_window": 131072, "max_output_tokens": 8192},
                        {"id": "groq/mixtral-8x7b", "name": "Mixtral 8x7B", "supports_tools": True, "supports_streaming": True, "context_window": 32768, "max_output_tokens": 4096},
                        {"id": "groq/deepseek-r1-70b", "name": "DeepSeek R1 70B", "supports_tools": True, "supports_streaming": True, "context_window": 128000, "max_output_tokens": 16384},
                    ]
                elif provider_name == "ollama":
                    models = [
                        {"id": "ollama/llama3", "name": "Llama 3", "supports_tools": True, "supports_streaming": True, "context_window": 8192, "max_output_tokens": 4096},
                        {"id": "ollama/mistral", "name": "Mistral", "supports_tools": True, "supports_streaming": True, "context_window": 32768, "max_output_tokens": 4096},
                    ]
            except Exception:
                pass

        result.append({
            "id": provider_name,
            "name": display["name"],
            "icon": display["icon"],
            "configured": configured,
            "models": models,
        })

    return result
