"""Web, Data, Communication and DevOps skills."""
import json
import subprocess
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import httpx
import structlog

logger = structlog.get_logger()


# ── Web Skills ────────────────────────────────────────────────────
def register(registry):
    pass


def register(registry_web):
    @registry_web.register("http_get", "Make an HTTP GET request. Input JSON: {url, headers?, params?}")
    def http_get(params: dict) -> dict:
        with httpx.Client(timeout=30) as client:
            resp = client.get(params["url"], headers=params.get("headers", {}), params=params.get("params", {}))
        return {"status_code": resp.status_code, "body": resp.text[:2000]}

    @registry_web.register("http_post", "Make an HTTP POST request. Input JSON: {url, body, headers?}")
    def http_post(params: dict) -> dict:
        with httpx.Client(timeout=30) as client:
            resp = client.post(params["url"], json=params.get("body", {}), headers=params.get("headers", {}))
        return {"status_code": resp.status_code, "body": resp.text[:2000]}

    @registry_web.register("web_search", "Search the web for current information. Input JSON: {query, numResults?}")
    def web_search(params: dict) -> dict:
        # Uses DuckDuckGo instant answers API (free, no key)
        with httpx.Client(timeout=15) as client:
            resp = client.get("https://api.duckduckgo.com/", params={"q": params["query"], "format": "json", "no_html": 1})
        data = resp.json()
        return {
            "abstract": data.get("Abstract", ""),
            "source": data.get("AbstractSource", ""),
            "url": data.get("AbstractURL", ""),
            "related": [r.get("Text", "") for r in data.get("RelatedTopics", [])[:5]],
        }

    @registry_web.register("scrape_url", "Scrape a web page for content. Input JSON: {url}")
    def scrape_url(params: dict) -> dict:
        with httpx.Client(timeout=20, follow_redirects=True) as client:
            resp = client.get(params["url"], headers={"User-Agent": "Mozilla/5.0"})
        return {"status_code": resp.status_code, "content": resp.text[:3000], "url": str(resp.url)}


# ── Data Skills ───────────────────────────────────────────────────
def register(registry_data):
    @registry_data.register("run_sql_query", "Execute a SQL query. Input JSON: {query, connection}")
    def run_sql_query(params: dict) -> dict:
        # In production: use sqlalchemy + connection string from params
        return {"result": "SQL execution requires a configured database connection", "query": params.get("query", "")}

    @registry_data.register("run_python", "Execute a Python code snippet. Input JSON: {code, timeout?}")
    def run_python(params: dict) -> dict:
        code = params.get("code", "")
        timeout = min(int(params.get("timeout", 10)), 30)
        try:
            result = subprocess.run(
                ["python3", "-c", code],
                capture_output=True, text=True, timeout=timeout
            )
            return {"stdout": result.stdout[:1000], "stderr": result.stderr[:500], "returncode": result.returncode}
        except subprocess.TimeoutExpired:
            return {"error": f"Execution timed out after {timeout}s"}
        except Exception as e:
            return {"error": str(e)}

    @registry_data.register("calculate", "Evaluate a mathematical expression. Input JSON: {expression}")
    def calculate(params: dict) -> dict:
        import ast
        try:
            # Safe eval for math expressions
            tree = ast.parse(params["expression"], mode="eval")
            result = eval(compile(tree, "<string>", "eval"), {"__builtins__": {}})
            return {"result": result, "expression": params["expression"]}
        except Exception as e:
            return {"error": str(e)}


