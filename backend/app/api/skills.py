"""Skills API - catalog + user-created custom skills with marketplace."""
import json
import time
import subprocess
import asyncio
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.db.models import CustomSkill, User

router = APIRouter()


# ── Pydantic Schemas ─────────────────────────────────────────────

class SkillCreate(BaseModel):
    skill_name: str
    skill_type: str          # REST API | SQL Query | Python Function | Web Scraper | Custom
    description: str = ""
    icon: str = ""           # emoji like 🔧
    config_json: str = "{}"  # JSON string with skill config
    is_public: bool = False
    test_payload: str = ""

class SkillUpdate(BaseModel):
    skill_name: Optional[str] = None
    description: Optional[str] = None
    config_json: Optional[str] = None
    is_public: Optional[bool] = None
    icon: Optional[str] = None
    test_payload: Optional[str] = None

class SkillTestInput(BaseModel):
    input: str


# ── Helpers ──────────────────────────────────────────────────────

def _bump_version(version: str) -> str:
    """Bump patch version: 1.0.0 -> 1.0.1"""
    parts = version.split(".")
    if len(parts) != 3:
        return "1.0.1"
    parts[2] = str(int(parts[2]) + 1)
    return ".".join(parts)


async def _get_custom_skill_or_404(db: AsyncSession, skill_id: str, user_id: str) -> CustomSkill:
    result = await db.execute(
        select(CustomSkill).where(CustomSkill.id == skill_id, CustomSkill.user_id == user_id)
    )
    skill = result.scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return skill


def _skill_to_dict(skill: CustomSkill, owner_name: str = None) -> dict:
    return {
        "id": skill.id,
        "skill_name": skill.skill_name,
        "skill_type": skill.skill_type,
        "description": skill.description,
        "icon": skill.icon,
        "config_json": skill.config_json,
        "is_custom": skill.is_custom,
        "is_public": skill.is_public,
        "version": skill.version,
        "test_payload": skill.test_payload,
        "install_count": skill.install_count,
        "source_skill_id": skill.source_skill_id,
        "created_at": skill.created_at.isoformat() if skill.created_at else None,
        "updated_at": skill.updated_at.isoformat() if skill.updated_at else None,
        **({"created_by_name": owner_name} if owner_name is not None else {}),
    }


# ── Built-in Skill Catalog ──────────────────────────────────────

