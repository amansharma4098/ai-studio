"""Tests for /api/agents/ CRUD, run, and run-history endpoints."""

import uuid
import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient


# ── Create Agent ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_agent_success(client: AsyncClient, auth_headers):
    resp = await client.post("/api/agents/", json={
        "name": "My Agent",
        "system_prompt": "Be helpful.",
    }, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "My Agent"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_agent_unauthenticated(client: AsyncClient):
    resp = await client.post("/api/agents/", json={
        "name": "No Auth Agent",
        "system_prompt": "Test",
    })
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_create_agent_missing_name(client: AsyncClient, auth_headers):
    resp = await client.post("/api/agents/", json={
        "system_prompt": "missing name",
    }, headers=auth_headers)
    assert resp.status_code == 422


# ── List Agents ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_agents_empty(client: AsyncClient, auth_headers):
    resp = await client.get("/api/agents/", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_agents_returns_own_only(client: AsyncClient, auth_headers, test_agent):
    # Create a second user with their own agent
    resp2 = await client.post("/api/auth/signup", json={
        "email": "other@example.com", "name": "Other", "password": "OtherPass1!",
    })
    other_token = resp2.json()["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    await client.post("/api/agents/", json={
        "name": "Other Agent", "system_prompt": "Other",
    }, headers=other_headers)

    # User A should only see their own agent
    resp = await client.get("/api/agents/", headers=auth_headers)
    agents = resp.json()
    assert len(agents) == 1
    assert agents[0]["name"] == "Test Agent"


# ── Get Agent ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_agent_success(client: AsyncClient, auth_headers, test_agent):
    resp = await client.get(f"/api/agents/{test_agent['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == test_agent["id"]


@pytest.mark.asyncio
async def test_get_agent_not_found(client: AsyncClient, auth_headers):
    fake_id = str(uuid.uuid4())
    resp = await client.get(f"/api/agents/{fake_id}", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_agent_wrong_user(client: AsyncClient, test_agent):
    resp2 = await client.post("/api/auth/signup", json={
        "email": "intruder@example.com", "name": "Intruder", "password": "Intruder1!",
    })
    intruder_headers = {"Authorization": f"Bearer {resp2.json()['access_token']}"}
    resp = await client.get(f"/api/agents/{test_agent['id']}", headers=intruder_headers)
    assert resp.status_code == 404


# ── Update Agent ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_update_agent_name(client: AsyncClient, auth_headers, test_agent):
    resp = await client.put(f"/api/agents/{test_agent['id']}", json={
        "name": "Renamed Agent",
    }, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Renamed Agent"


@pytest.mark.asyncio
async def test_update_agent_prompt(client: AsyncClient, auth_headers, test_agent):
    resp = await client.put(f"/api/agents/{test_agent['id']}", json={
        "system_prompt": "New prompt.",
    }, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["system_prompt"] == "New prompt."


@pytest.mark.asyncio
async def test_update_wrong_user(client: AsyncClient, test_agent):
    resp2 = await client.post("/api/auth/signup", json={
        "email": "nope@example.com", "name": "Nope", "password": "NopePass1!",
    })
    nope_headers = {"Authorization": f"Bearer {resp2.json()['access_token']}"}
    resp = await client.put(f"/api/agents/{test_agent['id']}", json={
        "name": "Hacked",
    }, headers=nope_headers)
    assert resp.status_code == 404


# ── Delete Agent ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_agent_success(client: AsyncClient, auth_headers, test_agent):
    resp = await client.delete(f"/api/agents/{test_agent['id']}", headers=auth_headers)
    assert resp.status_code == 200
    # Confirm gone
    resp2 = await client.get(f"/api/agents/{test_agent['id']}", headers=auth_headers)
    assert resp2.status_code == 404


@pytest.mark.asyncio
async def test_delete_wrong_user(client: AsyncClient, test_agent):
    resp2 = await client.post("/api/auth/signup", json={
        "email": "del@example.com", "name": "Del", "password": "DelPass1!",
    })
    del_headers = {"Authorization": f"Bearer {resp2.json()['access_token']}"}
    resp = await client.delete(f"/api/agents/{test_agent['id']}", headers=del_headers)
    assert resp.status_code == 404


# ── Run Agent ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_run_agent_mock(client: AsyncClient, auth_headers, test_agent):
    mock_result = {
        "output": "Mocked LLM response",
        "trace": [],
        "status": "completed",
        "execution_time_ms": 42,
        "skills_called": [],
    }
    with patch("app.api.agents.build_agent_executor", return_value={}), \
         patch("app.api.agents.run_agent", return_value=mock_result):
        resp = await client.post(
            f"/api/agents/{test_agent['id']}/run",
            json={"input_text": "Hello agent"},
            headers=auth_headers,
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["output_text"] == "Mocked LLM response"
    assert data["status"] == "completed"


@pytest.mark.asyncio
async def test_run_agent_unauthenticated(client: AsyncClient, test_agent):
    resp = await client.post(
        f"/api/agents/{test_agent['id']}/run",
        json={"input_text": "Hello"},
    )
    assert resp.status_code in (401, 403)


# ── Get Runs ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_runs_empty(client: AsyncClient, auth_headers, test_agent):
    resp = await client.get(f"/api/agents/{test_agent['id']}/runs", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_runs_after_execution(client: AsyncClient, auth_headers, test_agent):
    mock_result = {
        "output": "Run output",
        "trace": [],
        "status": "completed",
        "execution_time_ms": 100,
        "skills_called": [],
    }
    with patch("app.api.agents.build_agent_executor", return_value={}), \
         patch("app.api.agents.run_agent", return_value=mock_result):
        await client.post(
            f"/api/agents/{test_agent['id']}/run",
            json={"input_text": "Test run"},
            headers=auth_headers,
        )

    resp = await client.get(f"/api/agents/{test_agent['id']}/runs", headers=auth_headers)
    assert resp.status_code == 200
    runs = resp.json()
    assert len(runs) == 1
    assert runs[0]["status"] == "completed"
