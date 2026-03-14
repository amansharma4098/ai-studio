"""Tests for /api/monitoring/ stats and runs."""

import pytest
from unittest.mock import patch
from httpx import AsyncClient


# ── Stats ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_stats_authenticated(client: AsyncClient, auth_headers):
    resp = await client.get("/api/monitoring/stats", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_runs" in data
    assert "failed_runs" in data
    assert "success_rate" in data
    assert "avg_latency_ms" in data
    assert "total_tokens" in data


@pytest.mark.asyncio
async def test_stats_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/monitoring/stats")
    assert resp.status_code in (401, 403)


# ── Runs ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_runs_empty(client: AsyncClient, auth_headers):
    resp = await client.get("/api/monitoring/runs", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_runs_after_agent_run(client: AsyncClient, auth_headers, test_agent):
    """After running an agent, monitoring/runs should include the run."""
    mock_result = {
        "output": "Monitored output",
        "trace": [{"step": "test", "input": "", "output": "ok", "status": "ok"}],
        "status": "completed",
        "execution_time_ms": 55,
        "skills_called": [],
    }
    with patch("app.api.agents.build_agent_executor", return_value={}), \
         patch("app.api.agents.run_agent", return_value=mock_result):
        await client.post(
            f"/api/agents/{test_agent['id']}/run",
            json={"input_text": "Monitoring test"},
            headers=auth_headers,
        )

    resp = await client.get("/api/monitoring/runs", headers=auth_headers)
    assert resp.status_code == 200
    runs = resp.json()
    assert len(runs) >= 1
    assert runs[0]["status"] == "completed"
