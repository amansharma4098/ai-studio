"""Tests for /api/credentials/ save, list, delete."""

import uuid
import pytest
from httpx import AsyncClient


# ── Create Credential ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_credential_success(client: AsyncClient, auth_headers):
    resp = await client.post("/api/credentials/save", json={
        "name": "My Groq Key",
        "auth_type": "Groq",
        "auth_category": "API Key",
        "credential_values": {"api_key": "gsk_test_1234567890"},
    }, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "My Groq Key"
    assert data["status"] == "saved"
    assert "id" in data
    # Credential values should NOT be returned in create response
    assert "credential_values" not in data


@pytest.mark.asyncio
async def test_create_unauthenticated(client: AsyncClient):
    resp = await client.post("/api/credentials/save", json={
        "name": "No Auth",
        "auth_type": "Groq",
        "auth_category": "API Key",
        "credential_values": {"api_key": "test"},
    })
    assert resp.status_code in (401, 403)


# ── List Credentials ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_credentials(client: AsyncClient, auth_headers):
    # Create one credential
    await client.post("/api/credentials/save", json={
        "name": "Test Cred",
        "auth_type": "Groq",
        "auth_category": "API Key",
        "credential_values": {"api_key": "test_key"},
    }, headers=auth_headers)

    resp = await client.get("/api/credentials/list", headers=auth_headers)
    assert resp.status_code == 200
    creds = resp.json()
    assert len(creds) == 1
    assert creds[0]["name"] == "Test Cred"

    # Other user should see nothing
    resp2 = await client.post("/api/auth/signup", json={
        "email": "credother@example.com", "name": "Other", "password": "OtherP@ss1",
    })
    other_headers = {"Authorization": f"Bearer {resp2.json()['access_token']}"}
    resp3 = await client.get("/api/credentials/list", headers=other_headers)
    assert resp3.status_code == 200
    assert resp3.json() == []


# ── Delete Credential ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_credential(client: AsyncClient, auth_headers):
    # Create
    create_resp = await client.post("/api/credentials/save", json={
        "name": "To Delete",
        "auth_type": "Groq",
        "auth_category": "API Key",
        "credential_values": {"api_key": "delete_me"},
    }, headers=auth_headers)
    cred_id = create_resp.json()["id"]

    # Delete (soft delete)
    resp = await client.delete(f"/api/credentials/{cred_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "deleted"

    # Should no longer appear in list
    list_resp = await client.get("/api/credentials/list", headers=auth_headers)
    assert all(c["id"] != cred_id for c in list_resp.json())


@pytest.mark.asyncio
async def test_delete_wrong_user(client: AsyncClient, auth_headers):
    # Create credential as user A
    create_resp = await client.post("/api/credentials/save", json={
        "name": "User A Cred",
        "auth_type": "Groq",
        "auth_category": "API Key",
        "credential_values": {"api_key": "secret"},
    }, headers=auth_headers)
    cred_id = create_resp.json()["id"]

    # Try to delete as user B
    resp2 = await client.post("/api/auth/signup", json={
        "email": "credintruder@example.com", "name": "Intruder", "password": "Intr1!Pass",
    })
    intruder_headers = {"Authorization": f"Bearer {resp2.json()['access_token']}"}
    resp = await client.delete(f"/api/credentials/{cred_id}", headers=intruder_headers)
    assert resp.status_code == 404