SKILL_CATALOG = [
    {
        "id": "cat-entra", "name": "Microsoft Entra ID", "icon": "🏢",
        "credType": "entra",
        "tags": [
            {"tag": "Groups", "skills": [
                {"id": "en01", "name": "entra_create_group", "label": "Create Group", "desc": "Create a Microsoft 365 or Security group", "icon": "👥", "params": ["displayName", "groupType", "description", "mailNickname"]},
                {"id": "en02", "name": "entra_add_user_to_group", "label": "Add User to Group", "desc": "Add a user to an existing group", "icon": "➕", "params": ["groupId", "userId"]},
                {"id": "en03", "name": "entra_remove_user_from_group", "label": "Remove User from Group", "desc": "Remove a user from a group", "icon": "➖", "params": ["groupId", "userId"]},
                {"id": "en04", "name": "entra_list_groups", "label": "List Groups", "desc": "List groups with optional filter", "icon": "📋", "params": ["filter", "top"]},
                {"id": "en05", "name": "entra_get_group_members", "label": "Get Group Members", "desc": "Get all members of a group", "icon": "👁", "params": ["groupId"]},
                {"id": "en06", "name": "entra_delete_group", "label": "Delete Group", "desc": "Delete a group permanently", "icon": "🗑️", "params": ["groupId"]},
            ]},
            {"tag": "Distribution Lists", "skills": [
                {"id": "en07", "name": "entra_create_dl", "label": "Create Distribution List", "desc": "Create a mail-enabled DL", "icon": "📬", "params": ["displayName", "mailNickname", "description"]},
                {"id": "en08", "name": "entra_add_user_to_dl", "label": "Add User to DL", "desc": "Add a user to a Distribution List", "icon": "📩", "params": ["dlId", "userId"]},
                {"id": "en09", "name": "entra_remove_user_from_dl", "label": "Remove User from DL", "desc": "Remove a user from a DL", "icon": "📤", "params": ["dlId", "userId"]},
                {"id": "en10", "name": "entra_list_dl", "label": "List Distribution Lists", "desc": "List all DLs in the tenant", "icon": "📋", "params": ["filter"]},
                {"id": "en11", "name": "entra_get_dl_members", "label": "Get DL Members", "desc": "Get all members of a DL", "icon": "👁", "params": ["dlId"]},
            ]},
            {"tag": "Users", "skills": [
                {"id": "en12", "name": "entra_create_user", "label": "Create User", "desc": "Create a new user in Entra ID", "icon": "👤", "params": ["displayName", "userPrincipalName", "password", "department", "jobTitle"]},
                {"id": "en13", "name": "entra_get_user", "label": "Get User", "desc": "Get user profile by ID or UPN", "icon": "🔍", "params": ["userId"]},
                {"id": "en14", "name": "entra_list_users", "label": "List Users", "desc": "List users with filter", "icon": "📋", "params": ["filter", "top"]},
                {"id": "en15", "name": "entra_disable_user", "label": "Disable User", "desc": "Block sign-in for a user", "icon": "🚫", "params": ["userId"]},
                {"id": "en16", "name": "entra_enable_user", "label": "Enable User", "desc": "Re-enable a disabled user", "icon": "✅", "params": ["userId"]},
                {"id": "en17", "name": "entra_reset_password", "label": "Reset Password", "desc": "Reset a user's password", "icon": "🔐", "params": ["userId", "newPassword", "forceChangeNextLogin"]},
                {"id": "en18", "name": "entra_get_sign_in_logs", "label": "Sign-in Logs", "desc": "Get sign-in activity logs", "icon": "📊", "params": ["userId", "startDate", "endDate"]},
                {"id": "en19", "name": "entra_get_audit_logs", "label": "Audit Logs", "desc": "Get directory audit events", "icon": "🔎", "params": ["category", "startDate", "endDate"]},
            ]},
        ]
    },
    {
        "id": "cat-azure", "name": "Microsoft Azure", "icon": "☁️",
        "credType": "azure",
        "tags": [
            {"tag": "Cost Management", "skills": [
                {"id": "az01", "name": "az_get_cost_summary", "label": "Cost Summary", "desc": "Total Azure spend in a date range", "icon": "💰", "params": ["subscriptionId", "startDate", "endDate"]},
                {"id": "az02", "name": "az_get_cost_by_service", "label": "Cost by Service", "desc": "Break down costs by service", "icon": "📊", "params": ["subscriptionId", "startDate", "endDate"]},
                {"id": "az03", "name": "az_get_budget_status", "label": "Budget Status", "desc": "Current spend vs budget", "icon": "📉", "params": ["subscriptionId"]},
                {"id": "az04", "name": "az_forecast_cost", "label": "Forecast Cost", "desc": "AI-based cost forecast", "icon": "🔮", "params": ["subscriptionId", "forecastDays"]},
                {"id": "az05", "name": "az_get_cost_recommendations", "label": "Cost Recommendations", "desc": "Azure Advisor savings suggestions", "icon": "💡", "params": ["subscriptionId"]},
            ]},
            {"tag": "Cosmos DB", "skills": [
                {"id": "az06", "name": "az_cosmos_list_accounts", "label": "List Cosmos Accounts", "desc": "List all Cosmos DB accounts", "icon": "🌐", "params": ["subscriptionId", "resourceGroup"]},
                {"id": "az07", "name": "az_cosmos_get_usage", "label": "Cosmos Usage", "desc": "RU/s and storage usage", "icon": "📈", "params": ["accountName", "resourceGroup"]},
                {"id": "az08", "name": "az_cosmos_list_databases", "label": "List Cosmos Databases", "desc": "List databases in an account", "icon": "🗄️", "params": ["accountName", "resourceGroup"]},
                {"id": "az09", "name": "az_cosmos_get_metrics", "label": "Cosmos Metrics", "desc": "RU/s, availability, throttling", "icon": "📉", "params": ["accountName", "resourceGroup", "metric"]},
            ]},
            {"tag": "Compute", "skills": [
                {"id": "az10", "name": "az_list_vms", "label": "List VMs", "desc": "List VMs with power state", "icon": "💻", "params": ["subscriptionId", "resourceGroup"]},
                {"id": "az11", "name": "az_get_vm_metrics", "label": "VM Metrics", "desc": "CPU, memory, disk metrics", "icon": "📊", "params": ["vmName", "resourceGroup"]},
                {"id": "az12", "name": "az_list_resource_groups", "label": "List Resource Groups", "desc": "List all resource groups", "icon": "📁", "params": ["subscriptionId"]},
            ]},
            {"tag": "Monitor", "skills": [
                {"id": "az13", "name": "az_list_alerts", "label": "List Alerts", "desc": "Active Azure Monitor alerts", "icon": "🔔", "params": ["subscriptionId", "severity"]},
                {"id": "az14", "name": "az_get_activity_log", "label": "Activity Log", "desc": "Azure activity log for auditing", "icon": "📋", "params": ["subscriptionId", "startTime", "endTime"]},
                {"id": "az15", "name": "az_list_storage_accounts", "label": "List Storage Accounts", "desc": "Azure Storage accounts", "icon": "💾", "params": ["subscriptionId", "resourceGroup"]},
            ]},
        ]
    },
    {
        "id": "cat-web", "name": "Web & APIs", "icon": "🌐",
        "credType": "rest_api",
        "tags": [
            {"tag": "HTTP", "skills": [
                {"id": "wb01", "name": "http_get", "label": "HTTP GET", "desc": "GET request to any endpoint", "icon": "↗️", "params": ["url", "headers", "params"]},
                {"id": "wb02", "name": "http_post", "label": "HTTP POST", "desc": "POST request with JSON body", "icon": "↙️", "params": ["url", "body", "headers"]},
                {"id": "wb03", "name": "web_search", "label": "Web Search", "desc": "Search the internet", "icon": "🔍", "params": ["query", "numResults"]},
                {"id": "wb04", "name": "scrape_url", "label": "Scrape URL", "desc": "Extract content from web pages", "icon": "🕷️", "params": ["url"]},
            ]},
        ]
    },
    {
        "id": "cat-data", "name": "Data & Analytics", "icon": "📊",
        "credType": "generic",
        "tags": [
            {"tag": "Code & Data", "skills": [
                {"id": "da01", "name": "run_sql_query", "label": "SQL Query", "desc": "Execute SQL queries", "icon": "🗄️", "params": ["query", "connection"]},
                {"id": "da02", "name": "run_python", "label": "Run Python", "desc": "Execute Python snippets", "icon": "🐍", "params": ["code", "timeout"]},
                {"id": "da03", "name": "calculate", "label": "Calculator", "desc": "Evaluate math expressions", "icon": "🧮", "params": ["expression"]},
            ]},
        ]
    },
    {
        "id": "cat-comm", "name": "Communication", "icon": "💬",
        "credType": "generic",
        "tags": [
            {"tag": "Messaging", "skills": [
                {"id": "cm01", "name": "send_email", "label": "Send Email", "desc": "Send email via SMTP", "icon": "📧", "params": ["to", "subject", "body"]},
                {"id": "cm02", "name": "slack_post_message", "label": "Slack Message", "desc": "Post to Slack channel", "icon": "💬", "params": ["channel", "message", "webhook_url"]},
                {"id": "cm03", "name": "teams_post_message", "label": "Teams Message", "desc": "Send Teams message", "icon": "💼", "params": ["message", "webhook_url"]},
            ]},
        ]
    },
    {
        "id": "cat-devops", "name": "DevOps & ITSM", "icon": "🔧",
        "credType": "rest_api",
        "tags": [
            {"tag": "DevOps", "skills": [
                {"id": "dv01", "name": "github_create_issue", "label": "GitHub Issue", "desc": "Create a GitHub issue", "icon": "🐙", "params": ["repo", "title", "body", "labels"]},
                {"id": "dv02", "name": "snow_create_incident", "label": "ServiceNow Incident", "desc": "Create an incident", "icon": "🎫", "params": ["shortDesc", "description", "urgency"]},
                {"id": "dv03", "name": "jira_create_issue", "label": "Jira Issue", "desc": "Create a Jira issue", "icon": "📋", "params": ["project", "summary", "type"]},
            ]},
        ]
    },
    # ── NEW CATEGORIES ─────────────────────────────────────────────
    {
        "id": "cat-sales", "name": "Sales & CRM", "icon": "💼",
        "credType": "rest_api",
        "tags": [
            {"tag": "CRM", "skills": [
                {"id": "sl01", "name": "hubspot_contact", "label": "HubSpot Contact", "desc": "Create or update a HubSpot contact with properties", "icon": "🧑‍💼", "params": ["email", "firstName", "lastName", "company", "phone"],
                 "required_credentials": ["HUBSPOT_API_KEY"]},
                {"id": "sl02", "name": "hubspot_deal", "label": "HubSpot Deal", "desc": "Create or update a deal in your HubSpot pipeline", "icon": "🤝", "params": ["dealName", "stage", "amount", "contactEmail"],
                 "required_credentials": ["HUBSPOT_API_KEY"]},
                {"id": "sl03", "name": "salesforce_lead", "label": "Salesforce Lead", "desc": "Create a new lead in Salesforce CRM", "icon": "☁️", "params": ["firstName", "lastName", "email", "company", "status"],
                 "required_credentials": ["SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET"]},
            ]},
            {"tag": "Prospecting", "skills": [
                {"id": "sl04", "name": "linkedin_scraper", "label": "LinkedIn Scraper", "desc": "Scrape public LinkedIn profile data for lead enrichment", "icon": "🔗", "params": ["profileUrl"],
                 "required_credentials": ["LINKEDIN_API_KEY"]},
                {"id": "sl05", "name": "cold_email_sender", "label": "Cold Email Sender", "desc": "Send personalized cold outreach emails via SendGrid", "icon": "📨", "params": ["to", "subject", "body", "templateId"],
                 "required_credentials": ["SENDGRID_API_KEY"]},
                {"id": "sl06", "name": "lead_enrichment", "label": "Lead Enrichment", "desc": "Enrich lead data with company info, social profiles, and firmographics", "icon": "🔍", "params": ["email", "domain"],
                 "required_credentials": []},
            ]},
        ]
    },
    {
        "id": "cat-finance", "name": "Finance", "icon": "💰",
        "credType": "rest_api",
        "tags": [
            {"tag": "Market Data", "skills": [
                {"id": "fn01", "name": "stock_price_fetcher", "label": "Stock Price Fetcher", "desc": "Fetch real-time and historical stock prices from Alpha Vantage", "icon": "📈", "params": ["symbol", "interval"],
                 "required_credentials": ["ALPHA_VANTAGE_KEY"]},
                {"id": "fn02", "name": "currency_converter", "label": "Currency Converter", "desc": "Convert between currencies using live exchange rates", "icon": "💱", "params": ["from", "to", "amount"],
                 "required_credentials": ["ALPHA_VANTAGE_KEY"]},
            ]},
            {"tag": "Accounting", "skills": [
                {"id": "fn03", "name": "invoice_parser", "label": "Invoice Parser", "desc": "Extract structured data from PDF/image invoices using OCR", "icon": "🧾", "params": ["fileUrl"],
                 "required_credentials": []},
                {"id": "fn04", "name": "quickbooks_sync", "label": "QuickBooks Sync", "desc": "Sync invoices, expenses, and payments with QuickBooks Online", "icon": "📗", "params": ["entity", "action", "data"],
                 "required_credentials": ["QUICKBOOKS_CLIENT_ID", "QUICKBOOKS_CLIENT_SECRET"]},
                {"id": "fn05", "name": "expense_categorizer", "label": "Expense Categorizer", "desc": "Automatically categorize expenses using AI classification", "icon": "🏷️", "params": ["description", "amount", "vendor"],
                 "required_credentials": []},
                {"id": "fn06", "name": "pdf_report_generator", "label": "PDF Report Generator", "desc": "Generate formatted PDF financial reports from structured data", "icon": "📄", "params": ["title", "data", "template"],
                 "required_credentials": []},
            ]},
        ]
    },
    {
        "id": "cat-hr", "name": "HR & Recruiting", "icon": "👥",
        "credType": "rest_api",
        "tags": [
            {"tag": "Recruiting", "skills": [
                {"id": "hr01", "name": "resume_parser", "label": "Resume Parser", "desc": "Extract structured data from resumes (PDF/DOCX) — name, skills, experience", "icon": "📄", "params": ["fileUrl"],
                 "required_credentials": []},
                {"id": "hr02", "name": "job_poster", "label": "Job Poster", "desc": "Post job listings to multiple job boards simultaneously", "icon": "📢", "params": ["title", "description", "location", "salary", "boards"],
                 "required_credentials": ["SENDGRID_API_KEY"]},
                {"id": "hr03", "name": "interview_question_generator", "label": "Interview Question Generator", "desc": "Generate role-specific interview questions using AI", "icon": "❓", "params": ["role", "level", "skills", "count"],
                 "required_credentials": []},
                {"id": "hr04", "name": "candidate_scorer", "label": "Candidate Scorer", "desc": "Score and rank candidates against job requirements using AI", "icon": "⭐", "params": ["resumeData", "jobRequirements"],
                 "required_credentials": []},
            ]},
            {"tag": "Onboarding", "skills": [
                {"id": "hr05", "name": "onboarding_emailer", "label": "Onboarding Emailer", "desc": "Send automated onboarding email sequences to new hires", "icon": "✉️", "params": ["employeeName", "email", "startDate", "role", "manager"],
                 "required_credentials": ["SENDGRID_API_KEY"]},
            ]},
        ]
    },
    {
        "id": "cat-marketing", "name": "Marketing", "icon": "📣",
        "credType": "rest_api",
        "tags": [
            {"tag": "Content", "skills": [
                {"id": "mk01", "name": "seo_content_writer", "label": "SEO Content Writer", "desc": "Generate SEO-optimized blog posts and articles with target keywords", "icon": "✍️", "params": ["topic", "keywords", "wordCount", "tone"],
                 "required_credentials": []},
                {"id": "mk02", "name": "ad_copy_generator", "label": "Ad Copy Generator", "desc": "Generate ad copy for Google Ads, Facebook Ads, and LinkedIn", "icon": "📝", "params": ["product", "audience", "platform", "cta"],
                 "required_credentials": []},
            ]},
            {"tag": "Distribution", "skills": [
                {"id": "mk03", "name": "social_media_poster", "label": "Social Media Poster", "desc": "Post content to Twitter/X with scheduling support", "icon": "📱", "params": ["content", "platform", "scheduledTime"],
                 "required_credentials": ["TWITTER_API_KEY", "TWITTER_API_SECRET"]},
                {"id": "mk04", "name": "google_analytics_reader", "label": "Google Analytics Reader", "desc": "Read website traffic, page views, and conversion data from GA4", "icon": "📊", "params": ["propertyId", "startDate", "endDate", "metrics"],
                 "required_credentials": ["GOOGLE_ANALYTICS_ID", "GOOGLE_SERVICE_ACCOUNT_JSON"]},
                {"id": "mk05", "name": "newsletter_sender", "label": "Newsletter Sender", "desc": "Send HTML newsletters to subscriber lists via SendGrid", "icon": "📰", "params": ["listId", "subject", "htmlContent"],
                 "required_credentials": ["SENDGRID_API_KEY"]},
            ]},
        ]
    },
    {
        "id": "cat-devit", "name": "Dev & IT", "icon": "💻",
        "credType": "rest_api",
        "tags": [
            {"tag": "Code Review", "skills": [
                {"id": "di01", "name": "github_pr_reviewer", "label": "GitHub PR Reviewer", "desc": "Fetch PR diffs and generate AI-powered code review comments", "icon": "🔍", "params": ["repo", "prNumber"],
                 "required_credentials": ["GITHUB_TOKEN"]},
                {"id": "di02", "name": "bug_report_analyzer", "label": "Bug Report Analyzer", "desc": "Analyze bug reports and suggest root causes and fixes", "icon": "🐛", "params": ["title", "description", "stackTrace"],
                 "required_credentials": []},
            ]},
            {"tag": "Operations", "skills": [
                {"id": "di03", "name": "log_analyzer", "label": "Log Analyzer", "desc": "Analyze application logs to detect errors, patterns, and anomalies", "icon": "📋", "params": ["logSource", "timeRange", "level"],
                 "required_credentials": []},
                {"id": "di04", "name": "deploy_webhook", "label": "Deploy Webhook", "desc": "Trigger deployment pipelines via webhooks (Vercel, Railway, Render)", "icon": "🚀", "params": ["webhookUrl", "environment", "branch"],
                 "required_credentials": []},
                {"id": "di05", "name": "jira_ticket_creator", "label": "Jira Ticket Creator", "desc": "Create Jira tickets with project, type, priority, and assignee", "icon": "🎫", "params": ["project", "summary", "description", "type", "priority"],
                 "required_credentials": ["JIRA_API_TOKEN", "JIRA_BASE_URL", "JIRA_EMAIL"]},
                {"id": "di06", "name": "pagerduty_alert", "label": "PagerDuty Alert", "desc": "Trigger or resolve PagerDuty incidents for on-call alerting", "icon": "🔔", "params": ["serviceId", "title", "severity", "action"],
                 "required_credentials": ["PAGERDUTY_API_KEY"]},
            ]},
        ]
    },
    {
        "id": "cat-support", "name": "Customer Support", "icon": "🎧",
        "credType": "rest_api",
        "tags": [
            {"tag": "Ticket Management", "skills": [
                {"id": "cs01", "name": "ticket_classifier", "label": "Ticket Classifier", "desc": "Classify support tickets by category, priority, and sentiment using AI", "icon": "🏷️", "params": ["subject", "body"],
                 "required_credentials": []},
                {"id": "cs02", "name": "faq_responder", "label": "FAQ Responder", "desc": "Match customer questions to FAQ entries and generate responses", "icon": "❓", "params": ["question", "knowledgeBase"],
                 "required_credentials": []},
                {"id": "cs03", "name": "zendesk_integration", "label": "Zendesk Integration", "desc": "Create, update, and close Zendesk tickets programmatically", "icon": "🎫", "params": ["action", "ticketId", "subject", "body", "priority"],
                 "required_credentials": ["ZENDESK_API_TOKEN", "ZENDESK_SUBDOMAIN", "ZENDESK_EMAIL"]},
            ]},
            {"tag": "Analysis", "skills": [
                {"id": "cs04", "name": "sentiment_analyzer", "label": "Sentiment Analyzer", "desc": "Analyze customer message sentiment (positive, negative, neutral) with confidence scores", "icon": "😊", "params": ["text"],
                 "required_credentials": []},
                {"id": "cs05", "name": "escalation_handler", "label": "Escalation Handler", "desc": "Detect urgent tickets and auto-escalate to the right team with notifications", "icon": "🚨", "params": ["ticketId", "reason", "team"],
                 "required_credentials": ["SENDGRID_API_KEY"]},
            ]},
        ]
    },
]


