"""DevOps & ITSM skills — GitHub, ServiceNow, Jira."""
import httpx


def register(registry):
    @registry.register("github_create_issue", "Create a GitHub issue. Input JSON: {repo, title, body?, labels?, token?}")
    def github_create_issue(params: dict) -> dict:
        cred = params.get("_credential", {})
        token = params.get("token") or cred.get("github_token", "")
        headers = {"Accept": "application/vnd.github.v3+json"}
        if token:
            headers["Authorization"] = f"token {token}"
        with httpx.Client(timeout=15) as client:
            resp = client.post(
                f"https://api.github.com/repos/{params['repo']}/issues",
                headers=headers,
                json={"title": params["title"], "body": params.get("body", ""), "labels": params.get("labels", [])},
            )
        return resp.json()

    @registry.register("github_list_prs", "List open GitHub pull requests. Input JSON: {repo, state?, token?}")
    def github_list_prs(params: dict) -> dict:
        cred = params.get("_credential", {})
        token = params.get("token") or cred.get("github_token", "")
        headers = {"Accept": "application/vnd.github.v3+json"}
        if token:
            headers["Authorization"] = f"token {token}"
        with httpx.Client(timeout=15) as client:
            resp = client.get(
                f"https://api.github.com/repos/{params['repo']}/pulls",
                headers=headers,
                params={"state": params.get("state", "open"), "per_page": 20},
            )
        return {"pull_requests": resp.json(), "count": len(resp.json())}

    @registry.register("snow_create_incident", "Create a ServiceNow incident. Input JSON: {shortDesc, description, urgency (1-3), category, assignmentGroup?}")
    def snow_create_incident(params: dict) -> dict:
        cred = params.get("_credential", {})
        instance = cred.get("snow_instance") or params.get("instance", "")
        username = cred.get("snow_username", "")
        password = cred.get("snow_password", "")
        if not instance:
            return {"error": "No ServiceNow instance configured in credential"}
        payload = {
            "short_description": params["shortDesc"],
            "description": params.get("description", ""),
            "urgency": str(params.get("urgency", "3")),
            "category": params.get("category", "software"),
            "assignment_group": params.get("assignmentGroup", ""),
        }
        with httpx.Client(timeout=20) as client:
            resp = client.post(
                f"https://{instance}.service-now.com/api/now/table/incident",
                auth=(username, password),
                json=payload,
                headers={"Content-Type": "application/json", "Accept": "application/json"},
            )
        return resp.json()

    @registry.register("snow_get_incident", "Get a ServiceNow incident by number. Input JSON: {incidentNumber}")
    def snow_get_incident(params: dict) -> dict:
        cred = params.get("_credential", {})
        instance = cred.get("snow_instance", "")
        username, password = cred.get("snow_username", ""), cred.get("snow_password", "")
        with httpx.Client(timeout=15) as client:
            resp = client.get(
                f"https://{instance}.service-now.com/api/now/table/incident",
                auth=(username, password),
                params={"sysparm_query": f"number={params['incidentNumber']}", "sysparm_limit": 1},
                headers={"Accept": "application/json"},
            )
        return resp.json()

    @registry.register("snow_update_incident", "Update a ServiceNow incident. Input JSON: {incidentId, state?, workNotes?, resolution?}")
    def snow_update_incident(params: dict) -> dict:
        cred = params.get("_credential", {})
        instance = cred.get("snow_instance", "")
        username, password = cred.get("snow_username", ""), cred.get("snow_password", "")
        payload = {}
        if params.get("state"): payload["state"] = params["state"]
        if params.get("workNotes"): payload["work_notes"] = params["workNotes"]
        if params.get("resolution"): payload["close_notes"] = params["resolution"]
        with httpx.Client(timeout=15) as client:
            resp = client.patch(
                f"https://{instance}.service-now.com/api/now/table/incident/{params['incidentId']}",
                auth=(username, password), json=payload,
                headers={"Content-Type": "application/json", "Accept": "application/json"},
            )
        return resp.json()

    @registry.register("jira_create_issue", "Create a Jira issue. Input JSON: {project, summary, description?, type?, priority?}")
    def jira_create_issue(params: dict) -> dict:
        cred = params.get("_credential", {})
        base_url = cred.get("jira_base_url") or params.get("base_url", "")
        email = cred.get("jira_email", "")
        api_token = cred.get("jira_api_token", "")
        if not base_url:
            return {"error": "No Jira base URL configured"}
        payload = {
            "fields": {
                "project": {"key": params["project"]},
                "summary": params["summary"],
                "description": {"type": "doc", "version": 1, "content": [{"type": "paragraph", "content": [{"type": "text", "text": params.get("description", "")}]}]},
                "issuetype": {"name": params.get("type", "Story")},
                "priority": {"name": params.get("priority", "Medium")},
            }
        }
        with httpx.Client(timeout=15) as client:
            resp = client.post(
                f"{base_url}/rest/api/3/issue",
                auth=(email, api_token),
                json=payload,
                headers={"Content-Type": "application/json"},
            )
        return resp.json()
