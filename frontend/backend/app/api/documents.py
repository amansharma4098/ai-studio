from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid

from backend.app.services.document_service import (
    add_document_chunks,
    query_documents,
    delete_document,
)

router = APIRouter()

# In-memory document registry (pairs with ChromaDB ephemeral storage)
_documents: dict[str, dict] = {}


class QueryRequest(BaseModel):
    question: str
    document_ids: Optional[list[str]] = None
    model_name: Optional[str] = "llama3"


@router.get("/")
async def list_documents():
    return list(_documents.values())


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    content = await file.read()
    text = content.decode("utf-8", errors="ignore")

    # Simple chunking: split by double newlines, then by ~500 char blocks
    raw_chunks = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    for chunk in raw_chunks:
        if len(chunk) > 500:
            for i in range(0, len(chunk), 500):
                chunks.append(chunk[i : i + 500])
        else:
            chunks.append(chunk)

    if not chunks:
        chunks = [text[:1000]] if text else ["(empty document)"]

    doc_id = str(uuid.uuid4())
    chunk_count = add_document_chunks(doc_id, chunks)

    doc_meta = {
        "id": doc_id,
        "file_name": file.filename,
        "file_size": len(content),
        "chunk_count": chunk_count,
        "is_indexed": True,
    }
    _documents[doc_id] = doc_meta
    return doc_meta


@router.post("/query")
async def query_docs(req: QueryRequest):
    if not _documents:
        raise HTTPException(status_code=400, detail="No documents uploaded yet")

    results = query_documents(req.question, req.document_ids)

    sources = []
    if results and results.get("documents"):
        for i, doc_text in enumerate(results["documents"][0]):
            meta = results["metadatas"][0][i] if results.get("metadatas") else {}
            distance = results["distances"][0][i] if results.get("distances") else 0
            sources.append({
                "excerpt": doc_text[:300],
                "file_name": meta.get("file_name", ""),
                "page": meta.get("chunk_index", 0),
                "similarity": distance,
            })

    # Placeholder answer — real implementation would call Ollama/LLM
    answer = f"Based on {len(sources)} relevant chunks found for: '{req.question}'"
    if sources:
        answer += f"\n\nTop match: {sources[0]['excerpt'][:200]}..."

    return {"answer": answer, "sources": sources}


@router.delete("/{doc_id}")
async def delete_doc(doc_id: str):
    if doc_id not in _documents:
        raise HTTPException(status_code=404, detail="Document not found")
    delete_document(doc_id)
    del _documents[doc_id]
    return {"status": "deleted"}