# ── Communication Skills ──────────────────────────────────────────
def register(registry_comm):
    @registry_comm.register("send_email", "Send an email. Input JSON: {to, subject, body, smtp_host?, smtp_port?, from_email?}")
    def send_email(params: dict) -> dict:
        cred = params.get("_credential", {})
        msg = MIMEMultipart()
        msg["From"] = params.get("from_email", cred.get("from_email", "noreply@example.com"))
        msg["To"] = params["to"]
        msg["Subject"] = params["subject"]
        msg.attach(MIMEText(params["body"], "html" if "<" in params["body"] else "plain"))
        try:
            with smtplib.SMTP(params.get("smtp_host", "localhost"), int(params.get("smtp_port", 25))) as server:
                server.sendmail(msg["From"], params["to"], msg.as_string())
            return {"status": "sent", "to": params["to"], "subject": params["subject"]}
        except Exception as e:
            return {"error": str(e)}

    @registry_comm.register("slack_post_message", "Post a message to Slack. Input JSON: {channel, message, webhook_url?}")
    def slack_post_message(params: dict) -> dict:
        cred = params.get("_credential", {})
        webhook = params.get("webhook_url", cred.get("webhook_url", ""))
        if not webhook:
            return {"error": "No Slack webhook URL configured"}
        with httpx.Client(timeout=10) as client:
            resp = client.post(webhook, json={"channel": params.get("channel", "#general"), "text": params["message"]})
        return {"status": "ok" if resp.status_code == 200 else "error", "response": resp.text}

    @registry_comm.register("teams_post_message", "Post a message to Microsoft Teams. Input JSON: {message, webhook_url?}")
    def teams_post_message(params: dict) -> dict:
        cred = params.get("_credential", {})
        webhook = params.get("webhook_url", cred.get("webhook_url", ""))
        if not webhook:
            return {"error": "No Teams webhook URL configured"}
        body = {"@type": "MessageCard", "@context": "http://schema.org/extensions", "text": params["message"]}
        with httpx.Client(timeout=10) as client:
            resp = client.post(webhook, json=body)
        return {"status": "ok" if resp.status_code == 200 else "error"}


# ── DevOps Skills ─────────────────────────────────────────────────
def register(registry_devops):
    @registry_devops.register("github_create_issue", "Create a GitHub issue. Input JSON: {repo, title, body, labels?, token}")
    def github_create_issue(params: dict) -> dict:
        cred = params.get("_credential", {})
        token = params.get("token", cred.get("token", ""))
        headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"}
        body = {"title": params["title"], "body": params.get("body", ""), "labels": params.get("labels", [])}
        with httpx.Client(timeout=15) as client:
            resp = client.post(f"https://api.github.com/repos/{params['repo']}/issues", headers=headers, json=body)
        return resp.json()

    @registry_devops.register("snow_create_incident", "Create a ServiceNow incident. Input JSON: {shortDesc, description, urgency, category}")
    def snow_create_incident(params: dict) -> dict:
        cred = params.get("_credential", {})
        instance = cred.get("instance", params.get("instance", ""))
        auth = (cred.get("username", ""), cred.get("password", ""))
        body = {
            "short_description": params["shortDesc"],
            "description": params.get("description", ""),
            "urgency": str(params.get("urgency", "3")),
            "category": params.get("category", "software"),
        }
        with httpx.Client(timeout=15) as client:
            resp = client.post(
                f"https://{instance}.service-now.com/api/now/table/incident",
                auth=auth, json=body,
                headers={"Content-Type": "application/json", "Accept": "application/json"},
            )
        return resp.json()

    @registry_devops.register("jira_create_issue", "Create a Jira issue. Input JSON: {project, summary, description, type, priority?}")
    def jira_create_issue(params: dict) -> dict:
        cred = params.get("_credential", {})
        base_url = cred.get("base_url", params.get("base_url", ""))
        auth = (cred.get("email", ""), cred.get("api_token", ""))
        body = {
            "fields": {
                "project": {"key": params["project"]},
                "summary": params["summary"],
                "description": params.get("description", ""),
                "issuetype": {"name": params.get("type", "Story")},
                "priority": {"name": params.get("priority", "Medium")},
            }
        }
        with httpx.Client(timeout=15) as client:
            resp = client.post(f"{base_url}/rest/api/3/issue", auth=auth, json=body,
                               headers={"Content-Type": "application/json"})
        return resp.json()
