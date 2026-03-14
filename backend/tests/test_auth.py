"""Tests for POST /api/auth/signup, POST /api/auth/login, GET /api/auth/me."""

import pytest
from httpx import AsyncClient


# ── Signup ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_signup_success(client: AsyncClient):
    resp = await client.post("/api/auth/signup", json={
        "email": "new@example.com",
        "name": "New User",
        "password": "Str0ngP@ss!",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "new@example.com"


@pytest.mark.asyncio
async def test_signup_duplicate_email(client: AsyncClient):
    payload = {"email": "dup@example.com", "name": "User", "password": "Pass1234!"}
    await client.post("/api/auth/signup", json=payload)
    resp = await client.post("/api/auth/signup", json=payload)
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_signup_missing_fields(client: AsyncClient):
    resp = await client.post("/api/auth/signup", json={
        "email": "missing@example.com",
        "name": "No Pass",
    })
    assert resp.status_code == 422


# ── Login ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    email, password = "login@example.com", "MyP@ssw0rd"
    await client.post("/api/auth/signup", json={
        "email": email, "name": "Login User", "password": password,
    })
    resp = await client.post("/api/auth/login", json={
        "email": email, "password": password,
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    email = "wrongpw@example.com"
    await client.post("/api/auth/signup", json={
        "email": email, "name": "User", "password": "CorrectPass1!",
    })
    resp = await client.post("/api/auth/login", json={
        "email": email, "password": "WrongPass99!",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    resp = await client.post("/api/auth/login", json={
        "email": "ghost@example.com", "password": "NoOne123!",
    })
    assert resp.status_code == 401


# ── Me ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_me_authenticated(client: AsyncClient, auth_headers, test_user):
    resp = await client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == test_user["email"]


@pytest.mark.asyncio
async def test_me_no_token(client: AsyncClient):
    resp = await client.get("/api/auth/me")
    assert resp.status_code in (401, 403)
