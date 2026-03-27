"""
Billing & Plans API — licensing tiers for enterprise and individual users.
GET  /api/billing/plans        — list available plans
GET  /api/billing/usage        — get current usage
GET  /api/billing/my-plan      — get user's current plan
POST /api/billing/upgrade      — upgrade plan (stub for Stripe integration)
"""
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.db.models import Team, TeamMember, AgentRun, Agent, UsageRecord
from app.api.deps import get_current_user

router = APIRouter()


# ── Plan Definitions ────────────────────────────────────────
PLANS = {
    "free": {
        "id": "free",
        "name": "Free",
        "price_monthly": 0,
        "price_yearly": 0,
        "max_agents": 5,
        "max_members": 1,
        "max_runs_per_month": 100,
        "max_documents": 10,
        "max_workflows": 3,
        "features": [
            "5 AI Agents",
            "100 runs/month",
            "Claude Haiku model",
            "10 document uploads",
            "3 workflows",
            "Community support",
            "Basic analytics",
        ],
        "models": ["claude-haiku"],
        "highlighted": False,
    },
    "pro": {
        "id": "pro",
        "name": "Pro",
        "price_monthly": 29,
        "price_yearly": 290,
        "max_agents": 50,
        "max_members": 5,
        "max_runs_per_month": 5000,
        "max_documents": 100,
        "max_workflows": 25,
        "features": [
            "50 AI Agents",
            "5,000 runs/month",
            "Claude Sonnet + Haiku",
            "100 document uploads",
            "25 workflows",
            "Smart Agent Builder",
            "Multi-agent orchestration",
            "API access",
            "Priority support",
            "Advanced analytics",
            "Team collaboration (5 seats)",
        ],
        "models": ["claude-sonnet", "claude-haiku"],
        "highlighted": True,
    },
    "enterprise": {
        "id": "enterprise",
        "name": "Enterprise",
        "price_monthly": 99,
        "price_yearly": 990,
        "max_agents": -1,  # unlimited
        "max_members": -1,
        "max_runs_per_month": -1,
        "max_documents": -1,
        "max_workflows": -1,
        "features": [
            "Unlimited AI Agents",
            "Unlimited runs",
            "All Claude models (Opus + Sonnet + Haiku)",
            "Unlimited documents",
            "Unlimited workflows",
            "Smart Agent Builder",
            "Multi-agent orchestration",
            "Full API access",
            "SSO/SAML",
            "Dedicated support",
            "Custom integrations",
            "Audit logs & compliance",
            "SLA guarantees",
            "Unlimited team members",
            "On-premise deployment option",
        ],
        "models": ["claude-opus", "claude-sonnet", "claude-haiku"],
        "highlighted": False,
    },
}


# ── Schemas ──────────────────────────────────────────────────
class PlanResponse(BaseModel):
    id: str
    name: str
    price_monthly: int
    price_yearly: int
    max_agents: int
    max_members: int
    max_runs_per_month: int
    max_documents: int
    max_workflows: int
    features: list
    models: list
    highlighted: bool


class UsageResponse(BaseModel):
    plan: str
    agents_used: int
    agents_limit: int
    runs_this_month: int
    runs_limit: int
    documents_used: int
    documents_limit: int
    total_input_tokens: int
    total_output_tokens: int
    estimated_cost_usd: float


class UpgradeRequest(BaseModel):
    plan_id: str
    billing_cycle: str = "monthly"  # monthly | yearly


# ── List Plans ───────────────────────────────────────────────
@router.get("/plans")
async def list_plans():
    return list(PLANS.values())


