"""Pydantic schemas for the LLM / RAG server and agent pipeline."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel


# ── Core Chat ─────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    sources: Optional[List[str]] = None


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context_hint: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    sources: List[str] = []


# ── Knowledge Base ────────────────────────────────────────────────────────────

class IngestRequest(BaseModel):
    documents: List[str]
    metadata: Optional[List[dict]] = None


class IngestResponse(BaseModel):
    message: str
    count: int


# ── Career ────────────────────────────────────────────────────────────────────

class ResumeRequest(BaseModel):
    student_id: str


class RoadmapRequest(BaseModel):
    student_id: str
    target_role: Optional[str] = "Full Stack Developer"


class RoadmapFromResultRequest(BaseModel):
    test_title: str
    student_name: Optional[str] = "Student"
    score_pct: float
    grade: str
    correct: int
    incorrect: int
    pending: int
    total_questions: int
    subject_breakdown: dict
    weak_topics: List[str]


class CareerResponse(BaseModel):
    answer: str
    metadata: Optional[dict] = None


# ── Hints ─────────────────────────────────────────────────────────────────────

class HintRequest(BaseModel):
    question_content: str
    question_type: str
    student_id: Optional[str] = None
    previous_answers: Optional[str] = None


class HintResponse(BaseModel):
    hint: str
    explanation: Optional[str] = None


# ── Audio ─────────────────────────────────────────────────────────────────────

class TranscriptionResponse(BaseModel):
    text: str


# ── Code Analyzer Agent ───────────────────────────────────────────────────────

class CodeAnalysisRequest(BaseModel):
    code: str
    language: str = "python"
    question: Optional[str] = None   # Optional task description / expected behaviour
    student_id: Optional[str] = None


class CodeAnalysisResponse(BaseModel):
    correctness: str             # brief correctness verdict
    issues: List[str]            # list of bugs / anti-patterns
    suggestions: List[str]       # actionable improvement suggestions
    complexity: str              # time/space complexity estimate
    improved_code: Optional[str] = None   # refactored snippet
    debug_hint: Optional[str] = None      # hint without spoiling the fix
    score: int                   # 0-100 quality score


# ── AI Debugging ─────────────────────────────────────────────────────────────

class DebugRequest(BaseModel):
    code: str
    error_message: str
    language: str = "python"
    student_id: Optional[str] = None


class DebugResponse(BaseModel):
    root_cause: str
    explanation: str
    fix_steps: List[str]
    fixed_code: Optional[str] = None
    related_concepts: List[str] = []


# ── Skill Graph Updater Agent ─────────────────────────────────────────────────

class SkillUpdateRequest(BaseModel):
    student_id: str
    test_title: str
    score_pct: float
    subject_breakdown: Dict[str, Any]    # subject -> {correct, total}
    languages_used: Optional[List[str]] = None


class SkillUpdateResponse(BaseModel):
    updated_skills: Dict[str, float]     # skill -> new score (0-100)
    message: str
    recommendations: List[str]


# ── Interview Feedback ────────────────────────────────────────────────────────

class InterviewFeedbackRequest(BaseModel):
    transcript: List[Dict[str, str]]   # [{role, content}, ...]
    role: Optional[str] = "Software Engineer"
    difficulty: Optional[str] = "Medium"
    student_id: Optional[str] = None


class InterviewFeedbackResponse(BaseModel):
    overall_score: int                  # 0-100
    technical_score: int
    communication_score: int
    strengths: List[str]
    improvements: List[str]
    detailed_feedback: str
    recommended_topics: List[str]


# ── Orchestrator ──────────────────────────────────────────────────────────────

class OrchestratorRequest(BaseModel):
    task: str                           # "analyze_code" | "debug" | "update_skills" | "interview_feedback"
    payload: Dict[str, Any]
    student_id: Optional[str] = None
    priority: Optional[str] = "normal"  # "high" | "normal" | "low"


class OrchestratorResponse(BaseModel):
    task: str
    result: Dict[str, Any]
    agent_used: str
    duration_ms: Optional[float] = None
    cached: bool = False
