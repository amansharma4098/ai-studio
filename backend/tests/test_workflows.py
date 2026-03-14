"""Tests for /api/workflows/ create, list, delete."""

import pytest
from httpx import AsyncClient


# ── Create Workflow ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_workflow_success(client: AsyncClient, auth_headers):
    resp = await client.post("/api/workflows/", json={
        "name": "My Workflow",
        "description": "Test workflow",
        "definition": {"nodes": [], "edges": []},
    }, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "My Workflow"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_missing_name(client: AsyncClient, auth_headers):
    resp = await client.post("/api/workflows/", json={
        "definition": {"nodes": []},
    }, headers=auth_headers)
    assert resp.status_code == 422


# ── List Workflows ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_workflows(client: AsyncClient, auth_headers):
    # Create a workflow
    await client.post("/api/workflows/", json={
        "name": "WF1",
        "definition": {"nodes": [], "edges": []},
    }, headers=auth_headers)

    resp = await client.get("/api/workflows/", headers=auth_headers)
    assert resp.status_code == 200
    wfs = resp.json()
    assert len(wfs) == 1
    assert wfs[0]["name"] == "WF1"

    # Other user sees empty list
    resp2 = await client.post("/api/auth/signup", json={
        "email": "wfother@example.com", "name": "Other", "password": "OtherP@ss1",
    })
    other_headers = {"Authorization": f"Bearer {resp2.json()['access_token']}"}
    resp3 = await client.get("/api/workflows/", headers=other_headers)
    assert resp3.status_code == 200
    assert resp3.json() == []


# ── Delete Workflow ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_workflow(client: AsyncClient, auth_headers):
    create_resp = await client.post("/api/workflows/", json={
        "name": "To Delete",
        "definition": {"nodes": []},
    }, headers=auth_headers)
    wf_id = create_resp.json()["id"]

    resp = await client.delete(f"/api/workflows/{wf_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "deleted"

    # Confirm it's gone from list
    list_resp = await client.get("/api/workflows/", headers=auth_headers)
    assert all(w["id"] != wf_id for w in list_resp.json())
