"""
Smart Agent Builder API — create agents from natural language descriptions.
The killer feature: describe what you want, get a production-ready agent.

POST /api/agent-builder/generate   — generate agent config from description
POST /api/agent-builder/create     — generate + create in one step
GET  /api/agent-builder/templates  — list pre-built templates
POST /api/agent-builder/from-template — create agent from template
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.db.session import get_db
from app.db.models import Agent, AgentSkillBinding, AgentTemplate
from app.agents.claude_agent import generate_agent_from_description
from app.skills.registry import skill_registry
from app.api.deps import get_current_user

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────
class BuilderRequest(BaseModel):
    description: str
    auto_create: bool = False


class BuilderResponse(BaseModel):
    name: str
    description: str
    system_prompt: str
    model_name: str
    temperature: float
    max_tokens: int
    suggested_skills: list
    tags: list
    icon: str
    agent_id: Optional[str] = None  # Set if auto_create=True


class TemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    category: str
    icon: str
    system_prompt: str
    model_name: str
    temperature: float
    max_tokens: int
    suggested_skills: list
    tags: list
    is_featured: bool
    use_count: int

    class Config:
        from_attributes = True


# ── Generate Agent Config ──────────────────────────────────────
@router.post("/generate", response_model=BuilderResponse)
async def generate_agent(
    payload: BuilderRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Use Claude to generate a complete agent configuration from a description."""
    # Get available skills for context
    all_skills = skill_registry.list_skills()
    available_skills = [
        {"name": name, "description": desc}
        for name, desc in all_skills.items()
    ]

    try:
        config = generate_agent_from_description(payload.description, available_skills)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent generation failed: {str(e)}")

    agent_id = None
    if payload.auto_create:
        agent_id = await _create_agent_from_config(db, current_user.id, config)

    return BuilderResponse(
        name=config.get("name", "New Agent"),
        description=config.get("description", payload.description),
        system_prompt=config.get("system_prompt", "You are a helpful assistant."),
        model_name=config.get("model_name", "claude-sonnet"),
        temperature=config.get("temperature", 0.7),
        max_tokens=config.get("max_tokens", 4096),
        suggested_skills=config.get("suggested_skills", []),
        tags=config.get("tags", []),
        icon=config.get("icon", "bot"),
        agent_id=agent_id,
    )


