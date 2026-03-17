"""LLM Server — FastAPI RAG Chatbot Backend

Endpoints:
  GET  /health        — health check
  POST /llm/ingest    — add documents to the knowledge base
  POST /llm/chat      — RAG-powered chat

Run with:
  uvicorn server:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import uuid
import logging
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from groq import Groq
from models.schema import (
    IngestRequest,
    IngestResponse,
    ChatRequest,
    ChatResponse,
)

# ── Bootstrap ─────────────────────────────────────────────────────────────────
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
TOP_K = int(os.getenv("RAG_TOP_K", "4"))

# ── Embedding model ───────────────────────────────────────────────────────────
logger.info("Loading SentenceTransformer model …")
_embed_model = SentenceTransformer("all-MiniLM-L6-v2")


def embed(texts: List[str]) -> List[List[float]]:
    """Return a list of embedding vectors for a list of strings."""
    return _embed_model.encode(texts, show_progress_bar=False).tolist()


# ── ChromaDB (persistent) ─────────────────────────────────────────────────────
_chroma_client = chromadb.PersistentClient(
    path=os.path.join(os.path.dirname(__file__), ".chroma_db"),
    settings=Settings(anonymized_telemetry=False),
)
_collection = _chroma_client.get_or_create_collection(
    name="knowledge_base",
    metadata={"hnsw:space": "cosine"},
)
logger.info(
    "ChromaDB collection 'knowledge_base' ready — %d documents",
    _collection.count(),
)

# ── Groq client ───────────────────────────────────────────────────────────────
_groq_client: Optional[Groq] = None
if GROQ_API_KEY:
    _groq_client = Groq(api_key=GROQ_API_KEY)
    logger.info("Groq client initialised with model '%s'", GROQ_MODEL)
else:
    logger.warning(
        "GROQ_API_KEY not set — /llm/chat will return an error. "
        "/llm/ingest and /health still work."
    )

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Programming Platform LLM Server",
    description="RAG-powered chatbot backend using ChromaDB + Groq",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # client frontend
        "http://localhost:5174",  # admin frontend
        "http://localhost:3000",
        "*",  # allow all during dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routes ────────────────────────────────────────────────────────────────────


@app.get("/llm/health", tags=["meta"])
def health():
    """Liveness check — always returns 200 when the server is up."""
    return {
        "status": "ok",
        "kb_document_count": _collection.count(),
        "groq_configured": bool(GROQ_API_KEY),
    }


@app.post("/llm/ingest", response_model=IngestResponse, tags=["knowledge-base"])
def ingest(req: IngestRequest):
    """
    Add one or more text documents to the RAG knowledge base.

    Each string in `documents` becomes a searchable chunk. Optional `metadata`
    list (same length as `documents`) can attach arbitrary key-value pairs.
    """
    if not req.documents:
        raise HTTPException(status_code=400, detail="No documents provided.")

    docs = req.documents
    meta = req.metadata or [{} for _ in docs]

    if len(meta) != len(docs):
        raise HTTPException(
            status_code=400,
            detail="`metadata` length must match `documents` length.",
        )

    ids = [str(uuid.uuid4()) for _ in docs]
    embeddings = embed(docs)

    kwargs = {
        "documents": docs,
        "embeddings": embeddings,
        "ids": ids,
    }
    # Only add metadatas if they are not all empty dicts,
    # as some Chroma versions fail on empty metadata dicts.
    if any(m for m in meta):
        kwargs["metadatas"] = meta

    _collection.add(**kwargs)

    logger.info(
        "Ingested %d document(s); KB now has %d total.", len(docs), _collection.count()
    )
    return IngestResponse(
        message=f"Successfully ingested {len(docs)} document(s).",
        count=len(docs),
    )


@app.post("/llm/chat", response_model=ChatResponse, tags=["chat"])
def chat(req: ChatRequest):
    """
    Answer a user's question using RAG over the knowledge base.

    - The last `user` message is used as the retrieval query.
    - Top-{TOP_K} relevant chunks are inserted into the system prompt.
    - The full conversation history is forwarded to Groq for generation.
    """
    if not _groq_client:
        raise HTTPException(
            status_code=503,
            detail=(
                "Groq API key is not configured. "
                "Set GROQ_API_KEY in LLM/.env and restart the server."
            ),
        )

    if not req.messages:
        raise HTTPException(status_code=400, detail="No messages provided.")

    # ── 1. Find the latest user turn for retrieval ────────────────────────────
    user_turns = [m for m in req.messages if m.role == "user"]
    if not user_turns:
        raise HTTPException(status_code=400, detail="No user message found.")

    query_text = user_turns[-1].content
    if req.context_hint:
        query_text = f"{req.context_hint}: {query_text}"

    # ── 2. Retrieve relevant chunks from ChromaDB ─────────────────────────────
    sources: List[str] = []
    context_block = ""

    kb_count = _collection.count()
    if kb_count > 0:
        k = min(TOP_K, kb_count)
        query_embedding = embed([query_text])[0]
        results = _collection.query(
            query_embeddings=[query_embedding],
            n_results=k,
            include=["documents", "metadatas", "distances"],
        )
        retrieved_docs: List[str] = results.get("documents", [[]])[0]
        sources = [doc[:120] + "…" if len(doc) > 120 else doc for doc in retrieved_docs]

        if retrieved_docs:
            context_block = "\n\n".join(
                f"[Context {i + 1}]: {doc}" for i, doc in enumerate(retrieved_docs)
            )

    # ── 3. Build the system prompt ────────────────────────────────────────────
    system_prompt = (
        "You are a helpful AI assistant embedded in a programming education platform. "
        "You help students understand programming concepts, debug code, and prepare for tests and challenges. "
        "Be concise, accurate, and encouraging.\n\n"
    )

    if context_block:
        system_prompt += (
            "Use the following knowledge-base context to answer the user's question. "
            "If the context is not directly relevant, still try to help based on your general knowledge.\n\n"
            f"{context_block}"
        )
    else:
        system_prompt += (
            "The knowledge base is currently empty. "
            "Answer using your general programming knowledge."
        )

    # ── 4. Build conversation messages for Groq ───────────────────────────────
    groq_messages = [{"role": "system", "content": system_prompt}]
    for m in req.messages:
        groq_messages.append({"role": m.role, "content": m.content})

    # ── 5. Call Groq ──────────────────────────────────────────────────────────
    try:
        completion = _groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=groq_messages,
            temperature=0.4,
            max_tokens=1024,
        )
        answer = completion.choices[0].message.content or ""
    except Exception as exc:
        logger.error("Groq API error: %s", exc)
        raise HTTPException(
            status_code=502,
            detail=f"LLM generation failed: {exc}",
        ) from exc

    return ChatResponse(answer=answer, sources=sources)
