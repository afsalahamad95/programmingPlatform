"""Agentic Orchestrator — routes incoming tasks to the appropriate specialist agent.

Agents registered:
  • code_analyzer   — static analysis + quality score
  • debug_assistant — root-cause analysis + fix steps
  • skill_updater   — post-test skill graph update
  • interview_coach — interview session feedback
  • hint_generator  — non-spoiling question hints (delegates to server endpoint)

The orchestrator is intentionally stateless — each call is independent so it
can be called from FastAPI endpoints or from the background scheduler without
holding global locks.
"""

import json
import logging
import time
from typing import Any, Dict, Optional

from groq import Groq

logger = logging.getLogger(__name__)


# ─── Base Agent ───────────────────────────────────────────────────────────────

class BaseAgent:
    """Every specialist agent extends this. Provides shared Groq access."""

    name: str = "base"

    def __init__(self, groq_client: Groq, model: str):
        self._client = groq_client
        self._model = model

    def _call(self, prompt: str, temperature: float = 0.3, max_tokens: int = 2048, json_mode: bool = False) -> str:
        kwargs: Dict[str, Any] = {
            "model": self._model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        resp = self._client.chat.completions.create(**kwargs)
        return resp.choices[0].message.content or ""


# ─── Code Analyzer Agent ─────────────────────────────────────────────────────

class CodeAnalyzerAgent(BaseAgent):
    """Analyses student code for correctness, complexity, and style."""

    name = "code_analyzer"

    def run(self, code: str, language: str, question: Optional[str]) -> Dict[str, Any]:
        task_context = f"\nTask description: {question}" if question else ""
        prompt = f"""You are an expert code reviewer for a programming education platform.
Analyse the following {language} code snippet and respond ONLY with valid JSON matching this schema exactly:
{{
  "correctness": "<short verdict>",
  "issues": ["<issue 1>", ...],
  "suggestions": ["<suggestion 1>", ...],
  "complexity": "<time and space complexity>",
  "improved_code": "<refactored snippet or null>",
  "debug_hint": "<one-line hint toward fixing the main issue, no spoilers>",
  "score": <integer 0-100>
}}

Rules:
- Be concise — max 3 issues, max 3 suggestions.
- improved_code: only include if there are meaningful corrections (< 30 lines). Otherwise null.
- debug_hint: guide thinking, never give the direct answer.
- score: 100 = perfect, 0 = non-functional.
{task_context}

Code:
```{language}
{code}
```"""
        raw = self._call(prompt, temperature=0.2, json_mode=True)
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.error("CodeAnalyzerAgent: failed to parse JSON: %s", raw[:200])
            return {
                "correctness": "Analysis unavailable",
                "issues": [],
                "suggestions": [],
                "complexity": "Unknown",
                "improved_code": None,
                "debug_hint": None,
                "score": 0,
            }


# ─── Debug Assistant Agent ────────────────────────────────────────────────────

class DebugAssistantAgent(BaseAgent):
    """Given code + error message, diagnoses root cause and suggests fix steps."""

    name = "debug_assistant"

    def run(self, code: str, error_message: str, language: str) -> Dict[str, Any]:
        prompt = f"""You are an expert debugger and patient programming tutor.
A student has the following {language} code that produces an error.
Respond ONLY with valid JSON:
{{
  "root_cause": "<one sentence>",
  "explanation": "<2-3 sentences explaining why this error occurs>",
  "fix_steps": ["<step 1>", "<step 2>", ...],
  "fixed_code": "<corrected snippet or null if too long>",
  "related_concepts": ["<concept>", ...]
}}

Rules:
- fix_steps: 2-4 actionable steps, never just "fix the bug".
- related_concepts: 1-3 concepts the student should study.
- fixed_code: only if the fix is < 20 lines. Otherwise null.

Error:
{error_message}

Code:
```{language}
{code}
```"""
        raw = self._call(prompt, temperature=0.25, json_mode=True)
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.error("DebugAssistantAgent: failed to parse JSON: %s", raw[:200])
            return {
                "root_cause": "Unable to parse error",
                "explanation": error_message,
                "fix_steps": ["Review the error message carefully"],
                "fixed_code": None,
                "related_concepts": [],
            }


# ─── Skill Graph Updater Agent ────────────────────────────────────────────────

class SkillGraphUpdaterAgent(BaseAgent):
    """Maps test performance to skill scores and recommends learning paths."""

    name = "skill_updater"

    def run(
        self,
        student_id: str,
        test_title: str,
        score_pct: float,
        subject_breakdown: Dict[str, Any],
        languages_used: Optional[list] = None,
    ) -> Dict[str, Any]:
        subjects_str = "\n".join(
            f"- {subj}: {data.get('correct', 0)}/{data.get('total', 1)} correct"
            for subj, data in subject_breakdown.items()
        )
        langs_str = ", ".join(languages_used) if languages_used else "not specified"

        prompt = f"""You are a skill assessment engine for a programming education platform.
Based on a student's test performance, compute updated skill scores and learning recommendations.
Respond ONLY with valid JSON:
{{
  "updated_skills": {{
    "<skill_name>": <score_0_to_100>,
    ...
  }},
  "message": "<brief motivational summary>",
  "recommendations": ["<learning recommendation 1>", ...]
}}

Rules:
- updated_skills: extract 3-6 skill names from the subject breakdown and assign scores based on performance.
- Score = (correct / total) * 100, adjusted for overall performance.
- If overall score < 40, reduce all skill scores by 10%.
- recommendations: 2-4 specific, actionable learning suggestions targeting weak areas.

Test: {test_title}
Overall score: {score_pct:.1f}%
Languages used: {langs_str}

Subject breakdown:
{subjects_str}"""
        raw = self._call(prompt, temperature=0.2, json_mode=True)
        try:
            data = json.loads(raw)
            # Enforce score bounds
            updated = {k: max(0.0, min(100.0, float(v))) for k, v in data.get("updated_skills", {}).items()}
            return {
                "updated_skills": updated,
                "message": data.get("message", "Skill graph updated."),
                "recommendations": data.get("recommendations", []),
            }
        except (json.JSONDecodeError, ValueError) as e:
            logger.error("SkillGraphUpdaterAgent: failed to parse response: %s | raw: %s", e, raw[:200])
            return {
                "updated_skills": {},
                "message": "Skill update unavailable.",
                "recommendations": [],
            }


# ─── Interview Coach Agent ────────────────────────────────────────────────────

class InterviewCoachAgent(BaseAgent):
    """Evaluates a completed mock interview transcript."""

    name = "interview_coach"

    def run(self, transcript: list, role: str, difficulty: str) -> Dict[str, Any]:
        conversation = "\n".join(
            f"{m['role'].upper()}: {m['content']}"
            for m in transcript
            if m.get("role") in ("user", "assistant")
        )
        prompt = f"""You are an expert technical interviewer evaluating a mock interview for a {role} position ({difficulty} difficulty).
Respond ONLY with valid JSON:
{{
  "overall_score": <0-100>,
  "technical_score": <0-100>,
  "communication_score": <0-100>,
  "strengths": ["<strength 1>", ...],
  "improvements": ["<area to improve 1>", ...],
  "detailed_feedback": "<2-3 paragraph narrative>",
  "recommended_topics": ["<topic 1>", ...]
}}

Rules:
- Scores: 0=terrible, 50=average, 80=good, 95+=exceptional.
- strengths: 2-3 items.
- improvements: 2-3 specific items with actionable advice.
- recommended_topics: 3-5 topics to study based on gaps identified.

Interview Transcript:
{conversation}"""
        raw = self._call(prompt, temperature=0.3, max_tokens=1500, json_mode=True)
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.error("InterviewCoachAgent: failed to parse JSON: %s", raw[:200])
            return {
                "overall_score": 50,
                "technical_score": 50,
                "communication_score": 50,
                "strengths": [],
                "improvements": ["Unable to analyse transcript"],
                "detailed_feedback": "Feedback generation failed. Please try again.",
                "recommended_topics": [],
            }


# ─── Performance Analyzer Agent ──────────────────────────────────────────────

class PerformanceAnalyzerAgent(BaseAgent):
    """Generates executive-level insights from aggregated analytics data."""

    name = "performance_analyzer"

    def run(self, analytics: Dict[str, Any]) -> Dict[str, Any]:
        test_titles = [t.get("title", "") for t in analytics.get("test_breakdown", [])[:5]]
        student_names = [s.get("name", "") for s in analytics.get("student_breakdown", [])[:10]]
        low_scorers = [
            s.get("name", "") for s in analytics.get("student_breakdown", [])
            if s.get("avgScore", 100) < 40
        ][:5]
        top_performers = [
            s.get("name", "") for s in (analytics.get("leaderboard") or analytics.get("student_breakdown", []))[:3]
        ]
        hardest = [
            t.get("title", "") for t in analytics.get("test_breakdown", [])
            if t.get("passRate", 100) < 50
        ][:3]

        score_dist_str = ", ".join(
            f"{d['range']}: {d['count']}" for d in analytics.get("scoreDistribution", [])
        )

        prompt = f"""You are an expert educational analytics AI for a programming platform administrator.
Analyse the following cohort performance data and generate actionable insights.
Respond ONLY with valid JSON:
{{
  "summary": "<2-3 sentence executive overview>",
  "key_insights": ["<insight 1>", "<insight 2>", "<insight 3>", "<insight 4>"],
  "risk_students": ["<name 1>", ...],
  "top_performers": ["<name 1>", ...],
  "hardest_content": ["<test/topic 1>", ...],
  "recommendations": ["<admin action 1>", "<admin action 2>", "<admin action 3>"],
  "trend": "<improving|declining|stable>",
  "trend_explanation": "<one sentence>"
}}

Rules:
- summary: highlight overall health, critical numbers.
- key_insights: data-driven, mention specific percentages/counts.
- risk_students: pull from low scorers list.
- recommendations: specific, admin-actionable (e.g. "Schedule remedial session on X").
- trend: compare pass rate and avg score to determine direction.

Analytics Data:
- Total Attempts: {analytics.get('totalAttempts', 0)}
- Average Score: {analytics.get('avgScore', 0):.1f}%
- Pass Rate: {analytics.get('passRate', 0):.1f}%
- Unique Students: {analytics.get('uniqueStudents', 0)}
- Unique Tests: {analytics.get('uniqueTests', 0)}
- Score Distribution: {score_dist_str}
- Recent Tests: {', '.join(test_titles)}
- Students in System: {', '.join(student_names[:5])}
- At-Risk Students (avg < 40%): {', '.join(low_scorers) if low_scorers else 'None'}
- Top Performers: {', '.join(top_performers)}
- Hardest Tests (pass rate < 50%): {', '.join(hardest) if hardest else 'None identified'}"""

        raw = self._call(prompt, temperature=0.3, max_tokens=1500, json_mode=True)
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.error("PerformanceAnalyzerAgent: failed to parse JSON: %s", raw[:200])
            return {
                "summary": "Analytics data processed. Review the dashboard for details.",
                "key_insights": [],
                "risk_students": low_scorers,
                "top_performers": top_performers,
                "hardest_content": hardest,
                "recommendations": ["Review student performance data", "Schedule follow-up sessions"],
                "trend": "stable",
                "trend_explanation": "Insufficient data for trend analysis.",
            }


# ─── Student Feedback Agent ───────────────────────────────────────────────────

class StudentFeedbackAgent(BaseAgent):
    """Generates personalised AI feedback for an individual student's test result."""

    name = "student_feedback"

    def run(
        self,
        student_name: str,
        test_title: str,
        score_pct: float,
        grade: str,
        correct: int,
        incorrect: int,
        pending: int,
        total_questions: int,
        subject_breakdown: Dict[str, Any],
        time_spent_seconds: Optional[int] = None,
        previous_score_pct: Optional[float] = None,
    ) -> Dict[str, Any]:
        subjects_str = "\n".join(
            f"- {s}: {d.get('correct',0)}/{d.get('total',1)} correct"
            for s, d in subject_breakdown.items()
        )
        strong = [s for s, d in subject_breakdown.items() if d.get("total", 1) > 0 and d.get("correct", 0) / d.get("total", 1) >= 0.7]
        weak   = [s for s, d in subject_breakdown.items() if d.get("total", 1) > 0 and d.get("correct", 0) / d.get("total", 1) < 0.5]
        trend_note = ""
        if previous_score_pct is not None:
            delta = score_pct - previous_score_pct
            trend_note = f"Previous score: {previous_score_pct:.1f}% (delta: {delta:+.1f}%)"
        time_note = f"Time spent: {time_spent_seconds // 60}m {time_spent_seconds % 60}s" if time_spent_seconds else ""

        prompt = f"""You are a compassionate, encouraging AI tutor giving personalised feedback to a student.
Respond ONLY with valid JSON:
{{
  "headline": "<upbeat 5-8 word headline>",
  "performance_summary": "<2-3 sentences personalised summary>",
  "strengths": ["<strong area 1>", "<strong area 2>"],
  "growth_areas": ["<area 1>", "<area 2>"],
  "next_steps": ["<concrete step 1>", "<concrete step 2>", "<concrete step 3>"],
  "motivational_note": "<1 sentence motivational closing>",
  "predicted_next_score": <float or null>
}}

Rules:
- headline: celebratory if grade >= B, supportive if lower.
- performance_summary: mention name, test, grade, and one standout strength or area to grow.
- strengths: pull from subject_breakdown where accuracy >= 70%.
- growth_areas: pull from subject_breakdown where accuracy < 50%.
- next_steps: specific resources or actions (e.g. "Practice array problems on LeetCode").
- predicted_next_score: estimate improvement if they follow next_steps (null if first attempt).
- tone: warm, growth-mindset, never discouraging.

Student: {student_name}
Test: {test_title}
Grade: {grade} ({score_pct:.1f}%)
Results: {correct} correct, {incorrect} incorrect, {pending} pending / {total_questions} total
{time_note}
{trend_note}

Subject performance:
{subjects_str}

Strong subjects: {', '.join(strong) if strong else 'None identified'}
Weak subjects: {', '.join(weak) if weak else 'None identified'}"""

        raw = self._call(prompt, temperature=0.45, max_tokens=1000, json_mode=True)
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.error("StudentFeedbackAgent: failed to parse JSON: %s", raw[:200])
            return {
                "headline": f"Keep it up, {student_name}!",
                "performance_summary": f"You scored {score_pct:.1f}% on {test_title}. Keep pushing forward!",
                "strengths": strong[:2],
                "growth_areas": weak[:2],
                "next_steps": ["Review incorrect answers", "Practice weak topics", "Attempt again after revision"],
                "motivational_note": "Every attempt makes you stronger. Keep going!",
                "predicted_next_score": min(score_pct + 10, 100) if previous_score_pct is None else None,
            }


# ─── Orchestrator ─────────────────────────────────────────────────────────────

class Orchestrator:
    """Central dispatcher — routes tasks to agents and tracks timing."""

    TASK_AGENT_MAP = {
        "analyze_code":          "code_analyzer",
        "debug":                 "debug_assistant",
        "update_skills":         "skill_updater",
        "interview_feedback":    "interview_coach",
        "performance_analysis":  "performance_analyzer",
        "student_feedback":      "student_feedback",
    }

    def __init__(self, groq_client: Groq, model: str):
        self._agents: Dict[str, BaseAgent] = {
            "code_analyzer":       CodeAnalyzerAgent(groq_client, model),
            "debug_assistant":     DebugAssistantAgent(groq_client, model),
            "skill_updater":       SkillGraphUpdaterAgent(groq_client, model),
            "interview_coach":     InterviewCoachAgent(groq_client, model),
            "performance_analyzer": PerformanceAnalyzerAgent(groq_client, model),
            "student_feedback":    StudentFeedbackAgent(groq_client, model),
        }

    def dispatch(self, task: str, payload: Dict[str, Any], student_id: Optional[str] = None) -> Dict[str, Any]:
        agent_name = self.TASK_AGENT_MAP.get(task)
        if not agent_name or agent_name not in self._agents:
            raise ValueError(f"Unknown task: '{task}'. Available: {list(self.TASK_AGENT_MAP)}")

        agent = self._agents[agent_name]
        logger.info("Orchestrator: dispatching task='%s' to agent='%s' (student=%s)", task, agent_name, student_id)

        t0 = time.perf_counter()
        try:
            if task == "analyze_code":
                result = agent.run(
                    code=payload["code"],
                    language=payload.get("language", "python"),
                    question=payload.get("question"),
                )
            elif task == "debug":
                result = agent.run(
                    code=payload["code"],
                    error_message=payload["error_message"],
                    language=payload.get("language", "python"),
                )
            elif task == "update_skills":
                result = agent.run(
                    student_id=student_id or payload.get("student_id", "unknown"),
                    test_title=payload["test_title"],
                    score_pct=float(payload["score_pct"]),
                    subject_breakdown=payload.get("subject_breakdown", {}),
                    languages_used=payload.get("languages_used"),
                )
            elif task == "interview_feedback":
                result = agent.run(
                    transcript=payload["transcript"],
                    role=payload.get("role", "Software Engineer"),
                    difficulty=payload.get("difficulty", "Medium"),
                )
            elif task == "performance_analysis":
                result = agent.run(analytics=payload)
            elif task == "student_feedback":
                result = agent.run(
                    student_name=payload.get("student_name", "Student"),
                    test_title=payload.get("test_title", "Assessment"),
                    score_pct=float(payload.get("score_pct", 0)),
                    grade=payload.get("grade", "F"),
                    correct=int(payload.get("correct", 0)),
                    incorrect=int(payload.get("incorrect", 0)),
                    pending=int(payload.get("pending", 0)),
                    total_questions=int(payload.get("total_questions", 0)),
                    subject_breakdown=payload.get("subject_breakdown", {}),
                    time_spent_seconds=payload.get("time_spent_seconds"),
                    previous_score_pct=payload.get("previous_score_pct"),
                )
            else:
                result = {}

            duration_ms = (time.perf_counter() - t0) * 1000
            logger.info("Orchestrator: task='%s' completed in %.1fms", task, duration_ms)
            return {
                "task": task,
                "result": result,
                "agent_used": agent_name,
                "duration_ms": round(duration_ms, 1),
                "cached": False,
            }
        except Exception as e:
            logger.error("Orchestrator: task='%s' failed: %s", task, e)
            raise
