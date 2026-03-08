"""Playground API - test prompts directly against Groq."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from app.utils.config import settings
from app.api.deps import get_current_user

router = APIRouter()


class PlaygroundRequest(BaseModel):
    prompt: str
    system_prompt: str = ""
    model_name: str = "llama3-8b-8192"
    temperature: float = 0.7
    max_tokens: int = 1024


@router.post("/run")
async def playground_run(payload: PlaygroundRequest, current_user=Depends(get_current_user)):
    """Run a prompt directly against Groq — no agent overhead."""
    llm = ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model=payload.model_name or settings.GROQ_MODEL,
        temperature=payload.temperature,
        max_tokens=payload.max_tokens,
    )
    messages = []
    if payload.system_prompt:
        messages.append(SystemMessage(content=payload.system_prompt))
    messages.append(HumanMessage(content=payload.prompt))
    response = llm.invoke(messages)
    return {"response": response.content, "model": payload.model_name}
