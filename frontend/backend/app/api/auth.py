from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.utils.security import hash_password, verify_password, create_access_token
from pydantic import BaseModel

router = APIRouter()

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    organization: str = ""

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/signup")
async def signup(req: SignupRequest, db: AsyncSession = Depends(get_db)):
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == req.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash password and create user
    hashed = hash_password(req.password)
    print(f"[AUTH] signup: email={req.email}, hash prefix={hashed[:30]}")

    user = User(
        name=req.name,
        email=req.email,
        password_hash=hashed,
        organization=req.organization,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id), "email": user.email})
    return {
        "access_token": token,
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "organization": user.organization,
        },
    }

@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()

    print(f"[AUTH] login attempt: {req.email}")
    print(f"[AUTH] user found: {user is not None}")

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    print(f"[AUTH] stored hash: {user.password_hash[:30]}")
    print(f"[AUTH] plain password length: {len(req.password)}")

    is_valid = verify_password(req.password, user.password_hash)
    print(f"[AUTH] verify result: {is_valid}")

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user.id), "email": user.email})
    return {
        "access_token": token,
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "organization": getattr(user, 'organization', ''),
        },
    }

@router.get("/me")
async def me():
    # Placeholder — requires token dependency middleware
    return {"detail": "Not implemented"}
