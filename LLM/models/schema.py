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


# ── Performance Insights ───────────────────────────────────────────────────────

class PerformanceInsightRequest(BaseModel):
    total_attempts: int
    avg_score: float
    pass_rate: float
    unique_students: int
    unique_tests: int
    score_distribution: List[Dict[str, Any]]   # [{range, count}]
    test_breakdown: List[Dict[str, Any]]        # [{title, attempts, avgScore, passRate}]
    student_breakdown: List[Dict[str, Any]]     # [{name, attempts, avgScore, bestScore}]
    hardest_questions: Optional[List[Dict[str, Any]]] = None
    type_distribution: Optional[List[Dict[str, Any]]] = None
    time_range_days: Optional[int] = 30


class PerformanceInsightResponse(BaseModel):
    summary: str                        # 2-3 sentence executive summary
    key_insights: List[str]             # 4-6 bullet insights
    risk_students: List[str]            # names of students at risk
    top_performers: List[str]           # names of top performers
    hardest_content: List[str]          # hardest tests/questions
    recommendations: List[str]          # 3-5 admin action items
    trend: str                          # "improving" | "declining" | "stable"
    trend_explanation: str


# ── Student AI Feedback ────────────────────────────────────────────────────────

class StudentFeedbackRequest(BaseModel):
    student_name: str
    test_title: str
    score_pct: float
    grade: str
    correct: int
    incorrect: int
    pending: int
    total_questions: int
    subject_breakdown: Dict[str, Any]
    time_spent_seconds: Optional[int] = None
    previous_score_pct: Optional[float] = None  # for trend context


class StudentFeedbackResponse(BaseModel):
    headline: str                       # short motivational headline
    performance_summary: str            # 2-3 sentence personalised summary
    strengths: List[str]                # 2-3 strong areas
    growth_areas: List[str]             # 2-3 areas to improve
    next_steps: List[str]               # 3-4 concrete next actions
    motivational_note: str              # encouraging closing message
    predicted_next_score: Optional[float] = None  # AI prediction


# ── Badge Suggestion ───────────────────────────────────────────────────────────

class BadgeSuggestionRequest(BaseModel):
    student_name: str
    student_id: str
    total_tests_completed: int
    avg_score: float
    perfect_scores: int                 # tests with 100%
    pass_streak: int                    # consecutive passes
    total_points_earned: int
    subjects_mastered: List[str]
    fastest_completion_minutes: Optional[int] = None
    challenge_completions: Optional[int] = 0


class BadgeSuggestionResponse(BaseModel):
    earned_badges: List[Dict[str, str]] # [{id, name, description, tier, icon}]
    next_badge: Optional[Dict[str, Any]] # next badge to earn + progress %
    message: str
