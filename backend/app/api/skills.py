"""Skills API - returns the full skill catalog to the frontend."""
from fastapi import APIRouter, Depends
from app.api.deps import get_current_user

router = APIRouter()

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


@router.get("/catalog")
async def get_skill_catalog(current_user=Depends(get_current_user)):
    return SKILL_CATALOG


@router.get("/")
async def list_installed_skills(current_user=Depends(get_current_user)):
    """Return flat list of all available skills."""
    skills = []
    for cat in SKILL_CATALOG:
        for tag_group in cat.get("tags", []):
            for skill in tag_group.get("skills", []):
                skills.append({**skill, "category": cat["name"], "credType": cat["credType"]})
    return skills


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
