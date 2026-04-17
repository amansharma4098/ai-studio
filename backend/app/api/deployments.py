"""
Deployments API — deploy agents as embeddable widgets, shareable links, and API endpoints.

POST   /api/agents/{agent_id}/deploy           — create deployment
GET    /api/agents/{agent_id}/deployments       — list deployments for agent
GET    /api/deployments/{deployment_id}         — get deployment details
PUT    /api/deployments/{deployment_id}         — update settings
DELETE /api/deployments/{deployment_id}         — deactivate deployment
POST   /api/deployments/{deployment_id}/regenerate-token — regenerate token
GET    /api/deployments/{deployment_id}/analytics       — usage analytics
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import Agent, AgentDeployment, DeploymentConversation, DeploymentMessage, gen_deploy_token
from app.api.deps import get_current_user

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────
class DeploymentCreateRequest(BaseModel):
    deploy_type: str = "all"
    settings: Optional[dict] = None
    allowed_domains: Optional[List[str]] = None
    rate_limit_rpm: int = 30


class DeploymentUpdateRequest(BaseModel):
    deploy_type: Optional[str] = None
    settings: Optional[dict] = None
    allowed_domains: Optional[List[str]] = None
    rate_limit_rpm: Optional[int] = None
    is_active: Optional[bool] = None


class DeploymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    agent_id: str
    slug: str
    deploy_token: str
    deploy_type: str
    is_active: bool
    settings: dict
    allowed_domains: list
    rate_limit_rpm: int
    total_conversations: int
    total_messages: int
    created_at: datetime
    updated_at: datetime
    # Computed fields
    share_url: str = ""
    embed_code: str = ""
    api_endpoint: str = ""


# ── Helpers ──────────────────────────────────────────────────
async def _get_agent_or_404(db, agent_id, user_id):
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.user_id == user_id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


def _enrich(dep: AgentDeployment) -> dict:
    """Add computed URLs to deployment response."""
    base = {
        "id": dep.id,
        "agent_id": dep.agent_id,
        "slug": dep.slug,
        "deploy_token": dep.deploy_token,
        "deploy_type": dep.deploy_type,
        "is_active": dep.is_active,
        "settings": dep.settings or {},
        "allowed_domains": dep.allowed_domains or [],
        "rate_limit_rpm": dep.rate_limit_rpm,
        "total_conversations": dep.total_conversations,
        "total_messages": dep.total_messages,
        "created_at": dep.created_at,
        "updated_at": dep.updated_at,
        "share_url": f"/share/{dep.slug}",
        "embed_code": f'<script src="/embed.js" data-agent="{dep.slug}" data-theme="{(dep.settings or {}).get("theme_color", "#10b981")}"></script>',
        "api_endpoint": f"/api/v1/agents/{dep.deploy_token}/chat",
    }
    return base


# ── Create Deployment ────────────────────────────────────────
@router.post("/agents/{agent_id}/deploy", response_model=DeploymentResponse)
async def create_deployment(
    agent_id: str,
    payload: DeploymentCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    agent = await _get_agent_or_404(db, agent_id, current_user.id)

    # Check if deployment already exists
    existing = await db.execute(
        select(AgentDeployment).where(
            AgentDeployment.agent_id == agent_id,
            AgentDeployment.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Agent already has a deployment. Update it instead.")

    deployment = AgentDeployment(
        agent_id=agent_id,
        user_id=current_user.id,
        deploy_type=payload.deploy_type,
        settings=payload.settings or {
            "welcome_message": f"Hi! I'm {agent.name}. How can I help you?",
            "theme_color": "#10b981",
            "bot_name": agent.name,
            "placeholder_text": "Type your message...",
            "show_branding": True,
        },
        allowed_domains=payload.allowed_domains or [],
        rate_limit_rpm=payload.rate_limit_rpm,
    )
    db.add(deployment)
    await db.commit()
    await db.refresh(deployment)
    return _enrich(deployment)


# ── List Deployments ─────────────────────────────────────────
@router.get("/agents/{agent_id}/deployments", response_model=List[DeploymentResponse])
async def list_deployments(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    await _get_agent_or_404(db, agent_id, current_user.id)
    result = await db.execute(
        select(AgentDeployment)
        .where(AgentDeployment.agent_id == agent_id, AgentDeployment.user_id == current_user.id)
        .order_by(desc(AgentDeployment.created_at))
    )
    return [_enrich(d) for d in result.scalars().all()]


# ── Get Deployment ───────────────────────────────────────────
@router.get("/deployments/{deployment_id}", response_model=DeploymentResponse)
async def get_deployment(
    deployment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(AgentDeployment).where(
            AgentDeployment.id == deployment_id,
            AgentDeployment.user_id == current_user.id,
        )
    )
    dep = result.scalar_one_or_none()
    if not dep:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return _enrich(dep)


# ── Update Deployment ────────────────────────────────────────
@router.put("/deployments/{deployment_id}", response_model=DeploymentResponse)
async def update_deployment(
    deployment_id: str,
    payload: DeploymentUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(AgentDeployment).where(
            AgentDeployment.id == deployment_id,
            AgentDeployment.user_id == current_user.id,
        )
    )
    dep = result.scalar_one_or_none()
    if not dep:
        raise HTTPException(status_code=404, detail="Deployment not found")

    if payload.deploy_type is not None:
        dep.deploy_type = payload.deploy_type
    if payload.settings is not None:
        dep.settings = {**(dep.settings or {}), **payload.settings}
    if payload.allowed_domains is not None:
        dep.allowed_domains = payload.allowed_domains
    if payload.rate_limit_rpm is not None:
        dep.rate_limit_rpm = payload.rate_limit_rpm
    if payload.is_active is not None:
        dep.is_active = payload.is_active

    dep.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(dep)
    return _enrich(dep)


# ── Delete Deployment ────────────────────────────────────────
@router.delete("/deployments/{deployment_id}")
async def delete_deployment(
    deployment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(AgentDeployment).where(
            AgentDeployment.id == deployment_id,
            AgentDeployment.user_id == current_user.id,
        )
    )
    dep = result.scalar_one_or_none()
    if not dep:
        raise HTTPException(status_code=404, detail="Deployment not found")
    await db.delete(dep)
    await db.commit()
    return {"status": "deleted"}


# ── Regenerate Token ─────────────────────────────────────────
@router.post("/deployments/{deployment_id}/regenerate-token")
async def regenerate_token(
    deployment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(AgentDeployment).where(
            AgentDeployment.id == deployment_id,
            AgentDeployment.user_id == current_user.id,
        )
    )
    dep = result.scalar_one_or_none()
    if not dep:
        raise HTTPException(status_code=404, detail="Deployment not found")

    dep.deploy_token = gen_deploy_token()
    dep.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(dep)
    return {"deploy_token": dep.deploy_token, "api_endpoint": f"/api/v1/agents/{dep.deploy_token}/chat"}


# ── Analytics ────────────────────────────────────────────────
@router.get("/deployments/{deployment_id}/analytics")
async def deployment_analytics(
    deployment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(AgentDeployment).where(
            AgentDeployment.id == deployment_id,
            AgentDeployment.user_id == current_user.id,
        )
    )
    dep = result.scalar_one_or_none()
    if not dep:
        raise HTTPException(status_code=404, detail="Deployment not found")

    # Count conversations and messages
    conv_count = await db.execute(
        select(func.count(DeploymentConversation.id)).where(
            DeploymentConversation.deployment_id == deployment_id
        )
    )
    msg_count = await db.execute(
        select(func.count(DeploymentMessage.id))
        .join(DeploymentConversation)
        .where(DeploymentConversation.deployment_id == deployment_id)
    )

    return {
        "deployment_id": deployment_id,
        "total_conversations": conv_count.scalar() or 0,
        "total_messages": msg_count.scalar() or 0,
        "is_active": dep.is_active,
        "created_at": dep.created_at,
    }
