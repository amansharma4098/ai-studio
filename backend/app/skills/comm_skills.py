"""Communication skills — Email, Slack, Teams, SMS."""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import httpx


def register(registry):
    @registry.register("send_email", "Send an email via SMTP. Input JSON: {to, subject, body, from_email?, smtp_host?, smtp_port?}")
    def send_email(params: dict) -> dict:
        cred = params.get("_credential", {})
        msg = MIMEMultipart()
        msg["From"] = params.get("from_email", cred.get("from_email", "noreply@localhost"))
        msg["To"] = params["to"]
        msg["Subject"] = params["subject"]
        content_type = "html" if "<" in params.get("body", "") else "plain"
        msg.attach(MIMEText(params.get("body", ""), content_type))
        try:
            smtp_host = params.get("smtp_host", cred.get("smtp_host", "localhost"))
            smtp_port = int(params.get("smtp_port", cred.get("smtp_port", 25)))
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                if cred.get("smtp_user") and cred.get("smtp_password"):
                    server.starttls()
                    server.login(cred["smtp_user"], cred["smtp_password"])
                server.sendmail(msg["From"], params["to"], msg.as_string())
            return {"status": "sent", "to": params["to"], "subject": params["subject"]}
        except Exception as e:
            return {"error": str(e), "status": "failed"}

    @registry.register("slack_post_message", "Post a message to a Slack channel via webhook. Input JSON: {channel, message, webhook_url?}")
    def slack_post_message(params: dict) -> dict:
        cred = params.get("_credential", {})
        webhook = params.get("webhook_url") or cred.get("webhook_url", "")
        if not webhook:
            return {"error": "No Slack webhook URL — set webhook_url in params or credential"}
        payload = {
            "channel": params.get("channel", "#general"),
            "text": params["message"],
            "username": params.get("username", "AI Studio Bot"),
        }
        with httpx.Client(timeout=10) as client:
            resp = client.post(webhook, json=payload)
        return {"status": "ok" if resp.status_code == 200 else "error", "response": resp.text}

    @registry.register("teams_post_message", "Post an Adaptive Card message to Microsoft Teams. Input JSON: {message, webhook_url?}")
    def teams_post_message(params: dict) -> dict:
        cred = params.get("_credential", {})
        webhook = params.get("webhook_url") or cred.get("webhook_url", "")
        if not webhook:
            return {"error": "No Teams webhook URL — set webhook_url in params or credential"}
        body = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": "6c5ce7",
            "title": params.get("title", "AI Studio Notification"),
            "text": params["message"],
        }
        with httpx.Client(timeout=10) as client:
            resp = client.post(webhook, json=body)
        return {"status": "ok" if resp.status_code in (200, 202) else "error"}

    @registry.register("send_sms", "Send an SMS via Twilio. Input JSON: {to, message, from_number?}")
    def send_sms(params: dict) -> dict:
        cred = params.get("_credential", {})
        account_sid = cred.get("twilio_account_sid", "")
        auth_token = cred.get("twilio_auth_token", "")
        from_number = params.get("from_number") or cred.get("twilio_from_number", "")
        if not account_sid:
            return {"error": "No Twilio credentials configured"}
        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        with httpx.Client(timeout=15) as client:
            resp = client.post(url, auth=(account_sid, auth_token), data={
                "To": params["to"], "From": from_number, "Body": params["message"]
            })
        return resp.json()
