"""
Dynamic credential auth types and their field definitions.
Each auth_type maps to a list of fields with key, label, type, and required.
"""

CREDENTIAL_AUTH_TYPES = {
    # ── Cloud ─────────────────────────────────────────────────────────
    "Azure Log Analytics": {
        "category": "Cloud",
        "fields": [
            {"key": "azure_tenant_id", "label": "AZURE TENANT ID", "type": "text", "required": True},
            {"key": "azure_client_id", "label": "AZURE CLIENT ID", "type": "text", "required": True},
            {"key": "client_secret", "label": "CLIENT SECRET", "type": "password", "required": True},
            {"key": "workspace_id", "label": "WORKSPACE ID", "type": "text", "required": True},
        ],
    },
    "Azure DevOps": {
        "category": "Cloud",
        "fields": [
            {"key": "organization_url", "label": "ORGANIZATION URL", "type": "text", "required": True},
            {"key": "personal_access_token", "label": "PERSONAL ACCESS TOKEN", "type": "password", "required": True},
            {"key": "azure_tenant_id", "label": "AZURE TENANT ID", "type": "text", "required": False},
        ],
    },
    "AWS": {
        "category": "Cloud",
        "fields": [
            {"key": "access_key_id", "label": "ACCESS KEY ID", "type": "text", "required": True},
            {"key": "secret_access_key", "label": "SECRET ACCESS KEY", "type": "password", "required": True},
            {"key": "region", "label": "REGION", "type": "text", "required": True},
        ],
    },

    # ── ITSM ──────────────────────────────────────────────────────────
    "ServiceNow": {
        "category": "ITSM",
        "fields": [
            {"key": "instance_url", "label": "INSTANCE URL", "type": "text", "required": True},
            {"key": "username", "label": "USERNAME", "type": "text", "required": True},
            {"key": "password", "label": "PASSWORD", "type": "password", "required": True},
        ],
    },
    "Jira": {
        "category": "ITSM",
        "fields": [
            {"key": "base_url", "label": "BASE URL", "type": "text", "required": True},
            {"key": "email", "label": "EMAIL", "type": "text", "required": True},
            {"key": "api_token", "label": "API TOKEN", "type": "password", "required": True},
        ],
    },
    "Zendesk": {
        "category": "ITSM",
        "fields": [
            {"key": "subdomain", "label": "SUBDOMAIN", "type": "text", "required": True},
            {"key": "email", "label": "EMAIL", "type": "text", "required": True},
            {"key": "api_token", "label": "API TOKEN", "type": "password", "required": True},
        ],
    },

    # ── Database ──────────────────────────────────────────────────────
    "MongoDB": {
        "category": "Database",
        "fields": [
            {"key": "connection_string", "label": "CONNECTION STRING", "type": "password", "required": True},
            {"key": "database_name", "label": "DATABASE NAME", "type": "text", "required": True},
        ],
    },
    "SQL Server": {
        "category": "Database",
        "fields": [
            {"key": "host", "label": "HOST", "type": "text", "required": True},
            {"key": "port", "label": "PORT", "type": "text", "required": True},
            {"key": "database", "label": "DATABASE", "type": "text", "required": True},
            {"key": "username", "label": "USERNAME", "type": "text", "required": True},
            {"key": "password", "label": "PASSWORD", "type": "password", "required": True},
        ],
    },
    "Elasticsearch": {
        "category": "Database",
        "fields": [
            {"key": "host", "label": "HOST", "type": "text", "required": True},
            {"key": "api_key", "label": "API KEY", "type": "password", "required": True},
            {"key": "index", "label": "INDEX", "type": "text", "required": False},
        ],
    },
    "Redis": {
        "category": "Database",
        "fields": [
            {"key": "host", "label": "HOST", "type": "text", "required": True},
            {"key": "port", "label": "PORT", "type": "text", "required": True},
            {"key": "password", "label": "PASSWORD", "type": "password", "required": False},
        ],
    },

    # ── Monitoring ────────────────────────────────────────────────────
    "SentinelOne": {
        "category": "Monitoring",
        "fields": [
            {"key": "api_url", "label": "API URL", "type": "text", "required": True},
            {"key": "api_token", "label": "API TOKEN", "type": "password", "required": True},
        ],
    },
    "N-Central": {
        "category": "Monitoring",
        "fields": [
            {"key": "server_url", "label": "SERVER URL", "type": "text", "required": True},
            {"key": "api_key", "label": "API KEY", "type": "password", "required": True},
        ],
    },

    # ── Analytics ─────────────────────────────────────────────────────
    "Power BI": {
        "category": "Analytics",
        "fields": [
            {"key": "azure_tenant_id", "label": "AZURE TENANT ID", "type": "text", "required": True},
            {"key": "client_id", "label": "CLIENT ID", "type": "text", "required": True},
            {"key": "client_secret", "label": "CLIENT SECRET", "type": "password", "required": True},
            {"key": "workspace_id", "label": "WORKSPACE ID", "type": "text", "required": True},
        ],
    },

    # ── API Key ───────────────────────────────────────────────────────
    "Groq": {
        "category": "API Key",
        "fields": [
            {"key": "api_key", "label": "API KEY", "type": "password", "required": True},
        ],
    },
    "OpenAI": {
        "category": "API Key",
        "fields": [
            {"key": "api_key", "label": "API KEY", "type": "password", "required": True},
        ],
    },
    "Anthropic": {
        "category": "API Key",
        "fields": [
            {"key": "api_key", "label": "API KEY", "type": "password", "required": True},
        ],
    },
    "HubSpot": {
        "category": "API Key",
        "fields": [
            {"key": "api_key", "label": "API KEY", "type": "password", "required": True},
            {"key": "portal_id", "label": "PORTAL ID", "type": "text", "required": True},
        ],
    },
    "Salesforce": {
        "category": "API Key",
        "fields": [
            {"key": "client_id", "label": "CLIENT ID", "type": "text", "required": True},
            {"key": "client_secret", "label": "CLIENT SECRET", "type": "password", "required": True},
            {"key": "instance_url", "label": "INSTANCE URL", "type": "text", "required": True},
        ],
    },
    "Api-Key": {
        "category": "API Key",
        "fields": [
            {"key": "api_key", "label": "API KEY", "type": "password", "required": True},
            {"key": "base_url", "label": "BASE URL", "type": "text", "required": False},
        ],
    },
}
