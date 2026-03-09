"""
Celery Worker Configuration
Handles async agent runs, workflow execution, and scheduled tasks.
"""
import asyncio
from datetime import datetime
from celery import Celery
from app.utils.config import settings

# ── Celery App ────────────────────────────────────────────────────
celery_app = Celery(
    "ai_studio",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.celery_app"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "app.workers.celery_app.execute_agent_task": {"queue": "agents"},
        "app.workers.celery_app.execute_workflow_task": {"queue": "workflows"},
    },
    task_acks_late=True,
    worker_prefetch_multiplier=1,  # fair dispatch for long-running LLM tasks
)


# ── Agent Task ────────────────────────────────────────────────────
@celery_app.task(bind=True, max_retries=2, default_retry_delay=5)
def execute_agent_task(self, agent_id: str, user_id: str, input_text: str):
    """
    Async Celery task for agent execution.
    Called for background runs triggered by workflows or schedules.
    """
    try:
        from app.db.session import AsyncSessionLocal
        from app.db.models import Agent, AgentSkillBinding, AgentRun, Credential
        from app.utils.security import decrypt_credentials
        from app.agents.langchain_agent import build_agent_executor, run_agent
        from sqlalchemy import select

        async def _run():
            async with AsyncSessionLocal() as db:
                # Load agent
                result = await db.execute(select(Agent).where(Agent.id == agent_id))
                agent = result.scalar_one_or_none()
                if not agent:
                    return {"error": "Agent not found"}

                # Load bindings
                bindings_result = await db.execute(
                    select(AgentSkillBinding).where(AgentSkillBinding.agent_id == agent_id)
                )
                bindings = bindings_result.scalars().all()

                # Decrypt credentials
                credentials_map = {}
                for b in bindings:
                    if b.credential_id and str(b.credential_id) not in credentials_map:
                        cred_result = await db.execute(select(Credential).where(Credential.id == b.credential_id))
                        cred = cred_result.scalar_one_or_none()
                        if cred:
                            credentials_map[str(b.credential_id)] = decrypt_credentials(cred.encrypted_data)

                # Build and run agent
                executor = build_agent_executor(
                    agent_name=agent.name,
                    system_prompt=agent.system_prompt,
                    model_name=agent.model_name,
                    temperature=agent.temperature,
                    max_tokens=agent.max_tokens,
                    skill_bindings=[{"skill_id": b.skill_id, "skill_name": b.skill_name, "credential_id": str(b.credential_id) if b.credential_id else None} for b in bindings],
                    credentials_map=credentials_map,
                    memory_enabled=False,  # no memory for background tasks
                )
                result_data = run_agent(executor, input_text)

                # Save run record
                run_record = AgentRun(
                    agent_id=agent_id, user_id=user_id,
                    input_text=input_text, output_text=result_data["output"],
                    execution_trace=result_data["trace"], skills_called=result_data["skills_called"],
                    status=result_data["status"], execution_time_ms=result_data["execution_time_ms"],
                )
                db.add(run_record)
                await db.commit()
                return result_data

        return asyncio.run(_run())

    except Exception as exc:
        raise self.retry(exc=exc)


# ── Workflow Task ─────────────────────────────────────────────────
@celery_app.task(bind=True, max_retries=1)
def execute_workflow_task(self, workflow_id: str, user_id: str):
    """Execute a workflow by running each node sequentially."""
    try:
        from app.db.session import AsyncSessionLocal
        from app.db.models import Workflow, WorkflowRun
        from sqlalchemy import select

        async def _run():
            async with AsyncSessionLocal() as db:
                result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
                wf = result.scalar_one_or_none()
                if not wf:
                    return {"error": "Workflow not found"}

                nodes = wf.definition.get("nodes", [])
                trace = []

                for node in nodes:
                    node_type = node.get("type")
                    node_data = node.get("data", {})

                    if node_type == "agent_node":
                        agent_id = node_data.get("agent_id")
                        prompt = node_data.get("prompt", "Run your task")
                        if agent_id:
                            task_result = execute_agent_task.apply(args=[agent_id, user_id, prompt])
                            trace.append({"node": node.get("id"), "type": "agent", "status": "ok", "result": str(task_result.result)[:200]})

                wf_run = WorkflowRun(workflow_id=workflow_id, status="completed", execution_trace=trace)
                db.add(wf_run)
                wf.last_run_at = datetime.utcnow()
                await db.commit()
                return {"status": "completed", "nodes_executed": len(trace)}

        return asyncio.run(_run())

    except Exception as exc:
        raise self.retry(exc=exc)


def schedule_workflow(workflow_id: str, cron_expr: str):
    """Schedule a workflow using redbeat (requires redbeat package)."""
    try:
        from redbeat import RedBeatSchedulerEntry
        from celery.schedules import crontab
    except ImportError:
        raise RuntimeError("redbeat package is not installed; workflow scheduling is unavailable")
    parts = cron_expr.split()
    schedule = crontab(minute=parts[0], hour=parts[1], day_of_week=parts[4] if len(parts) > 4 else "*")
    entry = RedBeatSchedulerEntry(
        name=f"workflow_{workflow_id}",
        task="app.workers.celery_app.execute_workflow_task",
        schedule=schedule,
        args=[workflow_id, "system"],
        app=celery_app,
    )
    entry.save()
