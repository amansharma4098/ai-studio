"""Playground API - test prompts directly against Claude."""
import os
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict
from app.agents.claude_agent import run_chat, stream_chat, _resolve_model
from app.api.deps import get_current_user

router = APIRouter()

MODEL_MAP = {
    "claude-opus": "claude-opus-4-6",
    "claude-sonnet": "claude-sonnet-4-6",
    "claude-haiku": "claude-haiku-4-5-20251001",
    # Legacy mappings
    "llama3": "claude-sonnet-4-6",
    "mistral": "claude-sonnet-4-6",
    "gemma": "claude-haiku-4-5-20251001",
}


class PlaygroundRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    prompt: str
    system_prompt: str = ""
    model_name: str = "claude-sonnet"
    temperature: float = 0.7
    max_tokens: int = 4096
    stream: bool = False


@router.post("/run")
async def playground_run(payload: PlaygroundRequest, current_user=Depends(get_current_user)):
    """Run a prompt directly against Claude — no agent overhead."""
    model_id = _resolve_model(payload.model_name)

    if payload.stream:
        def event_stream():
            for chunk in stream_chat(
                agent_name="Playground",
                system_prompt=payload.system_prompt,
                model_name=payload.model_name,
                temperature=payload.temperature,
                max_tokens=payload.max_tokens,
                input_text=payload.prompt,
            ):
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(event_stream(), media_type="text/event-stream")

    response = run_chat(
        agent_name="Playground",
        system_prompt=payload.system_prompt or "You are a helpful AI assistant.",
        model_name=payload.model_name,
        temperature=payload.temperature,
        max_tokens=payload.max_tokens,
        input_text=payload.prompt,
    )

    return {"response": response, "model": model_id}
