"""Credentials API - encrypted Microsoft service principal storage."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel, ConfigDict
import msal

from app.db.session import get_db
from app.db.models import Credential
from app.utils.security import encrypt_credentials, decrypt_credentials
from app.api.deps import get_current_user
from datetime import datetime

router = APIRouter()


class CredentialCreate(BaseModel):
    name: str
    credential_type: str  # azure | entra | both
    tenant_id: str
    client_id: str
    client_secret: str
    subscription_id: str = ""


class CredentialResponse(BaseModel):
    id: str
    name: str
    credential_type: str
    is_verified: bool
    last_verified_at: datetime | None
    scopes: list
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


@router.post("/", response_model=CredentialResponse)
async def create_credential(
    payload: CredentialCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create and verify a Microsoft credential via MSAL token fetch."""
    # Determine scopes based on type
    scopes_map = {
        "azure": ["https://management.azure.com/.default"],
        "entra": ["https://graph.microsoft.com/.default"],
        "both": ["https://management.azure.com/.default", "https://graph.microsoft.com/.default"],
    }
    scopes = scopes_map.get(payload.credential_type, ["https://graph.microsoft.com/.default"])

    # Try to fetch token to verify credentials
    is_verified = False
    try:
        app = msal.ConfidentialClientApplication(
            client_id=payload.client_id,
            client_credential=payload.client_secret,
            authority=f"https://login.microsoftonline.com/{payload.tenant_id}",
        )
        result = app.acquire_token_for_client(scopes=scopes[:1])
        is_verified = "access_token" in result
    except Exception:
        is_verified = False

    # Encrypt sensitive data
    sensitive = {
        "tenant_id": payload.tenant_id,
        "client_id": payload.client_id,
        "client_secret": payload.client_secret,
        "subscription_id": payload.subscription_id,
    }
    encrypted = encrypt_credentials(sensitive)

    cred = Credential(
        user_id=current_user.id,
        name=payload.name,
        credential_type=payload.credential_type,
        encrypted_data=encrypted,
        is_verified=is_verified,
        last_verified_at=datetime.utcnow() if is_verified else None,
        scopes=scopes,
    )
    db.add(cred)
    await db.commit()
    await db.refresh(cred)
    return cred


@router.get("/", response_model=List[CredentialResponse])
async def list_credentials(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Credential)
        .where(Credential.user_id == current_user.id)
        .order_by(desc(Credential.created_at))
    )
    return result.scalars().all()


