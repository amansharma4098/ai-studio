"""
AI Studio v5.0 — Enterprise AI Agent Platform
Multi-model support (Claude, GPT, Gemini, Llama, Ollama) with native tool_use,
smart agent builder, multi-agent orchestration, agent deployment, and enterprise features.
"""

import logging
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import make_asgi_app

from sqlalchemy import text

from app.db.session import engine, Base
from app.utils.config import settings
from app.api import (
    auth, agents, chat, skills, credentials, documents,
    playground, workflows, monitoring,
    agent_builder, teams, api_keys, billing, audit,
    deployments, public_agent,
)

# ── Structured Logging ────────────────────────────────────────────
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)
logger = structlog.get_logger()


# ── Auto-Migration (ADD COLUMN IF NOT EXISTS) ───────────────────
async def run_migrations(engine):
    """Add any columns missing from existing tables.
    Safe to run every startup — IF NOT EXISTS is a no-op when the column is already present."""
    async with engine.begin() as conn:
        # ── aistudio_users ──
        await conn.execute(text(
            "ALTER TABLE aistudio_users ADD COLUMN IF NOT EXISTS account_type VARCHAR DEFAULT 'individual'"
        ))
        await conn.execute(text(
            "ALTER TABLE aistudio_users ADD COLUMN IF NOT EXISTS org_name VARCHAR"
        ))
        await conn.execute(text(
            "ALTER TABLE aistudio_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true"
        ))
        await conn.execute(text(
            "ALTER TABLE aistudio_users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'user'"
        ))
        await conn.execute(text(
            "ALTER TABLE aistudio_users ADD COLUMN IF NOT EXISTS organization VARCHAR"
        ))


# ── Application Lifespan ──────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting AI Studio API", version="5.0.0", env=settings.ENVIRONMENT)

    # Create all database tables (checkfirst=True by default, only creates if not exists)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created/verified")

    # Auto-migrate: add columns that create_all won't add to existing tables
    await run_migrations(engine)
    logger.info("Column migrations verified")

    # Load skill registry
    from app.skills.registry import skill_registry
    skill_registry.load_all()

    yield

    # Cleanup
    await engine.dispose()
    logger.info("AI Studio API shutting down")


# ── FastAPI App ───────────────────────────────────────────────────
app = FastAPI(
    title="AI Studio API",
    description="Enterprise AI Agent Platform — multi-model support (Claude, GPT, Gemini, Llama). Build, deploy, and manage AI agents with native tool-calling, smart agent builder, and multi-agent orchestration.",
    version="5.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"],
    allow_credentials=bool(settings.CORS_ORIGINS),
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
# Core
app.include_router(auth.router,          prefix="/api/auth",           tags=["Authentication"])
app.include_router(agents.router,        prefix="/api/agents",         tags=["Agents"])
app.include_router(skills.router,        prefix="/api/skills",         tags=["Skills"])
app.include_router(credentials.router,   prefix="/api/credentials",    tags=["Credentials"])
app.include_router(documents.router,     prefix="/api/documents",      tags=["Documents"])
app.include_router(playground.router,    prefix="/api/playground",     tags=["Playground"])
app.include_router(workflows.router,     prefix="/api/workflows",      tags=["Workflows"])
app.include_router(monitoring.router,    prefix="/api/monitoring",     tags=["Monitoring"])
app.include_router(chat.router,          prefix="/api",                tags=["Chat"])

# New: Enterprise & Builder
app.include_router(agent_builder.router, prefix="/api/agent-builder",  tags=["Agent Builder"])
app.include_router(teams.router,         prefix="/api/teams",          tags=["Teams"])
app.include_router(api_keys.router,      prefix="/api/api-keys",       tags=["API Keys"])
app.include_router(billing.router,       prefix="/api/billing",        tags=["Billing"])
app.include_router(audit.router,         prefix="/api/audit",          tags=["Audit"])

# Agent Deployment & Public Access
app.include_router(deployments.router,   prefix="/api",                tags=["Deployments"])
app.include_router(public_agent.router,  prefix="/api",                tags=["Public Agent"])


# ── Health Check ──────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "version": "5.0.0",
        "service": "AI Studio API",
        "engine": "Multi-Model (Claude, GPT, Gemini, Llama, Ollama)",
        "features": [
            "multi-model-support",
            "native-tool-use",
            "smart-agent-builder",
            "multi-agent-orchestration",
            "agent-deployment",
            "embed-widget",
            "share-links",
            "api-endpoints",
            "streaming",
            "enterprise-rbac",
            "api-keys",
            "audit-logging",
        ],
    }
