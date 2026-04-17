"""
Public Agent API — unauthenticated endpoints for deployed agents.
These are the endpoints that end-users interact with via share links, widgets, and API.

GET  /api/public/{slug}/info        — get agent info (no secrets)
POST /api/public/{slug}/chat        — send message
POST /api/v1/agents/{token}/chat    — API endpoint for programmatic access
"""
import time
import secrets
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.db.models import (
    Agent, AgentDeployment, AgentSkillBinding, Credential,
    DeploymentConversation, DeploymentMessage,
)
from app.agents.claude_agent import run_chat, build_agent_executor, run_agent
from app.utils.security import decrypt_credentials

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────
class PublicChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class PublicChatResponse(BaseModel):
    response: str
    session_id: str
    conversation_id: str


# ── Rate Limiting (simple in-memory) ─────────────────────────
_rate_store: dict = {}  # {deployment_id: {minute_key: count}}


def _check_rate_limit(deployment_id: str, rpm: int) -> bool:
    minute_key = int(time.time() / 60)
    key = f"{deployment_id}:{minute_key}"
    count = _rate_store.get(key, 0)
    if count >= rpm:
        return False
    _rate_store[key] = count + 1
    # Cleanup old entries
    cutoff = f"{deployment_id}:{minute_key - 2}"
    _rate_store.pop(cutoff, None)
    return True


# ── Helpers ──────────────────────────────────────────────────
async def _get_deployment_by_slug(slug: str) -> tuple:
    """Get deployment and agent by slug. Returns (deployment, agent, db_session)."""
    db = AsyncSessionLocal()
    try:
        result = await db.execute(
            select(AgentDeployment).where(
                AgentDeployment.slug == slug,
                AgentDeployment.is_active == True,
            )
        )
        dep = result.scalar_one_or_none()
        if not dep:
            await db.close()
            raise HTTPException(status_code=404, detail="Agent not found")

        agent_result = await db.execute(
            select(Agent).where(Agent.id == dep.agent_id, Agent.is_active == True)
        )
        agent = agent_result.scalar_one_or_none()
        if not agent:
            await db.close()
            raise HTTPException(status_code=404, detail="Agent not found")

        return dep, agent, db
    except HTTPException:
        raise
    except Exception:
        await db.close()
        raise


async def _get_deployment_by_token(token: str) -> tuple:
    """Get deployment and agent by deploy token."""
    db = AsyncSessionLocal()
    try:
        result = await db.execute(
            select(AgentDeployment).where(
                AgentDeployment.deploy_token == token,
                AgentDeployment.is_active == True,
            )
        )
        dep = result.scalar_one_or_none()
        if not dep:
            await db.close()
            raise HTTPException(status_code=404, detail="Agent not found")

        agent_result = await db.execute(
            select(Agent).where(Agent.id == dep.agent_id, Agent.is_active == True)
        )
        agent = agent_result.scalar_one_or_none()
        if not agent:
            await db.close()
            raise HTTPException(status_code=404, detail="Agent not found")

        return dep, agent, db
    except HTTPException:
        raise
    except Exception:
        await db.close()
        raise


