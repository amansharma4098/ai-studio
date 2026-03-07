"""
Microsoft Entra ID Skills
All operations use Microsoft Graph API with OAuth2 credentials.
Token is fetched via MSAL using client_credentials flow.
"""
import json
import structlog
import httpx
import msal

logger = structlog.get_logger()

GRAPH_BASE = "https://graph.microsoft.com/v1.0"


def _get_graph_token(credential: dict) -> str:
    """Fetch OAuth2 token from Microsoft using client_credentials flow."""
    app = msal.ConfidentialClientApplication(
        client_id=credential["client_id"],
        client_credential=credential["client_secret"],
        authority=f"https://login.microsoftonline.com/{credential['tenant_id']}",
    )
    result = app.acquire_token_for_client(
        scopes=["https://graph.microsoft.com/.default"]
    )
    if "access_token" not in result:
        raise ValueError(f"Token fetch failed: {result.get('error_description', 'unknown error')}")
    return result["access_token"]


def _graph_request(method: str, path: str, credential: dict, body: dict = None) -> dict:
    """Make an authenticated Graph API request."""
    token = _get_graph_token(credential)
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    url = f"{GRAPH_BASE}{path}"
    with httpx.Client(timeout=30) as client:
        if method == "GET":
            resp = client.get(url, headers=headers)
        elif method == "POST":
            resp = client.post(url, headers=headers, json=body)
        elif method == "PATCH":
            resp = client.patch(url, headers=headers, json=body)
        elif method == "DELETE":
            resp = client.delete(url, headers=headers)
        else:
            raise ValueError(f"Unsupported method: {method}")

    if resp.status_code in (200, 201):
        return resp.json() if resp.content else {"status": "success"}
    elif resp.status_code == 204:
        return {"status": "success", "message": "Operation completed"}
    else:
        raise ValueError(f"Graph API error {resp.status_code}: {resp.text[:300]}")