# ── Generate + Create in One Step ──────────────────────────────
@router.post("/create")
async def create_from_description(
    payload: BuilderRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Generate agent config from description and create it immediately."""
    payload.auto_create = True
    return await generate_agent(payload, db, current_user)


# ── List Templates ─────────────────────────────────────────────
@router.get("/templates", response_model=List[TemplateResponse])
async def list_templates(
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List pre-built agent templates."""
    query = select(AgentTemplate).order_by(desc(AgentTemplate.use_count))
    if category:
        query = query.where(AgentTemplate.category == category)
    result = await db.execute(query)
    templates = result.scalars().all()

    # If no templates in DB, return built-in defaults
    if not templates:
        return _get_default_templates()
    return templates


# ── Create from Template ──────────────────────────────────────
@router.post("/from-template")
async def create_from_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create an agent from a pre-built template."""
    # Check built-in templates first
    defaults = {t["id"]: t for t in _get_default_templates()}
    template_data = defaults.get(template_id)

    if not template_data:
        result = await db.execute(
            select(AgentTemplate).where(AgentTemplate.id == template_id)
        )
        template = result.scalar_one_or_none()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        template_data = {
            "name": template.name,
            "description": template.description,
            "system_prompt": template.system_prompt,
            "model_name": template.model_name,
            "temperature": template.temperature,
            "max_tokens": template.max_tokens,
            "suggested_skills": template.suggested_skills or [],
        }

    agent_id = await _create_agent_from_config(db, current_user.id, template_data)
    return {"agent_id": agent_id, "name": template_data["name"]}


# ── Helpers ──────────────────────────────────────────────────
async def _create_agent_from_config(db: AsyncSession, user_id: str, config: dict) -> str:
    """Create an agent in the database from a config dict."""
    agent = Agent(
        user_id=user_id,
        name=config.get("name", "New Agent"),
        description=config.get("description", ""),
        system_prompt=config.get("system_prompt", "You are a helpful assistant."),
        model_name=config.get("model_name", "claude-sonnet"),
        temperature=config.get("temperature", 0.7),
        max_tokens=config.get("max_tokens", 4096),
        memory_enabled=True,
    )
    db.add(agent)
    await db.flush()

    # Auto-bind suggested skills
    for skill_name in config.get("suggested_skills", []):
        if skill_registry.get(skill_name):
            db.add(AgentSkillBinding(
                agent_id=agent.id,
                skill_id=skill_name,
                skill_name=skill_name,
                skill_type="builtin",
            ))

    await db.commit()
    return agent.id


def _get_default_templates() -> list:
    """Built-in agent templates."""
    return [
        {
            "id": "tpl-devops-assistant",
            "name": "DevOps Assistant",
            "description": "Monitors infrastructure, manages deployments, and troubleshoots issues across Azure and cloud platforms.",
            "category": "devops",
            "icon": "server",
            "system_prompt": """You are a senior DevOps engineer assistant. You help teams manage infrastructure, monitor deployments, and troubleshoot production issues.

Your capabilities:
- Monitor Azure resources, costs, and performance metrics
- Create and manage Jira/ServiceNow tickets for incidents
- Check GitHub repositories and CI/CD pipelines
- Analyze logs and suggest remediation steps
- Generate cost optimization recommendations

Always provide actionable suggestions with specific commands or configurations. When reporting issues, include severity assessment and recommended priority.""",
            "model_name": "claude-sonnet",
            "temperature": 0.3,
            "max_tokens": 4096,
            "suggested_skills": ["azure_cost_summary", "azure_list_vms", "github_create_issue", "jira_create_issue"],
            "tags": ["devops", "infrastructure", "monitoring"],
            "is_featured": True,
            "use_count": 0,
        },
        {
            "id": "tpl-data-analyst",
            "name": "Data Analyst",
            "description": "Analyzes data, runs SQL queries, generates insights, and creates reports from your databases and documents.",
            "category": "data",
            "icon": "bar-chart",
            "system_prompt": """You are an expert data analyst assistant. You help users explore data, generate insights, and create reports.

Your capabilities:
- Execute SQL queries against connected databases
- Analyze datasets and identify trends, outliers, and patterns
- Generate formatted reports with key findings
- Calculate statistics and create data summaries
- Scrape web data when needed for enrichment

Always explain your analysis methodology. Present findings clearly with data to back up conclusions. Suggest follow-up analyses when relevant.""",
            "model_name": "claude-sonnet",
            "temperature": 0.5,
            "max_tokens": 4096,
            "suggested_skills": ["sql_query", "python_execute", "calculator", "web_scraping"],
            "tags": ["data", "analytics", "reporting"],
            "is_featured": True,
            "use_count": 0,
        },
        {
            "id": "tpl-security-auditor",
            "name": "Security Auditor",
            "description": "Audits Microsoft Entra ID configurations, reviews access policies, and identifies security risks.",
            "category": "security",
            "icon": "shield",
            "system_prompt": """You are a cybersecurity auditor assistant specializing in identity and access management. You review and audit security configurations.

Your capabilities:
- Audit Microsoft Entra ID users, groups, and policies
- Review sign-in logs for suspicious activity
- Check group memberships and access permissions
- Identify stale accounts and excessive permissions
- Generate compliance reports

Follow security best practices and zero-trust principles. Flag HIGH/MEDIUM/LOW severity findings. Always recommend specific remediation steps.""",
            "model_name": "claude-sonnet",
            "temperature": 0.2,
            "max_tokens": 4096,
            "suggested_skills": ["entra_list_users", "entra_get_group_members", "entra_audit_logs", "entra_signin_logs"],
            "tags": ["security", "identity", "compliance"],
            "is_featured": True,
            "use_count": 0,
        },
        {
            "id": "tpl-customer-support",
            "name": "Customer Support Agent",
            "description": "Handles customer inquiries, creates support tickets, and escalates issues automatically.",
            "category": "support",
            "icon": "headphones",
            "system_prompt": """You are a professional customer support agent. You handle inquiries with empathy and efficiency.

Your capabilities:
- Answer common questions using knowledge base documents
- Create support tickets in ServiceNow or Jira
- Escalate critical issues to the appropriate team
- Send follow-up emails to customers
- Track and update existing tickets

Be empathetic, professional, and solution-oriented. Always confirm understanding before taking action. Escalate if the issue requires human intervention.""",
            "model_name": "claude-sonnet",
            "temperature": 0.5,
            "max_tokens": 4096,
            "suggested_skills": ["email_send", "servicenow_create_incident", "jira_create_issue", "slack_send_message"],
            "tags": ["support", "customer-service", "ticketing"],
            "is_featured": True,
            "use_count": 0,
        },
        {
            "id": "tpl-research-assistant",
            "name": "Research Assistant",
            "description": "Researches topics across the web and your documents, synthesizes findings, and creates comprehensive reports.",
            "category": "productivity",
            "icon": "search",
            "system_prompt": """You are a thorough research assistant. You help users research topics by gathering, analyzing, and synthesizing information.

Your capabilities:
- Search the web for current information
- Scrape and extract data from web pages
- Query uploaded documents for internal knowledge
- Synthesize findings from multiple sources
- Generate well-structured research reports

Always cite your sources. Present multiple perspectives when relevant. Distinguish between facts and opinions. Structure reports with clear sections and key takeaways.""",
            "model_name": "claude-sonnet",
            "temperature": 0.6,
            "max_tokens": 4096,
            "suggested_skills": ["web_search", "web_scraping", "http_get"],
            "tags": ["research", "productivity", "writing"],
            "is_featured": True,
            "use_count": 0,
        },
        {
            "id": "tpl-cost-optimizer",
            "name": "Cloud Cost Optimizer",
            "description": "Analyzes Azure cloud spending, identifies waste, and recommends cost optimization strategies.",
            "category": "finops",
            "icon": "dollar-sign",
            "system_prompt": """You are a FinOps expert specializing in cloud cost optimization. You analyze spending patterns and recommend savings.

Your capabilities:
- Analyze Azure cost data by service, resource group, and time period
- Identify underutilized resources and right-sizing opportunities
- Track budget status and forecast future spending
- Generate cost optimization recommendations
- Compare spending across periods to identify anomalies

Present findings with specific dollar amounts and percentages. Prioritize recommendations by potential savings. Include implementation difficulty ratings.""",
            "model_name": "claude-sonnet",
            "temperature": 0.3,
            "max_tokens": 4096,
            "suggested_skills": ["azure_cost_summary", "azure_cost_by_service", "azure_budget_status", "azure_cost_forecast", "azure_cost_recommendations"],
            "tags": ["finops", "cost", "azure", "optimization"],
            "is_featured": True,
            "use_count": 0,
        },
    ]
