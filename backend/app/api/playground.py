"""Playground API - test prompts directly against Groq."""
import os
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from groq import Groq
from app.api.deps import get_current_user

router = APIRouter()

MODEL_MAP = {
    "llama3": "llama-3.3-70b-versatile",
    "mistral": "mistral-saba-24b",
    "gemma": "gemma2-9b-it",
}


class PlaygroundRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    prompt: str
    system_prompt: str = ""
    model_name: str = "llama3"
    temperature: float = 0.7
    max_tokens: int = 1024


@router.post("/run")
async def playground_run(payload: PlaygroundRequest, current_user=Depends(get_current_user)):
    """Run a prompt directly against Groq — no agent overhead."""
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    model_id = MODEL_MAP.get(payload.model_name, payload.model_name if payload.model_name in MODEL_MAP.values() else "llama-3.3-70b-versatile")

    messages = []
    if payload.system_prompt:
        messages.append({"role": "system", "content": payload.system_prompt})
    messages.append({"role": "user", "content": payload.prompt})

    response = client.chat.completions.create(
        model=model_id,
        messages=messages,
        temperature=payload.temperature,
        max_tokens=payload.max_tokens,
    )

    return {"response": response.choices[0].message.content, "model": model_id}
