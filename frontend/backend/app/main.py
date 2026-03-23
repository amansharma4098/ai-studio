from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.app.db.session import engine
from backend.app.db.base import Base

# Import all models so Base.metadata knows about them
from backend.app.models.user import User  # noqa: F401

@asynccontextmanager
async def lifespan(app: FastAPI):
    # DROP and recreate all tables on startup (dev only — clears stale hashes)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("DB tables dropped and recreated (dev mode)")
    yield

app = FastAPI(title="AI Studio API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
from backend.app.api.auth import router as auth_router  # noqa: E402
from backend.app.api.documents import router as documents_router  # noqa: E402
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(documents_router, prefix="/api/documents", tags=["documents"])
