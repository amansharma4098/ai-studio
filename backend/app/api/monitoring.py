"""Monitoring API - aggregated metrics and run history."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.db.session import get_db
from app.db.models import AgentRun, Agent
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Aggregated monitoring statistics for the current user."""
    # Total runs
    total = await db.execute(
        select(func.count(AgentRun.id))
        .join(Agent, Agent.id == AgentRun.agent_id)
        .where(Agent.user_id == current_user.id)
    )
    total_runs = total.scalar() or 0

    # Completed runs
    completed = await db.execute(
        select(func.count(AgentRun.id))
        .join(Agent, Agent.id == AgentRun.agent_id)
        .where(Agent.user_id == current_user.id, AgentRun.status == "completed")
    )
    completed_runs = completed.scalar() or 0

    # Avg latency
    avg_lat = await db.execute(
        select(func.avg(AgentRun.execution_time_ms))
        .join(Agent, Agent.id == AgentRun.agent_id)
        .where(Agent.user_id == current_user.id, AgentRun.status == "completed")
    )
    avg_latency = avg_lat.scalar() or 0

    # Total tokens
    tokens = await db.execute(
        select(func.sum(AgentRun.output_tokens + AgentRun.input_tokens))
        .join(Agent, Agent.id == AgentRun.agent_id)
        .where(Agent.user_id == current_user.id)
    )
    total_tokens = tokens.scalar() or 0

    success_rate = (completed_runs / total_runs * 100) if total_runs > 0 else 0

    return {
        "total_runs": total_runs,
        "completed_runs": completed_runs,
        "failed_runs": total_runs - completed_runs,
        "success_rate": round(success_rate, 1),
        "avg_latency_ms": round(avg_latency or 0, 0),
        "total_tokens": total_tokens,
    }


@router.get("/runs")
async def get_runs(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Recent agent runs with execution traces."""
    result = await db.execute(
        select(AgentRun, Agent.name.label("agent_name"), Agent.model_name)
        .join(Agent, Agent.id == AgentRun.agent_id)
        .where(Agent.user_id == current_user.id)
        .order_by(desc(AgentRun.created_at))
        .limit(limit)
    )
    rows = result.all()
    return [
        {
            "id": run.AgentRun.id,
            "agent_name": run.agent_name,
            "model_name": run.model_name,
            "input_text": run.AgentRun.input_text[:100],
            "output_text": run.AgentRun.output_text,
            "status": run.AgentRun.status,
            "execution_time_ms": run.AgentRun.execution_time_ms,
            "skills_called": run.AgentRun.skills_called,
            "execution_trace": run.AgentRun.execution_trace,
            "created_at": run.AgentRun.created_at,
        }
        for run in rows
    ]
