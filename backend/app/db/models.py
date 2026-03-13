"""
SQLAlchemy ORM models for AI Studio.
Full multi-tenant schema with agents, skills, credentials, runs.
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey,
    Integer, String, Text, JSON, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


def gen_uuid():
    return str(uuid.uuid4())


# ── Users ─────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "aistudio_users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    organization = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="user")  # user | admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    agents = relationship("Agent", back_populates="owner", cascade="all, delete-orphan")
    credentials = relationship("Credential", back_populates="owner", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")
    workflows = relationship("Workflow", back_populates="owner", cascade="all, delete-orphan")


# ── Agents ────────────────────────────────────────────────────────
class Agent(Base):
    __tablename__ = "aistudio_agents"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("aistudio_users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    system_prompt = Column(Text, nullable=False)
    model_name = Column(String(100), default="llama3")
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=2048)
    memory_enabled = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="agents")
    skill_bindings = relationship("AgentSkillBinding", back_populates="agent", cascade="all, delete-orphan")
    runs = relationship("AgentRun", back_populates="agent", cascade="all, delete-orphan")


# ── Skill Bindings (Agent ↔ Skill ↔ Credential) ───────────────────
class AgentSkillBinding(Base):
    """
    Maps an agent to a skill, with an optional credential binding.
    Each skill can have a different credential per agent.
    """
    __tablename__ = "agent_skill_bindings"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    agent_id = Column(UUID(as_uuid=False), ForeignKey("aistudio_agents.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(String(100), nullable=False)        # e.g. "en01", "az07"
    skill_name = Column(String(100), nullable=False)      # e.g. "entra_create_group"
    credential_id = Column(UUID(as_uuid=False), ForeignKey("credentials.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    agent = relationship("Agent", back_populates="skill_bindings")
    credential = relationship("Credential")


# ── Credentials ───────────────────────────────────────────────────
class Credential(Base):
    """
    Stores encrypted credential values for any auth type.
    credential_values is Fernet-encrypted JSON containing the dynamic fields.
    """
    __tablename__ = "credentials"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("aistudio_users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    auth_type = Column(String(100), nullable=False)       # e.g. "Azure Log Analytics", "Jira", "Groq"
    auth_category = Column(String(100), nullable=False)   # e.g. "Cloud", "ITSM", "API Key"
    description = Column(Text, nullable=True)
    # Fernet-encrypted JSON blob of credential field values
    credential_values = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="credentials")


# ── Documents ─────────────────────────────────────────────────────
class Document(Base):
    __tablename__ = "aistudio_documents"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("aistudio_users.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=True)
    chunk_count = Column(Integer, default=0)
    is_indexed = Column(Boolean, default=False)
    collection_name = Column(String(255), nullable=True)  # ChromaDB collection
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="documents")


# ── Workflows ─────────────────────────────────────────────────────
class Workflow(Base):
    __tablename__ = "aistudio_workflows"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("aistudio_users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    # React Flow node/edge definition
    definition = Column(JSON, nullable=False, default=dict)
    schedule_cron = Column(String(100), nullable=True)   # e.g. "0 9 * * *"
    is_active = Column(Boolean, default=True)
    last_run_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="workflows")
    runs = relationship("WorkflowRun", back_populates="workflow", cascade="all, delete-orphan")


# ── Agent Runs ────────────────────────────────────────────────────
class AgentRun(Base):
    __tablename__ = "aistudio_agent_runs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    agent_id = Column(UUID(as_uuid=False), ForeignKey("aistudio_agents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=False), ForeignKey("aistudio_users.id", ondelete="SET NULL"), nullable=True)
    input_text = Column(Text, nullable=False)
    output_text = Column(Text, nullable=True)
    # Full LangChain execution trace
    execution_trace = Column(JSON, default=list)
    # Skills that were called during this run
    skills_called = Column(JSON, default=list)
    status = Column(String(50), default="pending")   # pending | running | completed | failed
    execution_time_ms = Column(Integer, nullable=True)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    agent = relationship("Agent", back_populates="runs")


# ── Workflow Runs ─────────────────────────────────────────────────
class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    workflow_id = Column(UUID(as_uuid=False), ForeignKey("aistudio_workflows.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="pending")
    execution_trace = Column(JSON, default=list)
    execution_time_ms = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    workflow = relationship("Workflow", back_populates="runs")
