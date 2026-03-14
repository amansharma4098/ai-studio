"""Tests for POST /api/playground/run."""

import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient


def _mock_groq_response(content="Mocked playground output"):
    """Build a mock Groq chat completion response."""
    message = MagicMock()
    message.content = content
    choice = MagicMock()
    choice.message = message
    response = MagicMock()
    response.choices = [choice]
    return response


@pytest.mark.asyncio
async def test_playground_run_success(client: AsyncClient, auth_headers):
    mock_resp = _mock_groq_response("Hello from LLM")
    with patch("app.api.playground.Groq") as MockGroq:
        MockGroq.return_value.chat.completions.create.return_value = mock_resp
        resp = await client.post("/api/playground/run", json={
            "prompt": "Say hello",
        }, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["response"] == "Hello from LLM"
    assert "model" in data


@pytest.mark.asyncio
async def test_playground_unauthenticated(client: AsyncClient):
    resp = await client.post("/api/playground/run", json={"prompt": "Hi"})
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_playground_empty_prompt(client: AsyncClient, auth_headers):
    """An empty prompt should still be accepted (no validation rejects it) or return 422."""
    mock_resp = _mock_groq_response("")
    with patch("app.api.playground.Groq") as MockGroq:
        MockGroq.return_value.chat.completions.create.return_value = mock_resp
        resp = await client.post("/api/playground/run", json={
            "prompt": "",
        }, headers=auth_headers)
    # The endpoint doesn't enforce non-empty prompt, so it passes through
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_playground_model_selection(client: AsyncClient, auth_headers):
    """Verify model_map maps 'mistral' to the correct Groq model ID."""
    mock_resp = _mock_groq_response("Mistral says hi")
    with patch("app.api.playground.Groq") as MockGroq:
        mock_create = MockGroq.return_value.chat.completions.create
        mock_create.return_value = mock_resp
        resp = await client.post("/api/playground/run", json={
            "prompt": "Test",
            "model_name": "mistral",
        }, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["model"] == "mistral-saba-24b"