async def _get_or_create_conversation(db, deployment_id: str, session_id: str, request: Request = None):
    """Get existing conversation or create new one."""
    result = await db.execute(
        select(DeploymentConversation).where(
            DeploymentConversation.deployment_id == deployment_id,
            DeploymentConversation.session_id == session_id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        visitor_info = {}
        if request:
            visitor_info = {
                "ip": request.client.host if request.client else "unknown",
                "user_agent": request.headers.get("user-agent", ""),
                "referer": request.headers.get("referer", ""),
            }
        conv = DeploymentConversation(
            deployment_id=deployment_id,
            session_id=session_id,
            visitor_info=visitor_info,
        )
        db.add(conv)
        await db.flush()
    return conv


async def _load_conversation_history(db, conversation_id: str):
    """Load message history for context."""
    result = await db.execute(
        select(DeploymentMessage)
        .where(DeploymentMessage.conversation_id == conversation_id)
        .order_by(DeploymentMessage.created_at)
        .limit(50)  # Last 50 messages for context
    )
    messages = result.scalars().all()
    return [{"role": msg.role, "content": msg.content} for msg in messages]


async def _run_agent_chat(agent, db, conversation_history, user_message):
    """Run agent with skills if bound, otherwise simple chat."""
    # Check for skill bindings
    bindings_result = await db.execute(
        select(AgentSkillBinding).where(AgentSkillBinding.agent_id == agent.id)
    )
    bindings = bindings_result.scalars().all()

    if bindings:
        # Decrypt credentials
        credentials_map = {}
        for binding in bindings:
            if binding.credential_id and binding.credential_id not in credentials_map:
                cred_result = await db.execute(
                    select(Credential).where(
                        Credential.id == binding.credential_id,
                        Credential.is_active == True,
                    )
                )
                cred = cred_result.scalar_one_or_none()
                if cred:
                    credentials_map[str(binding.credential_id)] = decrypt_credentials(cred.credential_values)

        executor = build_agent_executor(
            agent_name=agent.name,
            system_prompt=agent.system_prompt,
            model_name=agent.model_name,
            temperature=agent.temperature,
            max_tokens=agent.max_tokens,
            skill_bindings=[{
                "skill_id": b.skill_id,
                "skill_name": b.skill_name,
                "credential_id": str(b.credential_id) if b.credential_id else None,
            } for b in bindings],
            credentials_map=credentials_map,
        )
        result = run_agent(executor, user_message)
        return result["output"]
    else:
        return run_chat(
            agent_name=agent.name,
            system_prompt=agent.system_prompt,
            model_name=agent.model_name,
            temperature=agent.temperature,
            max_tokens=agent.max_tokens,
            input_text=user_message,
            conversation_history=conversation_history,
        )


# ── Public Agent Info ────────────────────────────────────────
@router.get("/public/{slug}/info")
async def public_agent_info(slug: str):
    """Get public agent info — no sensitive data exposed."""
    dep, agent, db = await _get_deployment_by_slug(slug)
    try:
        settings = dep.settings or {}
        return {
            "name": settings.get("bot_name") or agent.name,
            "description": agent.description,
            "welcome_message": settings.get("welcome_message", "Hi! How can I help you?"),
            "theme_color": settings.get("theme_color", "#10b981"),
            "placeholder_text": settings.get("placeholder_text", "Type your message..."),
            "show_branding": settings.get("show_branding", True),
            "avatar": settings.get("bot_avatar", ""),
        }
    finally:
        await db.close()


# ── Public Chat (via slug) ───────────────────────────────────
@router.post("/public/{slug}/chat", response_model=PublicChatResponse)
async def public_chat(slug: str, payload: PublicChatRequest, request: Request):
    """Send a message to a deployed agent. No auth required."""
    dep, agent, db = await _get_deployment_by_slug(slug)
    try:
        # Rate limit check
        if not _check_rate_limit(dep.id, dep.rate_limit_rpm):
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")

        # Domain validation for widget embeds
        origin = request.headers.get("origin", "")
        if dep.allowed_domains and origin:
            if not any(domain in origin for domain in dep.allowed_domains):
                raise HTTPException(status_code=403, detail="Domain not allowed")

        # Get or create session
        session_id = payload.session_id or secrets.token_urlsafe(16)
        conv = await _get_or_create_conversation(db, dep.id, session_id, request)

        # Load conversation history
        history = await _load_conversation_history(db, conv.id)

        # Run agent
        response_text = await _run_agent_chat(agent, db, history, payload.message)

        # Save messages
        db.add(DeploymentMessage(conversation_id=conv.id, role="user", content=payload.message))
        db.add(DeploymentMessage(conversation_id=conv.id, role="assistant", content=response_text))

        # Update stats
        dep.total_messages = (dep.total_messages or 0) + 2
        if not payload.session_id:  # New conversation
            dep.total_conversations = (dep.total_conversations or 0) + 1

        conv.updated_at = datetime.utcnow()
        await db.commit()

        return PublicChatResponse(
            response=response_text,
            session_id=session_id,
            conversation_id=conv.id,
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await db.close()


# ── API Endpoint (via deploy token) ──────────────────────────
@router.post("/v1/agents/{deploy_token}/chat")
async def api_agent_chat(deploy_token: str, payload: PublicChatRequest, request: Request):
    """OpenAI-compatible API endpoint for deployed agents. Auth via deploy token in URL."""
    dep, agent, db = await _get_deployment_by_token(deploy_token)
    try:
        # Rate limit
        if not _check_rate_limit(dep.id, dep.rate_limit_rpm):
            raise HTTPException(status_code=429, detail="Rate limit exceeded")

        session_id = payload.session_id or secrets.token_urlsafe(16)
        conv = await _get_or_create_conversation(db, dep.id, session_id, request)
        history = await _load_conversation_history(db, conv.id)

        response_text = await _run_agent_chat(agent, db, history, payload.message)

        db.add(DeploymentMessage(conversation_id=conv.id, role="user", content=payload.message))
        db.add(DeploymentMessage(conversation_id=conv.id, role="assistant", content=response_text))
        dep.total_messages = (dep.total_messages or 0) + 2
        if not payload.session_id:
            dep.total_conversations = (dep.total_conversations or 0) + 1

        await db.commit()

        return {
            "choices": [{
                "message": {"role": "assistant", "content": response_text},
                "finish_reason": "stop",
            }],
            "session_id": session_id,
            "conversation_id": conv.id,
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await db.close()


# ── Get conversation history (for widget) ────────────────────
@router.get("/public/{slug}/history/{session_id}")
async def public_chat_history(slug: str, session_id: str):
    """Get chat history for a session — used by widget to restore state."""
    dep, agent, db = await _get_deployment_by_slug(slug)
    try:
        result = await db.execute(
            select(DeploymentConversation).where(
                DeploymentConversation.deployment_id == dep.id,
                DeploymentConversation.session_id == session_id,
            )
        )
        conv = result.scalar_one_or_none()
        if not conv:
            return {"messages": []}

        history = await _load_conversation_history(db, conv.id)
        return {"messages": history}
    finally:
        await db.close()
