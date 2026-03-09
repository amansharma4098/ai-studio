"""Pydantic request/response schemas for agents."""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SkillBindingCreate(BaseModel):
    skill_id: str
    skill_name: str
    credential_id: Optional[str] = None


class AgentCreate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    name: str
    description: str = ""
    system_prompt: str
    model_name: str = "llama3"
    temperature: float = 0.7
    max_tokens: int = 2048
    memory_enabled: bool = True
    skill_bindings: List[SkillBindingCreate] = []


class AgentUpdate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    name: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    model_name: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    memory_enabled: Optional[bool] = None


class AgentResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)

    id: str
    name: str
    description: Optional[str]
    system_prompt: str
    model_name: str
    temperature: float
    max_tokens: int
    memory_enabled: bool
    is_active: bool
    created_at: datetime


class AgentRunRequest(BaseModel):
    input_text: str


class AgentRunResponse(BaseModel):
    id: str
    agent_id: str
    input_text: str
    output_text: Optional[str]
    execution_trace: list
    skills_called: list
    status: str
    execution_time_ms: Optional[int]
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
