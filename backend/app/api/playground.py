"""Playground API — test prompts directly against any supported model."""
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict
from app.agents.claude_agent import run_chat, stream_chat
from app.providers.factory import list_available_models
from app.api.deps import get_current_user

router = APIRouter()


class PlaygroundRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    prompt: str
    system_prompt: str = ""
    model_name: str = "anthropic/claude-sonnet"
    temperature: float = 0.7
    max_tokens: int = 4096
    stream: bool = False


@router.get("/models")
async def get_available_models(current_user=Depends(get_current_user)):
    """Return all available models grouped by provider."""
    return {"providers": list_available_models()}


@router.post("/run")
async def playground_run(payload: PlaygroundRequest, current_user=Depends(get_current_user)):
    """Run a prompt directly against any model — no agent overhead."""
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

    return {"response": response, "model": payload.model_name}
