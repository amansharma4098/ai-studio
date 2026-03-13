"""
Credentials API - dynamic auth types with encrypted storage.

GET  /api/credentials/auth-types     -> auth type structure (no auth)
GET  /api/credentials/list           -> list user credentials
POST /api/credentials/save           -> create credential
PUT  /api/credentials/{id}           -> update credential
DELETE /api/credentials/{id}         -> soft delete
GET  /api/credentials/{id}/values    -> decrypted values (JWT protected)
"""
from typing import Optional, Dict
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel, ConfigDict

from app.db.session import get_db
from app.db.models import Credential, User
from app.utils.security import encrypt_credentials, decrypt_credentials
from app.api.deps import get_current_user
from app.services.credential_types import CREDENTIAL_AUTH_TYPES

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────
class CredentialSave(BaseModel):
    name: str
    auth_type: str
    auth_category: str
    description: Optional[str] = None
    credential_values: Dict[str, str]


class CredentialUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    credential_values: Optional[Dict[str, str]] = None


class CredentialListItem(BaseModel):
    id: str
    name: str
    auth_type: str
    auth_category: str
    created_by_email: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


# ── GET /auth-types  (no auth needed) ────────────────────────────
@router.get("/auth-types")
async def get_auth_types():
    """Return auth types list, categories dict, and fields dict."""
    auth_types = list(CREDENTIAL_AUTH_TYPES.keys())

    # Build categories: { "Cloud": ["Azure Log Analytics", ...], ... }
    categories: dict[str, list[str]] = {}
    for auth_type, info in CREDENTIAL_AUTH_TYPES.items():
        cat = info["category"]
        categories.setdefault(cat, []).append(auth_type)

    # Build fields: { "Azure Log Analytics": [...fields], ... }
    fields = {
        auth_type: info["fields"]
        for auth_type, info in CREDENTIAL_AUTH_TYPES.items()
    }

    return {
        "auth_types": auth_types,
        "categories": categories,
        "fields": fields,
    }


# ── GET /list ────────────────────────────────────────────────────
@router.get("/list")
async def list_credentials(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List all credentials for the current user (no secrets)."""
    result = await db.execute(
        select(Credential)
        .where(Credential.user_id == current_user.id, Credential.is_active == True)
        .order_by(desc(Credential.created_at))
    )
    rows = result.scalars().all()

    return [
        {
            "id": str(row.id),
            "name": row.name,
            "auth_type": row.auth_type,
            "auth_category": row.auth_category,
            "created_by_email": current_user.email,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
            "is_active": row.is_active,
        }
        for row in rows
    ]


# ── POST /save ───────────────────────────────────────────────────
@router.post("/save")
async def save_credential(
    payload: CredentialSave,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a new credential with encrypted values."""
    # Validate auth_type exists
    if payload.auth_type not in CREDENTIAL_AUTH_TYPES:
        raise HTTPException(400, f"Unknown auth_type: {payload.auth_type}")

    # Validate required fields
    type_info = CREDENTIAL_AUTH_TYPES[payload.auth_type]
    for field in type_info["fields"]:
        if field["required"] and not payload.credential_values.get(field["key"]):
            raise HTTPException(400, f"Missing required field: {field['label']}")

    encrypted = encrypt_credentials(payload.credential_values)

    cred = Credential(
        user_id=current_user.id,
        name=payload.name,
        auth_type=payload.auth_type,
        auth_category=payload.auth_category,
        description=payload.description,
        credential_values=encrypted,
    )
    db.add(cred)
    await db.commit()
    await db.refresh(cred)

    return {
        "id": str(cred.id),
        "name": cred.name,
        "auth_type": cred.auth_type,
        "auth_category": cred.auth_category,
        "created_at": cred.created_at.isoformat() if cred.created_at else None,
        "status": "saved",
    }


# ── PUT /{id} ────────────────────────────────────────────────────
@router.put("/{credential_id}")
async def update_credential(
    credential_id: str,
    payload: CredentialUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update an existing credential."""
    cred = await _get_credential_or_404(db, credential_id, current_user.id)

    if payload.name is not None:
        cred.name = payload.name
    if payload.description is not None:
        cred.description = payload.description
    if payload.credential_values is not None:
        cred.credential_values = encrypt_credentials(payload.credential_values)

    cred.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(cred)

    return {
        "id": str(cred.id),
        "name": cred.name,
        "auth_type": cred.auth_type,
        "auth_category": cred.auth_category,
        "updated_at": cred.updated_at.isoformat() if cred.updated_at else None,
        "status": "updated",
    }


# ── DELETE /{id}  (soft delete) ──────────────────────────────────
@router.delete("/{credential_id}")
async def delete_credential(
    credential_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Soft delete a credential (set is_active=false)."""
    cred = await _get_credential_or_404(db, credential_id, current_user.id)
    cred.is_active = False
    cred.updated_at = datetime.utcnow()
    await db.commit()
    return {"status": "deleted", "id": credential_id}


# ── GET /{id}/values  (JWT protected) ────────────────────────────
@router.get("/{credential_id}/values")
async def get_credential_values(
    credential_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return decrypted credential_values for agent execution."""
    cred = await _get_credential_or_404(db, credential_id, current_user.id)
    decrypted = decrypt_credentials(cred.credential_values)
    return {
        "id": str(cred.id),
        "auth_type": cred.auth_type,
        "auth_category": cred.auth_category,
        "credential_values": decrypted,
    }


# ── Helper ───────────────────────────────────────────────────────
async def _get_credential_or_404(db: AsyncSession, credential_id: str, user_id: str):
    result = await db.execute(
        select(Credential).where(
            Credential.id == credential_id,
            Credential.user_id == user_id,
            Credential.is_active == True,
        )
    )
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(404, "Credential not found")
    return cred
