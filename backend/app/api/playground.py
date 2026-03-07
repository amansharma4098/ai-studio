"""Playground API - test prompts directly against Ollama."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from langchain_community.llms import Ollama
from app.utils.config import settings
from app.api.deps import get_current_user

router = APIRouter()


class PlaygroundRequest(BaseModel):
    prompt: str
    system_prompt: str = ""
    model_name: str = "llama3"
    temperature: float = 0.7
    max_tokens: int = 1024


@router.post("/run")
async def playground_run(payload: PlaygroundRequest, current_user=Depends(get_current_user)):
    """Run a prompt directly against Ollama — no agent overhead."""
    llm = Ollama(
        base_url=settings.OLLAMA_BASE_URL,
        model=payload.model_name,
        temperature=payload.temperature,
        num_predict=payload.max_tokens,
    )
    full_prompt = f"{payload.system_prompt}\n\n{payload.prompt}" if payload.system_prompt else payload.prompt
    response = llm.invoke(full_prompt)
    return {"response": response, "model": payload.model_name}
