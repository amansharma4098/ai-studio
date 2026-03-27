"""
API Key Management — programmatic access to AI Studio.
POST   /api/api-keys/         — create API key
GET    /api/api-keys/         — list API keys
DELETE /api/api-keys/{id}     — revoke API key
"""
import hashlib
import secrets
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.db.session import get_db
from app.db.models import ApiKey
from app.api.deps import get_current_user

router = APIRouter()

AVAILABLE_SCOPES = [
    "agents:read",
    "agents:write",
    "agents:execute",
    "skills:read",
    "credentials:read",
    "documents:read",
    "documents:write",
    "workflows:read",
    "workflows:write",
    "workflows:execute",
    "monitoring:read",
]


# ── Schemas ──────────────────────────────────────────────────
class ApiKeyCreate(BaseModel):
    name: str
    scopes: List[str] = ["agents:read", "agents:execute"]
    expires_days: Optional[int] = None  # None = never expires


class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    scopes: list
    last_used_at: Optional[str] = None
    expires_at: Optional[str] = None
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


class ApiKeyCreated(ApiKeyResponse):
    """Response when creating — includes the full key (shown once)."""
    full_key: str


# ── Create API Key ───────────────────────────────────────────
@router.post("/", response_model=ApiKeyCreated)
async def create_api_key(
    payload: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Validate scopes
    invalid = [s for s in payload.scopes if s not in AVAILABLE_SCOPES]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid scopes: {invalid}")

    # Generate key
    full_key = f"sk-aistudio-{secrets.token_urlsafe(32)}"
    key_prefix = full_key[:16]
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()

    from datetime import timedelta
    expires_at = None
    if payload.expires_days:
        expires_at = datetime.utcnow() + timedelta(days=payload.expires_days)

    api_key = ApiKey(
        user_id=current_user.id,
        name=payload.name,
        key_prefix=key_prefix,
        key_hash=key_hash,
        scopes=payload.scopes,
        expires_at=expires_at,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    return ApiKeyCreated(
        id=api_key.id,
        name=api_key.name,
        key_prefix=key_prefix,
        scopes=api_key.scopes,
        last_used_at=None,
        expires_at=str(expires_at) if expires_at else None,
        is_active=True,
        created_at=str(api_key.created_at),
        full_key=full_key,
    )


# ── List API Keys ───────────────────────────────────────────
@router.get("/", response_model=List[ApiKeyResponse])
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.user_id == current_user.id)
        .order_by(desc(ApiKey.created_at))
    )
    keys = result.scalars().all()
    return [
        ApiKeyResponse(
            id=k.id,
            name=k.name,
            key_prefix=k.key_prefix,
            scopes=k.scopes or [],
            last_used_at=str(k.last_used_at) if k.last_used_at else None,
            expires_at=str(k.expires_at) if k.expires_at else None,
            is_active=k.is_active,
            created_at=str(k.created_at),
        )
        for k in keys
    ]


# ── Get Available Scopes ────────────────────────────────────
@router.get("/scopes")
async def get_scopes(current_user=Depends(get_current_user)):
    return {"scopes": AVAILABLE_SCOPES}


# ── Revoke API Key ──────────────────────────────────────────
@router.delete("/{key_id}")
async def revoke_api_key(
    key_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id == key_id,
            ApiKey.user_id == current_user.id,
        )
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    api_key.is_active = False
    await db.commit()
    return {"status": "revoked"}
