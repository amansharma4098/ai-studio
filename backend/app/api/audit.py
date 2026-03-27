"""
Audit Log API — enterprise compliance and activity tracking.
GET  /api/audit/               — list audit logs
GET  /api/audit/stats          — audit summary stats
"""
from typing import List, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from app.db.session import get_db
from app.db.models import AuditLog
from app.api.deps import get_current_user

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────
class AuditLogResponse(BaseModel):
    id: str
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    details: dict
    ip_address: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


# ── List Audit Logs ──────────────────────────────────────────
@router.get("/", response_model=List[AuditLogResponse])
async def list_audit_logs(
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = (
        select(AuditLog)
        .where(AuditLog.user_id == current_user.id)
        .order_by(desc(AuditLog.created_at))
    )
    if action:
        query = query.where(AuditLog.action == action)
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()

    return [
        AuditLogResponse(
            id=log.id,
            action=log.action,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            details=log.details or {},
            ip_address=log.ip_address,
            created_at=str(log.created_at),
        )
        for log in logs
    ]


# ── Audit Stats ──────────────────────────────────────────────
@router.get("/stats")
async def audit_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    now = datetime.utcnow()
    day_ago = now - timedelta(days=1)
    week_ago = now - timedelta(days=7)

    # Total actions
    total_result = await db.execute(
        select(func.count(AuditLog.id)).where(AuditLog.user_id == current_user.id)
    )
    total = total_result.scalar() or 0

    # Last 24h
    day_result = await db.execute(
        select(func.count(AuditLog.id)).where(
            AuditLog.user_id == current_user.id,
            AuditLog.created_at >= day_ago,
        )
    )
    last_24h = day_result.scalar() or 0

    # Last 7d
    week_result = await db.execute(
        select(func.count(AuditLog.id)).where(
            AuditLog.user_id == current_user.id,
            AuditLog.created_at >= week_ago,
        )
    )
    last_7d = week_result.scalar() or 0

    # Top actions
    top_result = await db.execute(
        select(AuditLog.action, func.count(AuditLog.id).label("count"))
        .where(AuditLog.user_id == current_user.id)
        .group_by(AuditLog.action)
        .order_by(desc("count"))
        .limit(10)
    )
    top_actions = [{"action": row[0], "count": row[1]} for row in top_result.all()]

    return {
        "total": total,
        "last_24h": last_24h,
        "last_7d": last_7d,
        "top_actions": top_actions,
    }


# ── Helper: Log an audit event ──────────────────────────────
async def log_audit(
    db: AsyncSession,
    user_id: str,
    action: str,
    resource_type: str = None,
    resource_id: str = None,
    details: dict = None,
    ip_address: str = None,
    user_agent: str = None,
):
    """Utility to log an audit event from any API endpoint."""
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details or {},
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(log)
    # Don't commit — let the caller's transaction handle it