def register(registry):
    # ── Groups ────────────────────────────────────────────────────

    @registry.register(
        "entra_create_group",
        "Create a new Microsoft 365 or Security group in Entra ID. "
        "Input JSON: {displayName, groupType (M365|Security), description, mailNickname}"
    )
    def entra_create_group(params: dict) -> dict:
        cred = params.get("_credential", {})
        body = {
            "displayName": params["displayName"],
            "description": params.get("description", ""),
            "mailNickname": params.get("mailNickname", params["displayName"].replace(" ", "-").lower()),
            "securityEnabled": params.get("groupType", "Security") == "Security",
            "mailEnabled": params.get("groupType", "Security") == "M365",
            "groupTypes": ["Unified"] if params.get("groupType") == "M365" else [],
        }
        return _graph_request("POST", "/groups", cred, body)

    @registry.register(
        "entra_add_user_to_group",
        "Add a user to an existing Entra ID group. Input JSON: {groupId, userId}"
    )
    def entra_add_user_to_group(params: dict) -> dict:
        cred = params.get("_credential", {})
        body = {"@odata.id": f"{GRAPH_BASE}/users/{params['userId']}"}
        return _graph_request("POST", f"/groups/{params['groupId']}/members/$ref", cred, body)

    @registry.register(
        "entra_remove_user_from_group",
        "Remove a user from an Entra ID group. Input JSON: {groupId, userId}"
    )
    def entra_remove_user_from_group(params: dict) -> dict:
        cred = params.get("_credential", {})
        return _graph_request("DELETE", f"/groups/{params['groupId']}/members/{params['userId']}/$ref", cred)

    @registry.register(
        "entra_list_groups",
        "List Entra ID groups with optional filter. Input JSON: {filter?, top?}"
    )
    def entra_list_groups(params: dict) -> dict:
        cred = params.get("_credential", {})
        qs = ""
        if params.get("filter"):
            qs = f"?$filter={params['filter']}"
        if params.get("top"):
            sep = "&" if qs else "?"
            qs += f"{sep}$top={params['top']}"
        return _graph_request("GET", f"/groups{qs}", cred)

    @registry.register(
        "entra_get_group_members",
        "Get all members of an Entra ID group. Input JSON: {groupId}"
    )
    def entra_get_group_members(params: dict) -> dict:
        cred = params.get("_credential", {})
        return _graph_request("GET", f"/groups/{params['groupId']}/members?$select=displayName,userPrincipalName,id", cred)

    @registry.register(
        "entra_delete_group",
        "Delete an Entra ID group permanently. Input JSON: {groupId}"
    )
    def entra_delete_group(params: dict) -> dict:
        cred = params.get("_credential", {})
        return _graph_request("DELETE", f"/groups/{params['groupId']}", cred)

    # ── Distribution Lists ────────────────────────────────────────

    @registry.register(
        "entra_create_dl",
        "Create a mail-enabled Distribution List. Input JSON: {displayName, mailNickname, description?}"
    )
    def entra_create_dl(params: dict) -> dict:
        cred = params.get("_credential", {})
        body = {
            "displayName": params["displayName"],
            "mailNickname": params.get("mailNickname", params["displayName"].replace(" ", "-").lower()),
            "description": params.get("description", ""),
            "mailEnabled": True,
            "securityEnabled": False,
            "groupTypes": [],
        }
        return _graph_request("POST", "/groups", cred, body)

    @registry.register(
        "entra_add_user_to_dl",
        "Add a user to a Distribution List. Input JSON: {dlId, userId}"
    )
    def entra_add_user_to_dl(params: dict) -> dict:
        cred = params.get("_credential", {})
        body = {"@odata.id": f"{GRAPH_BASE}/users/{params['userId']}"}
        return _graph_request("POST", f"/groups/{params['dlId']}/members/$ref", cred, body)

    @registry.register(
        "entra_remove_user_from_dl",
        "Remove a user from a Distribution List. Input JSON: {dlId, userId}"
    )
    def entra_remove_user_from_dl(params: dict) -> dict:
        cred = params.get("_credential", {})
        return _graph_request("DELETE", f"/groups/{params['dlId']}/members/{params['userId']}/$ref", cred)

    @registry.register(
        "entra_list_dl",
        "List all Distribution Lists. Input JSON: {filter?}"
    )
    def entra_list_dl(params: dict) -> dict:
        cred = params.get("_credential", {})
        qs = "?$filter=mailEnabled eq true and securityEnabled eq false"
        if params.get("filter"):
            qs += f" and {params['filter']}"
        return _graph_request("GET", f"/groups{qs}", cred)

    @registry.register(
        "entra_get_dl_members",
        "Get all members of a Distribution List. Input JSON: {dlId}"
    )
    def entra_get_dl_members(params: dict) -> dict:
        cred = params.get("_credential", {})
        return _graph_request("GET", f"/groups/{params['dlId']}/members", cred)

    # ── Users ─────────────────────────────────────────────────────

    @registry.register(
        "entra_create_user",
        "Create a new user in Entra ID. Input JSON: {displayName, userPrincipalName, password, department?, jobTitle?}"
    )
    def entra_create_user(params: dict) -> dict:
        cred = params.get("_credential", {})
        body = {
            "accountEnabled": True,
            "displayName": params["displayName"],
            "userPrincipalName": params["userPrincipalName"],
            "passwordProfile": {
                "forceChangePasswordNextSignIn": True,
                "password": params["password"],
            },
        }
        if params.get("department"):
            body["department"] = params["department"]
        if params.get("jobTitle"):
            body["jobTitle"] = params["jobTitle"]
        return _graph_request("POST", "/users", cred, body)

    @registry.register(
        "entra_get_user",
        "Get a user profile from Entra ID. Input JSON: {userId}"
    )
    def entra_get_user(params: dict) -> dict:
        cred = params.get("_credential", {})
        return _graph_request("GET", f"/users/{params['userId']}", cred)

    @registry.register(
        "entra_list_users",
        "List Entra ID users with optional filter. Input JSON: {filter?, top?}"
    )
    def entra_list_users(params: dict) -> dict:
        cred = params.get("_credential", {})
        qs = "?$select=displayName,userPrincipalName,department,jobTitle,accountEnabled"
        if params.get("filter"):
            qs += f"&$filter={params['filter']}"
        if params.get("top"):
            qs += f"&$top={params['top']}"
        return _graph_request("GET", f"/users{qs}", cred)

    @registry.register(
        "entra_disable_user",
        "Block sign-in for a user account. Input JSON: {userId}"
    )
    def entra_disable_user(params: dict) -> dict:
        cred = params.get("_credential", {})
        return _graph_request("PATCH", f"/users/{params['userId']}", cred, {"accountEnabled": False})

    @registry.register(
        "entra_enable_user",
        "Re-enable a previously disabled user. Input JSON: {userId}"
    )
    def entra_enable_user(params: dict) -> dict:
        cred = params.get("_credential", {})
        return _graph_request("PATCH", f"/users/{params['userId']}", cred, {"accountEnabled": True})

    @registry.register(
        "entra_reset_password",
        "Reset a user password. Input JSON: {userId, newPassword, forceChangeNextLogin?}"
    )
    def entra_reset_password(params: dict) -> dict:
        cred = params.get("_credential", {})
        body = {
            "passwordProfile": {
                "password": params["newPassword"],
                "forceChangePasswordNextSignIn": params.get("forceChangeNextLogin", True),
            }
        }
        return _graph_request("PATCH", f"/users/{params['userId']}", cred, body)

    @registry.register(
        "entra_get_sign_in_logs",
        "Get Entra ID sign-in logs. Input JSON: {userId?, startDate?, endDate?}"
    )
    def entra_get_sign_in_logs(params: dict) -> dict:
        cred = params.get("_credential", {})
        qs = "?$top=50&$orderby=createdDateTime desc"
        if params.get("userId"):
            qs += f"&$filter=userId eq '{params['userId']}'"
        return _graph_request("GET", f"/auditLogs/signIns{qs}", cred)

    @registry.register(
        "entra_get_audit_logs",
        "Get Entra ID audit logs. Input JSON: {category?, startDate?, endDate?}"
    )
    def entra_get_audit_logs(params: dict) -> dict:
        cred = params.get("_credential", {})
        qs = "?$top=50&$orderby=activityDateTime desc"
        if params.get("category"):
            qs += f"&$filter=category eq '{params['category']}'"
        return _graph_request("GET", f"/auditLogs/directoryAudits{qs}", cred)