# ── Built-in Catalog Endpoints ───────────────────────────────────

@router.get("/catalog")
async def get_skill_catalog(current_user=Depends(get_current_user)):
    return SKILL_CATALOG


@router.get("/list")
async def list_skills_grouped(current_user=Depends(get_current_user)):
    """Return all skills grouped by category."""
    result = []
    for cat in SKILL_CATALOG:
        skills = []
        for tag_group in cat.get("tags", []):
            for skill in tag_group.get("skills", []):
                skills.append({
                    "id": skill["id"],
                    "name": skill["name"],
                    "label": skill["label"],
                    "description": skill["desc"],
                    "icon": skill["icon"],
                    "params": skill.get("params", []),
                    "required_credentials": skill.get("required_credentials", []),
                    "tag": tag_group["tag"],
                })
        result.append({
            "category": cat["name"],
            "category_id": cat["id"],
            "icon": cat["icon"],
            "credType": cat["credType"],
            "skill_count": len(skills),
            "skills": skills,
        })
    return result


# ── Custom Skills CRUD ───────────────────────────────────────────

@router.post("/create")
async def create_custom_skill(
    payload: SkillCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new custom skill."""
    # Validate config_json is valid JSON
    try:
        parsed = json.loads(payload.config_json)
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(status_code=400, detail="config_json must be valid JSON")

    valid_types = {"REST API", "SQL Query", "Python Function", "Web Scraper", "Custom"}
    if payload.skill_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"skill_type must be one of: {', '.join(valid_types)}")

    skill = CustomSkill(
        user_id=current_user.id,
        skill_name=payload.skill_name,
        skill_type=payload.skill_type,
        description=payload.description,
        icon=payload.icon,
        config_json=parsed,
        is_custom=True,
        is_public=payload.is_public,
        test_payload=payload.test_payload,
    )
    db.add(skill)
    await db.commit()
    await db.refresh(skill)
    return _skill_to_dict(skill)


@router.get("/my-skills")
async def list_my_skills(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all custom skills created by current user."""
    result = await db.execute(
        select(CustomSkill)
        .where(CustomSkill.user_id == current_user.id)
        .order_by(desc(CustomSkill.created_at))
    )
    skills = result.scalars().all()
    return [_skill_to_dict(s) for s in skills]


@router.put("/{skill_id}")
async def update_custom_skill(
    skill_id: str,
    payload: SkillUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a custom skill (must be owner)."""
    skill = await _get_custom_skill_or_404(db, skill_id, current_user.id)

    if payload.config_json is not None:
        try:
            parsed = json.loads(payload.config_json)
        except (json.JSONDecodeError, TypeError):
            raise HTTPException(status_code=400, detail="config_json must be valid JSON")
        skill.config_json = parsed

    if payload.skill_name is not None:
        skill.skill_name = payload.skill_name
    if payload.description is not None:
        skill.description = payload.description
    if payload.is_public is not None:
        skill.is_public = payload.is_public
    if payload.icon is not None:
        skill.icon = payload.icon
    if payload.test_payload is not None:
        skill.test_payload = payload.test_payload

    # Bump patch version
    skill.version = _bump_version(skill.version)

    await db.commit()
    await db.refresh(skill)
    return _skill_to_dict(skill)


@router.delete("/{skill_id}")
async def delete_custom_skill(
    skill_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a custom skill (must be owner)."""
    skill = await _get_custom_skill_or_404(db, skill_id, current_user.id)
    await db.delete(skill)
    await db.commit()
    return {"success": True}


# ── Skill Testing ────────────────────────────────────────────────

@router.post("/{skill_id}/test")
async def test_custom_skill(
    skill_id: str,
    payload: SkillTestInput,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Test a custom skill with sample input."""
    skill = await _get_custom_skill_or_404(db, skill_id, current_user.id)
    config = skill.config_json or {}
    start = time.time()
    output = ""
    error = ""
    success = False

    try:
        if skill.skill_type == "REST API":
            url = config.get("url", "")
            method = config.get("method", "GET").upper()
            headers = config.get("headers", {})
            if not url:
                raise ValueError("config_json must include 'url'")
            async with httpx.AsyncClient(timeout=10.0) as client:
                if method == "POST":
                    resp = await client.post(url, headers=headers, content=payload.input)
                elif method == "PUT":
                    resp = await client.put(url, headers=headers, content=payload.input)
                else:
                    resp = await client.get(url, headers=headers, params={"input": payload.input})
                output = resp.text[:2000]
                success = resp.status_code < 400

        elif skill.skill_type == "Python Function":
            code = config.get("code", "")
            if not code:
                raise ValueError("config_json must include 'code'")
            # Run in subprocess with timeout for safety
            proc = await asyncio.create_subprocess_exec(
                "python", "-c", code,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(input=payload.input.encode()),
                    timeout=10.0,
                )
                output = stdout.decode()[:2000]
                if stderr:
                    error = stderr.decode()[:2000]
                success = proc.returncode == 0
            except asyncio.TimeoutError:
                proc.kill()
                error = "Execution timed out (10s limit)"

        elif skill.skill_type == "SQL Query":
            query = config.get("query", "")
            output = f"[Mock SQL Result] Query: {query}\nInput: {payload.input}\nRows returned: 3 (mock)"
            success = True

        elif skill.skill_type == "Web Scraper":
            url = config.get("url", "")
            if not url:
                raise ValueError("config_json must include 'url'")
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                output = resp.text[:500]
                success = resp.status_code < 400

        else:
            output = f"Custom skill executed with input: {payload.input[:200]}"
            success = True

    except Exception as e:
        error = str(e)

    elapsed_ms = int((time.time() - start) * 1000)
    return {
        "success": success,
        "output": output,
        "error": error,
        "execution_time_ms": elapsed_ms,
    }


# ── Marketplace ──────────────────────────────────────────────────

@router.get("/marketplace")
async def list_marketplace_skills(
    type: Optional[str] = Query(None, description="Filter by skill type"),
    search: Optional[str] = Query(None, description="Search by name or description"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all public custom skills (marketplace)."""
    query = select(CustomSkill, User.name.label("owner_name")).join(
        User, CustomSkill.user_id == User.id
    ).where(CustomSkill.is_public == True)

    if type:
        query = query.where(CustomSkill.skill_type == type)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                CustomSkill.skill_name.ilike(pattern),
                CustomSkill.description.ilike(pattern),
            )
        )

    query = query.order_by(desc(CustomSkill.install_count))
    result = await db.execute(query)
    rows = result.all()

    return [
        _skill_to_dict(row.CustomSkill, owner_name=row.owner_name)
        for row in rows
    ]


@router.post("/{skill_id}/install")
async def install_marketplace_skill(
    skill_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Install a public skill from the marketplace to current user's account."""
    # Fetch the source skill (must be public)
    result = await db.execute(
        select(CustomSkill).where(CustomSkill.id == skill_id, CustomSkill.is_public == True)
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Marketplace skill not found")

    # Create a copy for the user
    installed = CustomSkill(
        user_id=current_user.id,
        skill_name=source.skill_name,
        skill_type=source.skill_type,
        description=source.description,
        icon=source.icon,
        config_json=source.config_json,
        is_custom=True,
        is_public=False,
        version=source.version,
        test_payload=source.test_payload,
        source_skill_id=source.id,
    )
    db.add(installed)

    # Increment install count on original
    source.install_count = (source.install_count or 0) + 1

    await db.commit()
    await db.refresh(installed)
    return _skill_to_dict(installed)


# ── Flat list (keep last so /{skill_id} routes match first) ──────

@router.get("/all")
async def list_all_skills(current_user=Depends(get_current_user)):
    """Return flat list of all built-in skills."""
    skills = []
    for cat in SKILL_CATALOG:
        for tag_group in cat.get("tags", []):
            for skill in tag_group.get("skills", []):
                skills.append({**skill, "category": cat["name"], "credType": cat["credType"]})
    return skills
