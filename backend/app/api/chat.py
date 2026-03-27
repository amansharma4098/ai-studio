"""
Chat API — multi-thread conversation memory for agents.
POST   /api/agents/{agent_id}/threads       — create thread
GET    /api/agents/{agent_id}/threads       — list threads
GET    /api/threads/{thread_id}/messages    — get messages
POST   /api/threads/{thread_id}/chat        — send message (with full history)
DELETE /api/threads/{thread_id}             — delete thread
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import Agent, ChatThread, ChatMessage
from app.agents.claude_agent import run_chat
from app.api.deps import get_current_user

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────
class ThreadResponse(BaseModel):
    id: str
    agent_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    last_message: Optional[str] = None

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: str
    thread_id: str
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    input_text: str


class ChatResponse(BaseModel):
    output_text: str
    thread_id: str
    message_id: str


# ── Helpers ──────────────────────────────────────────────────────
async def _get_agent_or_404(db: AsyncSession, agent_id: str, user_id: str) -> Agent:
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.user_id == user_id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


async def _get_thread_or_404(db: AsyncSession, thread_id: str, user_id: str) -> ChatThread:
    result = await db.execute(
        select(ChatThread).where(ChatThread.id == thread_id, ChatThread.user_id == user_id)
    )
    thread = result.scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    return thread


# ── Create Thread ────────────────────────────────────────────────
@router.post("/agents/{agent_id}/threads", response_model=ThreadResponse)
async def create_thread(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    await _get_agent_or_404(db, agent_id, current_user.id)
    thread = ChatThread(
        agent_id=agent_id,
        user_id=current_user.id,
        title="New Chat",
    )
    db.add(thread)
    await db.commit()
    await db.refresh(thread)
    return thread


# ── List Threads ─────────────────────────────────────────────────
@router.get("/agents/{agent_id}/threads", response_model=List[ThreadResponse])
async def list_threads(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    await _get_agent_or_404(db, agent_id, current_user.id)
    result = await db.execute(
        select(ChatThread)
        .where(ChatThread.agent_id == agent_id, ChatThread.user_id == current_user.id)
        .order_by(desc(ChatThread.updated_at))
    )
    threads = result.scalars().all()

    response = []
    for t in threads:
        # Get last message preview
        last_msg_result = await db.execute(
            select(ChatMessage.content)
            .where(ChatMessage.thread_id == t.id)
            .order_by(desc(ChatMessage.created_at))
            .limit(1)
        )
        last_msg = last_msg_result.scalar_one_or_none()
        response.append(ThreadResponse(
            id=t.id,
            agent_id=t.agent_id,
            title=t.title,
            created_at=t.created_at,
            updated_at=t.updated_at,
            last_message=last_msg[:100] if last_msg else None,
        ))
    return response


# ── Get Messages ─────────────────────────────────────────────────
@router.get("/threads/{thread_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    thread_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    await _get_thread_or_404(db, thread_id, current_user.id)
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.thread_id == thread_id)
        .order_by(ChatMessage.created_at)
    )
    return result.scalars().all()


# ── Chat (send message with full history) ────────────────────────
@router.post("/threads/{thread_id}/chat", response_model=ChatResponse)
async def chat(
    thread_id: str,
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    thread = await _get_thread_or_404(db, thread_id, current_user.id)

    # Load agent
    agent_result = await db.execute(
        select(Agent).where(Agent.id == thread.agent_id)
    )
    agent = agent_result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Load previous messages for conversation history
    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.thread_id == thread_id)
        .order_by(ChatMessage.created_at)
    )
    previous_messages = history_result.scalars().all()
    conversation_history = [
        {"role": msg.role, "content": msg.content}
        for msg in previous_messages
    ]

    # Call Claude with full history
    output = run_chat(
        agent_name=agent.name,
        system_prompt=agent.system_prompt,
        model_name=agent.model_name,
        temperature=agent.temperature,
        max_tokens=agent.max_tokens,
        input_text=payload.input_text,
        conversation_history=conversation_history,
    )

    # Save user message
    user_msg = ChatMessage(
        thread_id=thread_id,
        role="user",
        content=payload.input_text,
    )
    db.add(user_msg)

    # Save assistant message
    assistant_msg = ChatMessage(
        thread_id=thread_id,
        role="assistant",
        content=output,
    )
    db.add(assistant_msg)

    # Auto-title from first user message
    if thread.title == "New Chat":
        thread.title = payload.input_text[:40]

    # Update thread timestamp
    thread.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(assistant_msg)

    return ChatResponse(
        output_text=output,
        thread_id=thread_id,
        message_id=assistant_msg.id,
    )


# ── Delete Thread ────────────────────────────────────────────────
@router.delete("/threads/{thread_id}")
async def delete_thread(
    thread_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    thread = await _get_thread_or_404(db, thread_id, current_user.id)
    await db.delete(thread)
    await db.commit()
    return {"status": "deleted"}
