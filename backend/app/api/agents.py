"""
Agents API
POST /agents/ - create agent
GET  /agents/ - list agents
GET  /agents/{id} - get agent
PUT  /agents/{id} - update agent
DELETE /agents/{id} - delete agent
POST /agents/{id}/run - execute agent with LangChain
GET  /agents/{id}/runs - get run history
"""
import os
import time
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.db.session import get_db
from app.db.models import Agent, AgentSkillBinding, AgentRun, Credential
from app.schemas.agent_schemas import (
    AgentCreate, AgentUpdate, AgentResponse,
    AgentRunRequest, AgentRunResponse
)
from app.utils.security import decode_token, decrypt_credentials
from app.agents.langchain_agent import build_agent_executor, run_agent
from app.api.deps import get_current_user

router = APIRouter()


# ── Create Agent ──────────────────────────────────────────────────
@router.post("/", response_model=AgentResponse)
async def create_agent(
    payload: AgentCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    agent = Agent(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        system_prompt=payload.system_prompt,
        model_name=payload.model_name,
        temperature=payload.temperature,
        max_tokens=payload.max_tokens,
        memory_enabled=payload.memory_enabled,
    )
    db.add(agent)
    await db.flush()  # get agent.id

    # Add skill bindings
    for binding in payload.skill_bindings:
        db.add(AgentSkillBinding(
            agent_id=agent.id,
            skill_id=binding.skill_id,
            skill_name=binding.skill_name,
            credential_id=binding.credential_id,
        ))

    await db.commit()
    await db.refresh(agent)
    return agent


# ── List Agents ───────────────────────────────────────────────────
@router.get("/", response_model=List[AgentResponse])
async def list_agents(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Agent)
        .where(Agent.user_id == current_user.id)
        .order_by(desc(Agent.created_at))
    )
    return result.scalars().all()


# ── Get Agent ─────────────────────────────────────────────────────
@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    agent = await _get_agent_or_404(db, agent_id, current_user.id)
    return agent


# ── Update Agent ──────────────────────────────────────────────────
@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: str,
    payload: AgentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    agent = await _get_agent_or_404(db, agent_id, current_user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(agent, field, value)
    await db.commit()
    await db.refresh(agent)
    return agent


# ── Delete Agent ──────────────────────────────────────────────────
@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    agent = await _get_agent_or_404(db, agent_id, current_user.id)
    await db.delete(agent)
    await db.commit()
    return {"status": "deleted"}


# ── Run Agent (LangChain) ─────────────────────────────────────────
@router.post("/{agent_id}/run", response_model=AgentRunResponse)
async def run_agent_endpoint(
    agent_id: str,
    payload: AgentRunRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Execute an agent using Groq API:
    1. Load agent config and skill bindings
    2. Decrypt credentials for each bound skill
    3. Build agent executor with Groq LLM
    4. Run with user input
    5. Store AgentRun record
    """
    agent = await _get_agent_or_404(db, agent_id, current_user.id)

    # Load skill bindings
    bindings_result = await db.execute(
        select(AgentSkillBinding).where(AgentSkillBinding.agent_id == agent_id)
    )
    bindings = bindings_result.scalars().all()

    # Decrypt credentials for each binding and inject as env vars
    credentials_map = {}
    injected_env_keys = []
    for binding in bindings:
        if binding.credential_id and binding.credential_id not in credentials_map:
            cred_result = await db.execute(
                select(Credential).where(
                    Credential.id == binding.credential_id,
                    Credential.user_id == current_user.id,
                    Credential.is_active == True,
                )
            )
            cred = cred_result.scalar_one_or_none()
            if cred:
                decrypted = decrypt_credentials(cred.credential_values)
                credentials_map[str(binding.credential_id)] = decrypted

                # Inject credential values as environment variables
                # Format: CRED_{SKILL_ID}_{FIELD_KEY} = value
                prefix = f"CRED_{binding.skill_id.upper().replace('-', '_')}"
                for field_key, field_value in decrypted.items():
                    env_key = f"{prefix}_{field_key.upper()}"
                    os.environ[env_key] = str(field_value)
                    injected_env_keys.append(env_key)

    # Build LangChain executor
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
        memory_enabled=agent.memory_enabled,
    )

    # Execute
    try:
        result = run_agent(executor, payload.input_text)
    finally:
        # Clean up injected env vars after execution
        for env_key in injected_env_keys:
            os.environ.pop(env_key, None)

    # Persist run record
    run_record = AgentRun(
        agent_id=agent_id,
        user_id=current_user.id,
        input_text=payload.input_text,
        output_text=result["output"],
        execution_trace=result["trace"],
        skills_called=result["skills_called"],
        status=result["status"],
        execution_time_ms=result["execution_time_ms"],
        error_message=result.get("error"),
    )
    db.add(run_record)
    await db.commit()
    await db.refresh(run_record)

    return run_record


# ── Get Run History ───────────────────────────────────────────────
@router.get("/{agent_id}/runs", response_model=List[AgentRunResponse])
async def get_agent_runs(
    agent_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    await _get_agent_or_404(db, agent_id, current_user.id)
    result = await db.execute(
        select(AgentRun)
        .where(AgentRun.agent_id == agent_id)
        .order_by(desc(AgentRun.created_at))
        .limit(limit)
    )
    return result.scalars().all()


# ── Helper ────────────────────────────────────────────────────────
async def _get_agent_or_404(db, agent_id, user_id):
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.user_id == user_id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent
