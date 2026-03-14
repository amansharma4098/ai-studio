"""
Shared test fixtures for AI Studio backend tests.
Uses SQLite + aiosqlite for fast, isolated test runs.
"""

import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.compiler import compiles

# Compile PostgreSQL UUID to VARCHAR(36) for SQLite
@compiles(PG_UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "VARCHAR(36)"


from app.db.session import Base, get_db
from app.main import app

# In-memory SQLite for tests
TEST_DATABASE_URL = "sqlite+aiosqlite://"

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSession = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSession() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Create all tables before each test and drop after."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def test_user(client: AsyncClient):
    """Create a user via the signup endpoint and return user info."""
    email = f"test-{uuid.uuid4().hex[:8]}@example.com"
    password = "TestPass123!"
    resp = await client.post("/api/auth/signup", json={
        "email": email,
        "name": "Test User",
        "password": password,
    })
    assert resp.status_code == 200
    data = resp.json()
    return {
        "id": data["user"]["id"],
        "email": email,
        "password": password,
        "token": data["access_token"],
    }


@pytest_asyncio.fixture
async def auth_headers(test_user):
    """Authorization header for the test user."""
    return {"Authorization": f"Bearer {test_user['token']}"}


@pytest_asyncio.fixture
async def test_agent(client: AsyncClient, auth_headers):
    """Create an agent and return its data."""
    resp = await client.post("/api/agents/", json={
        "name": "Test Agent",
        "description": "Agent for testing",
        "system_prompt": "You are a test assistant.",
    }, headers=auth_headers)
    assert resp.status_code == 200
    return resp.json()


@pytest_asyncio.fixture
async def test_document(test_user):
    """Insert a document record directly into the DB."""
    from app.db.models import Document
    async with TestSession() as session:
        doc = Document(
            user_id=test_user["id"],
            file_name="test.txt",
            file_path="/tmp/test.txt",
            file_size=100,
            mime_type="text/plain",
            chunk_count=2,
            is_indexed=True,
            collection_name=f"user_{test_user['id'][:8]}_testcoll",
        )
        session.add(doc)
        await session.commit()
        await session.refresh(doc)
        return {
            "id": doc.id,
            "file_name": doc.file_name,
            "collection_name": doc.collection_name,
            "user_id": test_user["id"],
        }
