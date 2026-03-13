"""Pydantic request/response schemas for agents."""
from typing import Any, Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SkillBindingCreate(BaseModel):
    skill_id: str
    skill_name: str
    skill_type: Optional[str] = None
    config_json: Optional[Dict[str, Any]] = None
    credential_id: Optional[str] = None


class SkillResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    skill_id: str
    skill_name: str
    skill_type: Optional[str] = None
    config_json: Optional[Dict[str, Any]] = None
    credential_id: Optional[str] = None
    created_at: datetime


class SkillAddRequest(BaseModel):
    skill_name: str
    skill_type: str = ""
    config_json: Optional[Dict[str, Any]] = None


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
    tools: Optional[List[SkillBindingCreate]] = None


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
    skills: List[SkillResponse] = []


class AgentRunRequest(BaseModel):
    input_text: str


class AgentRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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