@router.post("/{credential_id}/verify", response_model=CredentialResponse)
async def verify_credential(
    credential_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Re-fetch OAuth2 token to re-verify a credential."""
    result = await db.execute(
        select(Credential).where(Credential.id == credential_id, Credential.user_id == current_user.id)
    )
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(404, "Credential not found")

    decrypted = decrypt_credentials(cred.encrypted_data)
    try:
        app = msal.ConfidentialClientApplication(
            client_id=decrypted["client_id"],
            client_credential=decrypted["client_secret"],
            authority=f"https://login.microsoftonline.com/{decrypted['tenant_id']}",
        )
        result_token = app.acquire_token_for_client(scopes=cred.scopes[:1])
        cred.is_verified = "access_token" in result_token
        cred.last_verified_at = datetime.utcnow()
    except Exception:
        cred.is_verified = False

    await db.commit()
    await db.refresh(cred)
    return cred


CREDENTIAL_TYPES = [
    {
        "category": "Sales & CRM",
        "types": [
            {"key": "hubspot_api_key", "label": "HubSpot API Key", "description": "API key for HubSpot CRM — contacts, deals, pipelines", "link": "https://developers.hubspot.com/docs/api/private-apps", "fields": [{"name": "api_key", "label": "API Key", "type": "password"}]},
            {"key": "salesforce_client_id", "label": "Salesforce Client ID", "description": "OAuth2 Connected App client ID for Salesforce", "link": "https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm", "fields": [{"name": "client_id", "label": "Client ID", "type": "text"}]},
            {"key": "salesforce_client_secret", "label": "Salesforce Client Secret", "description": "OAuth2 Connected App client secret for Salesforce", "link": "https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm", "fields": [{"name": "client_secret", "label": "Client Secret", "type": "password"}]},
            {"key": "linkedin_api_key", "label": "LinkedIn API Key", "description": "LinkedIn Marketing or Sales Navigator API key", "link": "https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access", "fields": [{"name": "api_key", "label": "API Key", "type": "password"}]},
            {"key": "sendgrid_api_key", "label": "SendGrid API Key", "description": "SendGrid transactional email API key for cold outreach", "link": "https://docs.sendgrid.com/ui/account-and-settings/api-keys", "fields": [{"name": "api_key", "label": "API Key", "type": "password"}]},
        ],
    },
    {
        "category": "Finance",
        "types": [
            {"key": "quickbooks_client_id", "label": "QuickBooks Client ID", "description": "Intuit QuickBooks OAuth2 app client ID", "link": "https://developer.intuit.com/app/developer/qbo/docs/get-started", "fields": [{"name": "client_id", "label": "Client ID", "type": "text"}]},
            {"key": "quickbooks_client_secret", "label": "QuickBooks Client Secret", "description": "Intuit QuickBooks OAuth2 app client secret", "link": "https://developer.intuit.com/app/developer/qbo/docs/get-started", "fields": [{"name": "client_secret", "label": "Client Secret", "type": "password"}]},
            {"key": "alpha_vantage_key", "label": "Alpha Vantage API Key", "description": "Free/premium API key for stock prices and financial data", "link": "https://www.alphavantage.co/support/#api-key", "fields": [{"name": "api_key", "label": "API Key", "type": "password"}]},
        ],
    },
    {
        "category": "Dev & IT",
        "types": [
            {"key": "github_token", "label": "GitHub Personal Access Token", "description": "Fine-grained PAT for GitHub repos, PRs, issues", "link": "https://github.com/settings/tokens?type=beta", "fields": [{"name": "token", "label": "Token", "type": "password"}]},
            {"key": "jira_api_token", "label": "Jira API Token", "description": "Atlassian API token for Jira Cloud", "link": "https://id.atlassian.com/manage-profile/security/api-tokens", "fields": [{"name": "api_token", "label": "API Token", "type": "password"}]},
            {"key": "jira_base_url", "label": "Jira Base URL", "description": "Your Jira Cloud instance URL (e.g. https://yourteam.atlassian.net)", "link": "https://confluence.atlassian.com/adminjiraserver/configuring-the-base-url-938847830.html", "fields": [{"name": "base_url", "label": "Base URL", "type": "text"}]},
            {"key": "jira_email", "label": "Jira Account Email", "description": "Email associated with your Atlassian account", "link": "https://id.atlassian.com/manage-profile/security/api-tokens", "fields": [{"name": "email", "label": "Email", "type": "text"}]},
            {"key": "pagerduty_api_key", "label": "PagerDuty API Key", "description": "REST API v2 key for PagerDuty incident management", "link": "https://support.pagerduty.com/docs/api-access-keys", "fields": [{"name": "api_key", "label": "API Key", "type": "password"}]},
        ],
    },
    {
        "category": "Customer Support",
        "types": [
            {"key": "zendesk_api_token", "label": "Zendesk API Token", "description": "API token for Zendesk Support ticketing", "link": "https://support.zendesk.com/hc/en-us/articles/4408889192858", "fields": [{"name": "api_token", "label": "API Token", "type": "password"}]},
            {"key": "zendesk_subdomain", "label": "Zendesk Subdomain", "description": "Your Zendesk subdomain (e.g. yourcompany in yourcompany.zendesk.com)", "link": "https://support.zendesk.com/hc/en-us/articles/4408889192858", "fields": [{"name": "subdomain", "label": "Subdomain", "type": "text"}]},
            {"key": "zendesk_email", "label": "Zendesk Agent Email", "description": "Email of the Zendesk agent for API auth", "link": "https://support.zendesk.com/hc/en-us/articles/4408889192858", "fields": [{"name": "email", "label": "Email", "type": "text"}]},
        ],
    },
    {
        "category": "Marketing",
        "types": [
            {"key": "google_analytics_id", "label": "Google Analytics Measurement ID", "description": "GA4 measurement ID (G-XXXXXXXXXX)", "link": "https://support.google.com/analytics/answer/9539598", "fields": [{"name": "measurement_id", "label": "Measurement ID", "type": "text"}]},
            {"key": "google_service_account_json", "label": "Google Service Account JSON", "description": "Service account key JSON for Google APIs (Analytics, Ads, etc.)", "link": "https://cloud.google.com/iam/docs/creating-managing-service-account-keys", "fields": [{"name": "service_account_json", "label": "Service Account JSON", "type": "textarea"}]},
            {"key": "twitter_api_key", "label": "Twitter/X API Key", "description": "API key for Twitter/X posting and analytics", "link": "https://developer.twitter.com/en/portal/dashboard", "fields": [{"name": "api_key", "label": "API Key", "type": "password"}]},
            {"key": "twitter_api_secret", "label": "Twitter/X API Secret", "description": "API secret for Twitter/X OAuth", "link": "https://developer.twitter.com/en/portal/dashboard", "fields": [{"name": "api_secret", "label": "API Secret", "type": "password"}]},
        ],
    },
    {
        "category": "AI & LLM",
        "types": [
            {"key": "openai_api_key", "label": "OpenAI API Key", "description": "API key for GPT-4, embeddings, DALL-E, etc.", "link": "https://platform.openai.com/api-keys", "fields": [{"name": "api_key", "label": "API Key", "type": "password"}]},
            {"key": "anthropic_api_key", "label": "Anthropic API Key", "description": "API key for Claude models", "link": "https://console.anthropic.com/settings/keys", "fields": [{"name": "api_key", "label": "API Key", "type": "password"}]},
            {"key": "groq_api_key", "label": "Groq API Key", "description": "API key for Groq LPU inference (Llama, Mixtral)", "link": "https://console.groq.com/keys", "fields": [{"name": "api_key", "label": "API Key", "type": "password"}]},
        ],
    },
    {
        "category": "Email & SMTP",
        "types": [
            {"key": "smtp_host", "label": "SMTP Host", "description": "SMTP server hostname (e.g. smtp.gmail.com)", "link": "", "fields": [{"name": "host", "label": "Host", "type": "text"}]},
            {"key": "smtp_port", "label": "SMTP Port", "description": "SMTP server port (587 for TLS, 465 for SSL)", "link": "", "fields": [{"name": "port", "label": "Port", "type": "text"}]},
            {"key": "smtp_user", "label": "SMTP Username", "description": "SMTP login username or email", "link": "", "fields": [{"name": "username", "label": "Username", "type": "text"}]},
            {"key": "smtp_password", "label": "SMTP Password", "description": "SMTP login password or app password", "link": "", "fields": [{"name": "password", "label": "Password", "type": "password"}]},
        ],
    },
]


@router.get("/types")
async def get_credential_types():
    """Return all supported credential types grouped by category."""
    return CREDENTIAL_TYPES


@router.delete("/{credential_id}")
async def delete_credential(
    credential_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Credential).where(Credential.id == credential_id, Credential.user_id == current_user.id)
    )
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(404, "Credential not found")
    await db.delete(cred)
    await db.commit()
    return {"status": "deleted"}
