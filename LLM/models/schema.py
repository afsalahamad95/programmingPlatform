"""Pydantic schemas for the LLM / RAG chatbot server."""

from typing import List, Optional
from pydantic import BaseModel


class ChatMessage(BaseModel):
    """A single message in a conversation."""
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Request body for the /llm/chat endpoint."""
    messages: List[ChatMessage]
    context_hint: Optional[str] = None  # optional extra context / topic filter


class ChatResponse(BaseModel):
    """Response body for the /llm/chat endpoint."""
    answer: str
    sources: List[str] = []


class IngestRequest(BaseModel):
    """Request body for the /llm/ingest endpoint."""
    documents: List[str]
    metadata: Optional[List[dict]] = None  # optional per-doc metadata


class IngestResponse(BaseModel):
    """Response body for the /llm/ingest endpoint."""
    message: str
    count: int
