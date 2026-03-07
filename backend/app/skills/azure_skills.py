"""
Microsoft Azure Skills
Uses Azure Management API (management.azure.com) with OAuth2 client credentials.
Covers: Cost Management, Cosmos DB, SQL, Redis, Compute, Monitor, Storage.
"""
import json
from datetime import datetime, timedelta
import structlog
import httpx
import msal

logger = structlog.get_logger()

ARM_BASE = "https://management.azure.com"
ARM_API_VERSIONS = {
    "costmanagement": "2023-03-01",
    "compute": "2024-03-01",
    "monitor": "2023-10-01",
    "documentdb": "2024-02-15-preview",
    "sql": "2023-05-01-preview",
    "storage": "2023-05-01",
    "redis": "2023-08-01",
    "advisor": "2023-01-01",
    "resources": "2021-04-01",
}


def _get_arm_token(credential: dict) -> str:
    """Fetch OAuth2 token for Azure Management API."""
    app = msal.ConfidentialClientApplication(
        client_id=credential["client_id"],
        client_credential=credential["client_secret"],
        authority=f"https://login.microsoftonline.com/{credential['tenant_id']}",
    )
    result = app.acquire_token_for_client(
        scopes=["https://management.azure.com/.default"]
    )
    if "access_token" not in result:
        raise ValueError(f"Azure token fetch failed: {result.get('error_description')}")
    return result["access_token"]


def _arm_get(path: str, credential: dict, api_version: str) -> dict:
    token = _get_arm_token(credential)
    url = f"{ARM_BASE}{path}?api-version={api_version}"
    with httpx.Client(timeout=30) as client:
        resp = client.get(url, headers={"Authorization": f"Bearer {token}"})
    if resp.status_code == 200:
        return resp.json()
    raise ValueError(f"ARM GET error {resp.status_code}: {resp.text[:300]}")


def _arm_post(path: str, body: dict, credential: dict, api_version: str) -> dict:
    token = _get_arm_token(credential)
    url = f"{ARM_BASE}{path}?api-version={api_version}"
    with httpx.Client(timeout=30) as client:
        resp = client.post(url, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}, json=body)
    if resp.status_code in (200, 201, 202):
        return resp.json() if resp.content else {"status": "accepted"}
    raise ValueError(f"ARM POST error {resp.status_code}: {resp.text[:300]}")


