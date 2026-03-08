"""Application configuration using Pydantic Settings."""
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "supersecretkey_change_in_production"
    ENCRYPTION_KEY: str = "encryptionkey32byteslong_changeit"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://aistudio:aistudio_secret@localhost:5432/aistudio"

    # Redis
    REDIS_URL: str = "redis://:redis_secret@localhost:6379/0"

    # Groq LLM
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama3-8b-8192"

    # ChromaDB
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    CHROMA_AUTH_TOKEN: str = "chromadb_token"

    # Celery
    CELERY_BROKER_URL: str = "redis://:redis_secret@localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://:redis_secret@localhost:6379/2"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    ALLOWED_ORIGINS: str = ""

    # Port
    PORT: int = 8000

    # File uploads
    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    # RAG
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    RAG_TOP_K: int = 4

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
