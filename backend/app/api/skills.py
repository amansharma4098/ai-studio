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
