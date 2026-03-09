"""Credentials API - encrypted Microsoft service principal storage."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel, ConfigDict
import msal

from app.db.session import get_db
from app.db.models import Credential
from app.utils.security import encrypt_credentials, decrypt_credentials
from app.api.deps import get_current_user
from datetime import datetime

router = APIRouter()


class CredentialCreate(BaseModel):
    name: str
    credential_type: str  # azure | entra | both
    tenant_id: str
    client_id: str
    client_secret: str
    subscription_id: str = ""


class CredentialResponse(BaseModel):
    id: str
    name: str
    credential_type: str
    is_verified: bool
    last_verified_at: datetime | None
    scopes: list
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


@router.post("/", response_model=CredentialResponse)
async def create_credential(
    payload: CredentialCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create and verify a Microsoft credential via MSAL token fetch."""
    # Determine scopes based on type
    scopes_map = {
        "azure": ["https://management.azure.com/.default"],
        "entra": ["https://graph.microsoft.com/.default"],
        "both": ["https://management.azure.com/.default", "https://graph.microsoft.com/.default"],
    }
    scopes = scopes_map.get(payload.credential_type, ["https://graph.microsoft.com/.default"])

    # Try to fetch token to verify credentials
    is_verified = False
    try:
        app = msal.ConfidentialClientApplication(
            client_id=payload.client_id,
            client_credential=payload.client_secret,
            authority=f"https://login.microsoftonline.com/{payload.tenant_id}",
        )
        result = app.acquire_token_for_client(scopes=scopes[:1])
        is_verified = "access_token" in result
    except Exception:
        is_verified = False

    # Encrypt sensitive data
    sensitive = {
        "tenant_id": payload.tenant_id,
        "client_id": payload.client_id,
        "client_secret": payload.client_secret,
        "subscription_id": payload.subscription_id,
    }
    encrypted = encrypt_credentials(sensitive)

    cred = Credential(
        user_id=current_user.id,
        name=payload.name,
        credential_type=payload.credential_type,
        encrypted_data=encrypted,
        is_verified=is_verified,
        last_verified_at=datetime.utcnow() if is_verified else None,
        scopes=scopes,
    )
    db.add(cred)
    await db.commit()
    await db.refresh(cred)
    return cred


@router.get("/", response_model=List[CredentialResponse])
async def list_credentials(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Credential)
        .where(Credential.user_id == current_user.id)
        .order_by(desc(Credential.created_at))
    )
    return result.scalars().all()


@router.post("/{credential_id}/verify", response_model=CredentialResponse)
async def verify_credential(
    credential_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Re-fetch OAuth2 token to re-verify a credential."""
    result = await db.execute(
        select(Credential).where(Credential.id == credential_id, Credential.user_id == current_user.id)
    )
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(404, "Credential not found")

    decrypted = decrypt_credentials(cred.encrypted_data)
    try:
        app = msal.ConfidentialClientApplication(
            client_id=decrypted["client_id"],
            client_credential=decrypted["client_secret"],
            authority=f"https://login.microsoftonline.com/{decrypted['tenant_id']}",
        )
        result_token = app.acquire_token_for_client(scopes=cred.scopes[:1])
        cred.is_verified = "access_token" in result_token
        cred.last_verified_at = datetime.utcnow()
    except Exception:
        cred.is_verified = False

    await db.commit()
    await db.refresh(cred)
    return cred


@router.delete("/{credential_id}")
async def delete_credential(
    credential_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Credential).where(Credential.id == credential_id, Credential.user_id == current_user.id)
    )
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(404, "Credential not found")
    await db.delete(cred)
    await db.commit()
    return {"status": "deleted"}
