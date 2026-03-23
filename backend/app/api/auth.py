"""Authentication API Router."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from pydantic import BaseModel, EmailStr

from app.db.session import get_db
from app.db.models import User
from app.utils.security import hash_password, verify_password, create_access_token
from app.api.deps import get_current_user

router = APIRouter()


class SignupRequest(BaseModel):
    email: EmailStr
    name: str
    organization: str = ""
    password: str
    account_type: Optional[str] = "individual"
    org_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/signup")
async def signup(payload: SignupRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")
    hashed = hash_password(payload.password)
    user = User(
        email=payload.email,
        name=payload.name,
        organization=payload.organization,
        password_hash=hashed,
        account_type=payload.account_type,
        org_name=payload.org_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token({"sub": user.id, "email": user.email})
    return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "name": user.name, "email": user.email}}


@router.post("/login")
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(401, "Invalid credentials")
    is_valid = verify_password(payload.password, user.password_hash)
    if not is_valid:
        raise HTTPException(401, "Invalid credentials")
    token = create_access_token({"sub": user.id, "email": user.email})
    return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "name": user.name, "email": user.email}}


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return {"id": current_user.id, "name": current_user.name, "email": current_user.email, "organization": current_user.organization, "account_type": current_user.account_type, "org_name": current_user.org_name}
