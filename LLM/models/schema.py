"""Pydantic schemas for the LLM / RAG chatbot server."""

from typing import List, Optional
from pydantic import BaseModel


class ChatMessage(BaseModel):
    """A single message in a conversation."""
    role: str  # "user" or "assistant"
    content: str
    sources: Optional[List[str]] = None


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


class ResumeRequest(BaseModel):
    """Request body for generating a resume."""
    student_id: str


class RoadmapRequest(BaseModel):
    """Request body for generating a career roadmap."""
    student_id: str
    target_role: Optional[str] = "Full Stack Developer"


class RoadmapFromResultRequest(BaseModel):
    """Request body for generating a roadmap from a specific test result."""
    test_title: str
    student_name: Optional[str] = "Student"
    score_pct: float
    grade: str
    correct: int
    incorrect: int
    pending: int
    total_questions: int
    subject_breakdown: dict  # subject name -> {correct, total}
    weak_topics: List[str]   # list of question contents failed
class CareerResponse(BaseModel):
    """Response body for resume and roadmap generation."""
    answer: str
    metadata: Optional[dict] = None
