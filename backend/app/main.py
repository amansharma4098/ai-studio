"""
AI Studio - FastAPI Application Entry Point
Production-grade multi-tenant AI automation platform
"""

import logging
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import make_asgi_app

from app.db.session import engine, Base
from app.utils.config import settings
from app.api import auth, agents, skills, credentials, documents, playground, workflows, monitoring

# ── Structured Logging ────────────────────────────────────────────
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)
logger = structlog.get_logger()


# ── Application Lifespan ──────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting AI Studio API", version="3.0.0", env=settings.ENVIRONMENT)

    # Create all database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, checkfirst=True)
    logger.info("Database tables created/verified")

    yield

    # Cleanup
    await engine.dispose()
    logger.info("AI Studio API shutting down")


# ── FastAPI App ───────────────────────────────────────────────────
app = FastAPI(
    title="AI Studio API",
    description="Production AI automation platform with Microsoft Entra ID & Azure Skills",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────
_cors_origins = (
    [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
    if settings.ALLOWED_ORIGINS
    else settings.CORS_ORIGINS
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global Exception Handler ──────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception", path=request.url.path, error=str(exc))
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ── Prometheus Metrics Endpoint ───────────────────────────────────
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)


# ── API Routers ───────────────────────────────────────────────────
app.include_router(auth.router,        prefix="/api/auth",        tags=["Authentication"])
app.include_router(agents.router,      prefix="/api/agents",      tags=["Agents"])
app.include_router(skills.router,      prefix="/api/skills",      tags=["Skills"])
app.include_router(credentials.router, prefix="/api/credentials", tags=["Credentials"])
app.include_router(documents.router,   prefix="/api/documents",   tags=["Documents"])
app.include_router(playground.router,  prefix="/api/playground",  tags=["Playground"])
app.include_router(workflows.router,   prefix="/api/workflows",   tags=["Workflows"])
app.include_router(monitoring.router,  prefix="/api/monitoring",  tags=["Monitoring"])


# ── Health Check ──────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "version": "3.0.0", "service": "AI Studio API"}
