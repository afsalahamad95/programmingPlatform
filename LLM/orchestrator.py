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


# ─── Orchestrator ─────────────────────────────────────────────────────────────

class Orchestrator:
    """Central dispatcher — routes tasks to agents and tracks timing."""

    TASK_AGENT_MAP = {
        "analyze_code":       "code_analyzer",
        "debug":              "debug_assistant",
        "update_skills":      "skill_updater",
        "interview_feedback": "interview_coach",
    }

    def __init__(self, groq_client: Groq, model: str):
        self._agents: Dict[str, BaseAgent] = {
            "code_analyzer":  CodeAnalyzerAgent(groq_client, model),
            "debug_assistant": DebugAssistantAgent(groq_client, model),
            "skill_updater":  SkillGraphUpdaterAgent(groq_client, model),
            "interview_coach": InterviewCoachAgent(groq_client, model),
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
