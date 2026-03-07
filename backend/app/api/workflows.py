"""Workflows API with Celery scheduling."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from pydantic import BaseModel

from app.db.session import get_db
from app.db.models import Workflow, WorkflowRun, AgentRun
from app.api.deps import get_current_user

router = APIRouter()


class WorkflowCreate(BaseModel):
    name: str
    description: str = ""
    definition: dict  # React Flow node/edge JSON
    schedule_cron: str = None


@router.post("/")
async def create_workflow(
    payload: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    wf = Workflow(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        definition=payload.definition,
        schedule_cron=payload.schedule_cron,
    )
    db.add(wf)
    await db.commit()
    await db.refresh(wf)

    # Schedule with Celery Beat if cron provided
    if payload.schedule_cron:
        try:
            from app.workers.celery_app import schedule_workflow
            schedule_workflow(str(wf.id), payload.schedule_cron)
        except Exception:
            pass  # Scheduling is best-effort

    return wf


@router.get("/")
async def list_workflows(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Workflow).where(Workflow.user_id == current_user.id).order_by(desc(Workflow.created_at))
    )
    return result.scalars().all()


@router.post("/{workflow_id}/run")
async def run_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == current_user.id)
    )
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(404, "Workflow not found")

    # Dispatch to Celery worker
    try:
        from app.workers.celery_app import execute_workflow_task
        task = execute_workflow_task.delay(workflow_id, current_user.id)
        return {"status": "queued", "task_id": task.id}
    except Exception as e:
        raise HTTPException(500, f"Failed to queue workflow: {str(e)}")


@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == current_user.id)
    )
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(404, "Workflow not found")
    await db.delete(wf)
    await db.commit()
    return {"status": "deleted"}
