# AI Studio v3

Production-grade multi-tenant AI automation platform built with FastAPI, LangChain, and Groq.

## Stack

- **Backend**: FastAPI + SQLAlchemy + PostgreSQL + Redis + Celery
- **LLM**: Groq (llama3-8b-8192) via LangChain
- **Embeddings**: HuggingFace `all-MiniLM-L6-v2` (local, free)
- **Vector DB**: ChromaDB
- **Frontend**: Next.js + Tailwind CSS

## Local Development

```bash
cp .env.example .env
# Fill in your values
docker compose up --build
```

## Deploy to Railway

1. Connect this repo to Railway
2. Add environment variables (listed below)
3. Railway auto-deploys on git push

### Required Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Railway PostgreSQL — auto provided |
| `REDIS_URL` | Railway Redis — auto provided |
| `GROQ_API_KEY` | Get free key at [console.groq.com](https://console.groq.com) |
| `GROQ_MODEL` | Default: `llama3-8b-8192` |
| `SECRET_KEY` | Any random 32+ character string |
| `ENCRYPTION_KEY` | Any random 32+ character string |
| `CHROMA_HOST` | `localhost` (or your ChromaDB host) |
| `CHROMA_AUTH_TOKEN` | ChromaDB auth token |
| `ALLOWED_ORIGINS` | e.g. `https://your-frontend.pages.dev` |
| `ENVIRONMENT` | `production` |

### Celery Workers on Railway

Add a second Railway service from the same repo with start command:

```
celery -A app.workers.celery_app worker --loglevel=info --concurrency=2 -Q default,agents,workflows
```

Set the same environment variables as the web service.
