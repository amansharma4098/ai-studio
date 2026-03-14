"""Tests for /api/documents/ upload, query, list, delete."""

import io
import uuid
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from httpx import AsyncClient


# ── Upload ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_upload_txt_file(client: AsyncClient, auth_headers, tmp_path):
    """Upload a .txt file — mock ChromaDB and file system."""
    mock_chroma_client = MagicMock()

    with patch("app.api.documents.get_chroma_client", return_value=mock_chroma_client), \
         patch("app.api.documents.Chroma"), \
         patch("app.api.documents.os.makedirs"), \
         patch("builtins.open", MagicMock()), \
         patch("app.api.documents.TextLoader") as MockLoader:
        # TextLoader.load() returns LangChain documents
        from langchain_core.documents import Document as LCDoc
        MockLoader.return_value.load.return_value = [
            LCDoc(page_content="Hello world test content", metadata={"source": "test.txt"})
        ]

        resp = await client.post(
            "/api/documents/upload",
            files={"file": ("test.txt", b"Hello world test content", "text/plain")},
            headers=auth_headers,
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["file_name"] == "test.txt"
    assert data["status"] == "indexed"
    assert "id" in data


@pytest.mark.asyncio
async def test_upload_invalid_type(client: AsyncClient, auth_headers):
    resp = await client.post(
        "/api/documents/upload",
        files={"file": ("malware.exe", b"bad content", "application/octet-stream")},
        headers=auth_headers,
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_upload_unauthenticated(client: AsyncClient):
    resp = await client.post(
        "/api/documents/upload",
        files={"file": ("test.txt", b"content", "text/plain")},
    )
    assert resp.status_code in (401, 403)


# ── Query ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_query_success(client: AsyncClient, auth_headers, test_document):
    """Mock ChromaDB similarity search and Groq answer generation."""
    from langchain_core.documents import Document as LCDoc
    mock_chunk = LCDoc(page_content="relevant text", metadata={"source": "test.txt"})

    mock_vectorstore = MagicMock()
    mock_vectorstore.similarity_search_with_score.return_value = [(mock_chunk, 0.1)]

    mock_groq_msg = MagicMock()
    mock_groq_msg.content = "The answer is 42."
    mock_groq_choice = MagicMock()
    mock_groq_choice.message = mock_groq_msg
    mock_groq_resp = MagicMock()
    mock_groq_resp.choices = [mock_groq_choice]

    with patch("app.api.documents.get_chroma_client"), \
         patch("app.api.documents.Chroma", return_value=mock_vectorstore), \
         patch("app.api.documents.Groq") as MockGroq:
        MockGroq.return_value.chat.completions.create.return_value = mock_groq_resp
        resp = await client.post("/api/documents/query", json={
            "question": "What is the answer?",
        }, headers=auth_headers)

    assert resp.status_code == 200
    data = resp.json()
    assert data["answer"] == "The answer is 42."
    assert "sources" in data


@pytest.mark.asyncio
async def test_query_no_documents(client: AsyncClient, auth_headers):
    """No indexed documents should return 404."""
    resp = await client.post("/api/documents/query", json={
        "question": "Anything?",
    }, headers=auth_headers)
    assert resp.status_code == 404


# ── List ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_documents_empty(client: AsyncClient, auth_headers):
    resp = await client.get("/api/documents/", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_documents_own_only(client: AsyncClient, auth_headers, test_document):
    # Create second user
    resp2 = await client.post("/api/auth/signup", json={
        "email": "docother@example.com", "name": "Other", "password": "OtherPass1!",
    })
    other_headers = {"Authorization": f"Bearer {resp2.json()['access_token']}"}

    # Other user should see no documents
    resp = await client.get("/api/documents/", headers=other_headers)
    assert resp.status_code == 200
    assert resp.json() == []

    # Original user should see 1 document
    resp = await client.get("/api/documents/", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1


# ── Delete ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_document_success(client: AsyncClient, auth_headers, test_document):
    with patch("app.api.documents.get_chroma_client") as mock_chroma, \
         patch("app.api.documents.os.remove"):
        resp = await client.delete(
            f"/api/documents/{test_document['id']}", headers=auth_headers,
        )
    assert resp.status_code == 200
    assert resp.json()["status"] == "deleted"


@pytest.mark.asyncio
async def test_delete_wrong_user(client: AsyncClient, test_document):
    resp2 = await client.post("/api/auth/signup", json={
        "email": "docintruder@example.com", "name": "Intruder", "password": "Intr1!Pass",
    })
    intruder_headers = {"Authorization": f"Bearer {resp2.json()['access_token']}"}
    resp = await client.delete(
        f"/api/documents/{test_document['id']}", headers=intruder_headers,
    )
    assert resp.status_code == 404