# ── Get My Plan ──────────────────────────────────────────────
@router.get("/my-plan")
async def get_my_plan(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Find user's team (or create default)
    result = await db.execute(
        select(Team)
        .join(TeamMember, TeamMember.team_id == Team.id)
        .where(TeamMember.user_id == current_user.id)
        .limit(1)
    )
    team = result.scalar_one_or_none()

    plan_id = team.plan if team else "free"
    plan = PLANS.get(plan_id, PLANS["free"])

    return {
        "current_plan": plan,
        "team_id": team.id if team else None,
        "team_name": team.name if team else None,
    }


# ── Get Usage ────────────────────────────────────────────────
@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Get current plan
    team_result = await db.execute(
        select(Team)
        .join(TeamMember, TeamMember.team_id == Team.id)
        .where(TeamMember.user_id == current_user.id)
        .limit(1)
    )
    team = team_result.scalar_one_or_none()
    plan_id = team.plan if team else "free"
    plan = PLANS.get(plan_id, PLANS["free"])

    # Count agents
    agents_result = await db.execute(
        select(func.count(Agent.id)).where(Agent.user_id == current_user.id)
    )
    agents_count = agents_result.scalar() or 0

    # Count runs this month
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    runs_result = await db.execute(
        select(func.count(AgentRun.id)).where(
            AgentRun.user_id == current_user.id,
            AgentRun.created_at >= month_start,
        )
    )
    runs_count = runs_result.scalar() or 0

    # Count documents
    from app.db.models import Document
    docs_result = await db.execute(
        select(func.count(Document.id)).where(Document.user_id == current_user.id)
    )
    docs_count = docs_result.scalar() or 0

    # Token usage
    tokens_result = await db.execute(
        select(
            func.coalesce(func.sum(AgentRun.input_tokens), 0),
            func.coalesce(func.sum(AgentRun.output_tokens), 0),
        ).where(
            AgentRun.user_id == current_user.id,
            AgentRun.created_at >= month_start,
        )
    )
    input_tokens, output_tokens = tokens_result.one()

    # Estimate cost (Claude Sonnet pricing: $3/M input, $15/M output)
    estimated_cost = (int(input_tokens) * 3 / 1_000_000) + (int(output_tokens) * 15 / 1_000_000)

    return UsageResponse(
        plan=plan_id,
        agents_used=agents_count,
        agents_limit=plan["max_agents"],
        runs_this_month=runs_count,
        runs_limit=plan["max_runs_per_month"],
        documents_used=docs_count,
        documents_limit=plan["max_documents"],
        total_input_tokens=int(input_tokens),
        total_output_tokens=int(output_tokens),
        estimated_cost_usd=round(estimated_cost, 4),
    )


# ── Upgrade Plan ─────────────────────────────────────────────
@router.post("/upgrade")
async def upgrade_plan(
    payload: UpgradeRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Upgrade user's plan. In production, this integrates with Stripe."""
    if payload.plan_id not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    plan = PLANS[payload.plan_id]

    # Find or create team
    team_result = await db.execute(
        select(Team)
        .join(TeamMember, TeamMember.team_id == Team.id)
        .where(
            TeamMember.user_id == current_user.id,
            TeamMember.role == "owner",
        )
        .limit(1)
    )
    team = team_result.scalar_one_or_none()

    if not team:
        # Auto-create personal team
        import re
        slug = re.sub(r'[^a-z0-9]+', '-', current_user.name.lower()).strip('-')
        team = Team(
            name=f"{current_user.name}'s Workspace",
            slug=f"{slug}-{str(current_user.id)[:4]}",
            owner_id=current_user.id,
        )
        db.add(team)
        await db.flush()
        db.add(TeamMember(
            team_id=team.id,
            user_id=current_user.id,
            role="owner",
        ))

    # Update plan
    team.plan = payload.plan_id
    team.max_agents = plan["max_agents"]
    team.max_members = plan["max_members"]
    team.max_runs_per_month = plan["max_runs_per_month"]

    await db.commit()

    return {
        "status": "upgraded",
        "plan": payload.plan_id,
        "message": f"Successfully upgraded to {plan['name']} plan!",
        # In production: return Stripe checkout URL
        # "checkout_url": "https://checkout.stripe.com/..."
    }