def register(registry):
    # ── Cost Management ───────────────────────────────────────────

    @registry.register(
        "az_get_cost_summary",
        "Get total Azure cost for a subscription in a date range. "
        "Input JSON: {subscriptionId, startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)}"
    )
    def az_get_cost_summary(params: dict) -> dict:
        cred = params.get("_credential", {})
        sub = params.get("subscriptionId", cred.get("subscription_id", ""))
        start = params.get("startDate", (datetime.utcnow().replace(day=1)).strftime("%Y-%m-%d"))
        end = params.get("endDate", datetime.utcnow().strftime("%Y-%m-%d"))
        scope = f"/subscriptions/{sub}"
        body = {
            "type": "ActualCost",
            "dataSet": {
                "granularity": "None",
                "aggregation": {"totalCost": {"name": "Cost", "function": "Sum"}},
            },
            "timeframe": "Custom",
            "timePeriod": {"from": f"{start}T00:00:00Z", "to": f"{end}T23:59:59Z"},
        }
        return _arm_post(f"{scope}/providers/Microsoft.CostManagement/query", body, cred, "2023-03-01")

    @registry.register(
        "az_get_cost_by_service",
        "Break down Azure costs by service category. "
        "Input JSON: {subscriptionId, startDate, endDate}"
    )
    def az_get_cost_by_service(params: dict) -> dict:
        cred = params.get("_credential", {})
        sub = params.get("subscriptionId", cred.get("subscription_id", ""))
        start = params.get("startDate", datetime.utcnow().replace(day=1).strftime("%Y-%m-%d"))
        end = params.get("endDate", datetime.utcnow().strftime("%Y-%m-%d"))
        scope = f"/subscriptions/{sub}"
        body = {
            "type": "ActualCost",
            "dataSet": {
                "granularity": "None",
                "aggregation": {"totalCost": {"name": "Cost", "function": "Sum"}},
                "grouping": [{"type": "Dimension", "name": "ServiceName"}],
            },
            "timeframe": "Custom",
            "timePeriod": {"from": f"{start}T00:00:00Z", "to": f"{end}T23:59:59Z"},
        }
        return _arm_post(f"{scope}/providers/Microsoft.CostManagement/query", body, cred, "2023-03-01")

    @registry.register(
        "az_get_budget_status",
        "Get Azure budget vs actual spend. Input JSON: {subscriptionId}"
    )
    def az_get_budget_status(params: dict) -> dict:
        cred = params.get("_credential", {})
        sub = params.get("subscriptionId", cred.get("subscription_id", ""))
        return _arm_get(f"/subscriptions/{sub}/providers/Microsoft.Consumption/budgets", cred, "2023-05-01")

    @registry.register(
        "az_forecast_cost",
        "Get Azure cost forecast for next N days. Input JSON: {subscriptionId, forecastDays (30|60|90)}"
    )
    def az_forecast_cost(params: dict) -> dict:
        cred = params.get("_credential", {})
        sub = params.get("subscriptionId", cred.get("subscription_id", ""))
        days = int(params.get("forecastDays", 30))
        start = datetime.utcnow().strftime("%Y-%m-%d")
        end = (datetime.utcnow() + timedelta(days=days)).strftime("%Y-%m-%d")
        scope = f"/subscriptions/{sub}"
        body = {
            "type": "Usage",
            "dataSet": {
                "granularity": "Daily",
                "aggregation": {"totalCost": {"name": "Cost", "function": "Sum"}},
            },
            "timeframe": "Custom",
            "timePeriod": {"from": f"{start}T00:00:00Z", "to": f"{end}T23:59:59Z"},
            "includeActualCost": False,
            "includeFreshPartialCost": False,
        }
        return _arm_post(f"{scope}/providers/Microsoft.CostManagement/forecast", body, cred, "2023-03-01")

    @registry.register(
        "az_get_cost_recommendations",
        "Get Azure Advisor cost optimization recommendations. Input JSON: {subscriptionId}"
    )
    def az_get_cost_recommendations(params: dict) -> dict:
        cred = params.get("_credential", {})
        sub = params.get("subscriptionId", cred.get("subscription_id", ""))
        return _arm_get(
            f"/subscriptions/{sub}/providers/Microsoft.Advisor/recommendations?$filter=category eq 'Cost'",
            cred, "2023-01-01"
        )

    # ── Cosmos DB ─────────────────────────────────────────────────

    @registry.register(
        "az_cosmos_list_accounts",
        "List all Cosmos DB accounts. Input JSON: {subscriptionId, resourceGroup?}"
    )
    def az_cosmos_list_accounts(params: dict) -> dict:
        cred = params.get("_credential", {})
        sub = params.get("subscriptionId", cred.get("subscription_id", ""))
        rg = params.get("resourceGroup")
        path = (f"/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.DocumentDB/databaseAccounts"
                if rg else f"/subscriptions/{sub}/providers/Microsoft.DocumentDB/databaseAccounts")
        return _arm_get(path, cred, "2024-02-15-preview")

    @registry.register(
        "az_cosmos_get_usage",
        "Get Cosmos DB RU/s and storage usage. Input JSON: {accountName, resourceGroup}"
    )
    def az_cosmos_get_usage(params: dict) -> dict:
        cred = params.get("_credential", {})
        sub = params.get("subscriptionId", cred.get("subscription_id", ""))
        rg = params["resourceGroup"]
        acct = params["accountName"]
        return _arm_get(
            f"/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.DocumentDB/databaseAccounts/{acct}/usages",
            cred, "2024-02-15-preview"
        )

    @registry.register(
        "az_cosmos_list_databases",
        "List all databases in a Cosmos DB account. Input JSON: {accountName, resourceGroup}"
    )
    def az_cosmos_list_databases(params: dict) -> dict:
        cred = params.get("_credential", {})
        sub = params.get("subscriptionId", cred.get("subscription_id", ""))
        rg = params["resourceGroup"]
        acct = params["accountName"]
        return _arm_get(
            f"/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.DocumentDB/databaseAccounts/{acct}/sqlDatabases",
            cred, "2024-02-15-preview"
        )

    @registry.register(
        "az_cosmos_get_metrics",
        "Get Cosmos DB metrics (RU/s, throttling, latency). Input JSON: {accountName, resourceGroup, metric, startTime?, endTime?}"
    )
    def az_cosmos_get_metrics(params: dict) -> dict:
        cred = params.get("_credential", {})
        sub = params.get("subscriptionId", cred.get("subscription_id", ""))
        rg = params["resourceGroup"]
        acct = params["accountName"]
        metric = params.get("metric", "TotalRequestUnits")
        start = params.get("startTime", (datetime.utcnow() - timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%SZ"))
        end = params.get("endTime", datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"))
        resource_id = f"/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.DocumentDB/databaseAccounts/{acct}"
        return _arm_get(
            f"{resource_id}/providers/microsoft.insights/metrics?metricnames={metric}&timespan={start}/{end}&interval=PT1H",
            cred, "2023-10-01"
        )

    # ── Compute & VMs ─────────────────────────────────────────────

    @registry.register(
        "az_list_vms",
        "List all Azure VMs with power state. Input JSON: {subscriptionId, resourceGroup?}"
    )
    def az_list_vms(params: dict) -> dict:
        cred = params.get("_credential", {})
        sub = params.get("subscriptionId", cred.get("subscription_id", ""))
        rg = params.get("resourceGroup")
        path = (f"/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Compute/virtualMachines"
                if rg else f"/subscriptions/{sub}/providers/Microsoft.Compute/virtualMachines")
        return _arm_get(path, cred, "2024-03-01")

    @registry.register(
        "az_list_resource_groups",
        "List all resource groups in a subscription. Input JSON: {subscriptionId}"
    )
    def az_list_resource_groups(params: dict) -> dict:
        cred = params.get("_credential", {})
        sub = params.get("subscriptionId", cred.get("subscription_id", ""))
        return _arm_get(f"/subscriptions/{sub}/resourcegroups", cred, "2021-04-01")

    @registry.register(
        "az_get_vm_metrics",
        "Get VM CPU, memory, disk metrics. Input JSON: {vmName, resourceGroup, subscriptionId}"
    )
    def az_get_vm_metrics(params: dict) -> dict:
        cred = params.get("_credential", {})
        sub = params.get("subscriptionId", cred.get("subscription_id", ""))
        rg = params["resourceGroup"]
        vm = params["vmName"]
        resource_id = f"/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Compute/virtualMachines/{vm}"
        start = (datetime.utcnow() - timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%SZ")
        end = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        return _arm_get(
            f"{resource_id}/providers/microsoft.insights/metrics?metricnames=Percentage CPU,Available Memory Bytes&timespan={start}/{end}&interval=PT1H",
            cred, "2023-10-01"
        )

    # ── Monitor & Alerts ──────────────────────────────────────────

    @registry.register(
        "az_list_alerts",
        "List active Azure Monitor alerts. Input JSON: {subscriptionId, severity?}"
    )
    def az_list_alerts(params: dict) -> dict:
        cred = params.get("_credential", {})
        sub = params.get("subscriptionId", cred.get("subscription_id", ""))
        qs = ""
        if params.get("severity"):
            qs = f"?$filter=properties/essentials/severity eq '{params['severity']}'"
        return _arm_get(f"/subscriptions/{sub}/providers/Microsoft.AlertsManagement/alerts{qs}", cred, "2023-07-12-preview")

    @registry.register(
        "az_get_activity_log",
        "Get Azure activity logs for auditing. Input JSON: {subscriptionId, startTime?, endTime?, resourceGroup?}"
    )
    def az_get_activity_log(params: dict) -> dict:
        cred = params.get("_credential", {})
        sub = params.get("subscriptionId", cred.get("subscription_id", ""))
        start = params.get("startTime", (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ"))
        end = params.get("endTime", datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"))
        qs = f"?$filter=eventTimestamp ge '{start}' and eventTimestamp le '{end}'"
        if params.get("resourceGroup"):
            qs += f" and resourceGroupName eq '{params['resourceGroup']}'"
        return _arm_get(f"/subscriptions/{sub}/providers/microsoft.insights/eventtypes/management/values{qs}", cred, "2015-04-01")

    # ── Storage ───────────────────────────────────────────────────

    @registry.register(
        "az_list_storage_accounts",
        "List Azure Storage accounts. Input JSON: {subscriptionId, resourceGroup?}"
    )
    def az_list_storage_accounts(params: dict) -> dict:
        cred = params.get("_credential", {})
        sub = params.get("subscriptionId", cred.get("subscription_id", ""))
        rg = params.get("resourceGroup")
        path = (f"/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts"
                if rg else f"/subscriptions/{sub}/providers/Microsoft.Storage/storageAccounts")
        return _arm_get(path, cred, "2023-05-01")
