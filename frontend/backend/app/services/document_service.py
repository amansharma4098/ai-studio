import chromadb
import uuid

# Use in-memory ephemeral client — no external ChromaDB service needed
# Documents and embeddings live in RAM per process lifecycle
chroma_client = chromadb.EphemeralClient()

def get_or_create_collection(name: str = "documents"):
    """Get or create a ChromaDB collection."""
    return chroma_client.get_or_create_collection(name=name)

def add_document_chunks(doc_id: str, chunks: list[str], metadatas: list[dict] | None = None):
    """Add document chunks to ChromaDB."""
    collection = get_or_create_collection()
    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    collection.add(
        documents=chunks,
        ids=ids,
        metadatas=metadatas or [{"doc_id": doc_id, "chunk_index": i} for i in range(len(chunks))],
    )
    return len(chunks)

def query_documents(question: str, doc_ids: list[str] | None = None, n_results: int = 5):
    """Query ChromaDB for relevant chunks."""
    collection = get_or_create_collection()
    where_filter = None
    if doc_ids:
        where_filter = {"doc_id": {"$in": doc_ids}}
    results = collection.query(
        query_texts=[question],
        n_results=n_results,
        where=where_filter,
    )
    return results

def delete_document(doc_id: str):
    """Delete all chunks for a document from ChromaDB."""
    collection = get_or_create_collection()
    # Get all chunk IDs for this document
    results = collection.get(where={"doc_id": doc_id})
    if results and results["ids"]:
        collection.delete(ids=results["ids"])
    return True
