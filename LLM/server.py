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
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from duckduckgo_search import DDGS
from groq import Groq
from models.schema import (
    ChatRequest,
    ChatResponse,
    IngestRequest,
    IngestResponse,
    ResumeRequest,
    RoadmapRequest,
    CareerResponse,
    RoadmapFromResultRequest,
    HintRequest,
    HintResponse,
    TranscriptionResponse,
    CodeAnalysisRequest,
    CodeAnalysisResponse,
    DebugRequest,
    DebugResponse,
    SkillUpdateRequest,
    SkillUpdateResponse,
    InterviewFeedbackRequest,
    InterviewFeedbackResponse,
    OrchestratorRequest,
    OrchestratorResponse,
)
import httpx
from contextlib import asynccontextmanager
from automation import start_scheduler
from orchestrator import Orchestrator

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


def perform_web_search(query: str, max_results: int = 5) -> str:
    """Search the web using DuckDuckGo and return a concatenated string of results."""
    logger.info("Performing web search for: %s", query)
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
            if not results:
                return ""

            context_pieces = []
            for r in results:
                title = r.get("title", "")
                body = r.get("body", "")
                context_pieces.append(f"Source: {title}\nContent: {body}")

            return "\n\n---\n\n".join(context_pieces)
    except Exception as e:
        logger.error("Web search failed: %s", e)
        return ""


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
_orchestrator: Optional[Orchestrator] = None
if GROQ_API_KEY:
    _groq_client = Groq(api_key=GROQ_API_KEY)
    _orchestrator = Orchestrator(groq_client=_groq_client, model=GROQ_MODEL)
    logger.info("Groq client + Orchestrator initialised with model '%s'", GROQ_MODEL)
else:
    logger.warning(
        "GROQ_API_KEY not set — /llm/chat and agent endpoints will return errors. "
        "/llm/ingest and /health still work."
    )


# ── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start background scheduler
    scheduler = start_scheduler()
    logger.info("Lifespan: Scheduler started.")
    yield
    # Shutdown: Stop scheduler
    scheduler.shutdown()
    logger.info("Lifespan: Scheduler shut down.")


# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Programming Platform LLM Server",
    lifespan=lifespan,
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
    DISTANCE_THRESHOLD = 0.6  # Adjust based on 'cosine' space

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
        distances: List[float] = results.get("distances", [[]])[0]

        # Only keep docs within the similarity threshold
        filtered_docs = []
        for doc, dist in zip(retrieved_docs, distances):
            if dist <= DISTANCE_THRESHOLD:
                doc_str = str(doc)
                filtered_docs.append(doc_str)
                sources.append(doc_str[:120] + "…" if len(doc_str) > 120 else doc_str)

        if filtered_docs:
            context_block = "\n\n".join(
                f"[Local Context {i + 1}]: {doc}" for i, doc in enumerate(filtered_docs)
            )

    # ── 3. Web Search Fallback ────────────────────────────────────────────────
    is_web_search = False
    if not context_block:
        logger.info("No local context above threshold. Falling back to web search.")
        web_context = perform_web_search(query_text)
        if web_context:
            context_block = web_context
            is_web_search = True
            sources.append("Web Search (DuckDuckGo)")

    # ── 4. Build the system prompt ────────────────────────────────────────────
    system_prompt = (
        "You are a helpful AI assistant embedded in a programming education platform. "
        "You help students understand programming concepts, debug code, and prepare for tests and challenges. "
        "Be concise, accurate, and encouraging.\n\n"
    )

    if context_block:
        source_type = "web search" if is_web_search else "local knowledge-base"
        system_prompt += (
            f"Use the following {source_type} context to answer the user's question. "
            "If the context is not directly relevant, still try to help based on your general knowledge.\n\n"
            f"{context_block}"
        )
    else:
        system_prompt += (
            "The knowledge base is currently empty and web search yielded no results. "
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
        return ChatResponse(answer=answer, sources=sources)
    except Exception as exc:
        logger.error("Groq API error: %s", exc)
        raise HTTPException(
            status_code=502,
            detail=f"LLM generation failed: {exc}",
        ) from exc


# ── Career & Adaptive Endpoints ──────────────────────────────────────────────
@app.post("/llm/resume", response_model=CareerResponse)
async def generate_resume(req: ResumeRequest):
    """Fetch student profile and generate a professional resume."""
    if not _groq_client:
        raise HTTPException(status_code=500, detail="Groq not configured")

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"http://localhost:3000/api/users/{req.student_id}")
        if resp.status_code != 200:
            raise HTTPException(status_code=404, detail="Student not found")
        student_data = resp.json()

    prompt = (
        f"You are a professional technical resume writer. "
        f"Based on the following student profile, create a polished, one-page markdown resume. "
        f"Include skills, projects, and certifications. Format it beautifully.\n\n"
        f"Student Profile: {student_data}"
    )

    try:
        completion = _groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        return CareerResponse(answer=completion.choices[0].message.content)
    except Exception as e:
        logger.error(f"Resume generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/llm/roadmap", response_model=CareerResponse)
async def generate_roadmap(req: RoadmapRequest):
    """Fetch student profile and generate a career roadmap towards a target role."""
    if not _groq_client:
        raise HTTPException(status_code=500, detail="Groq not configured")

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"http://localhost:3000/api/users/{req.student_id}")
        if resp.status_code != 200:
            raise HTTPException(status_code=404, detail="Student not found")
        student_data = resp.json()

    prompt = (
        f"You are a career coach. Based on the student's current skills and projects, "
        f"create a step-by-step career roadmap to become a '{req.target_role}'. "
        f"Highlight specific skills to learn and project ideas. Output in markdown.\n\n"
        f"Current Profile: {student_data}"
    )

    try:
        completion = _groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
        )
        return CareerResponse(answer=completion.choices[0].message.content)
    except Exception as e:
        logger.error(f"Roadmap generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/llm/adaptive-ingest")
async def adaptive_ingest(student_id: str):
    """Automatically fetch and ingest docs based on user learning goals."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"http://localhost:3000/api/users/{student_id}")
        if resp.status_code != 200:
            raise HTTPException(status_code=404, detail="Student not found")
        student = resp.json()

    technical_skills = student.get("technicalSkills", {})
    all_skills = (
        technical_skills.get("programmingLanguages", [])
        + technical_skills.get("frameworks", [])
        + technical_skills.get("tools", [])
    )

    if not all_skills:
        return {"message": "No skills found to evolve KB."}

    logger.info(f"Adaptive Ingest: Evolving KB for skills: {all_skills}")
    # Adaptive Ingestion logic: Search documentation for these skills
    for skill in all_skills[:3]:  # Limit to top 3 for speed
        doc_context = perform_web_search(
            f"{skill} official documentation overview", max_results=1
        )
        if doc_context:
            _collection.add(
                ids=[str(uuid.uuid4())],
                documents=[doc_context],
                metadatas=[{"source": "adaptive_ingest", "skill": skill}],
            )

    return {
        "message": "Knowledge base updated based on user learning goals.",
        "skills_processed": all_skills[:3],
    }
@app.post("/llm/roadmap-from-result", response_model=CareerResponse)
async def generate_roadmap_from_result(req: RoadmapFromResultRequest):
    """Generate a personalised study roadmap based on a specific test performance."""
    if not _groq_client:
        raise HTTPException(status_code=500, detail="Groq not configured")

    subjects_str = "\n".join([f"- {s}: {d['correct']}/{d['total']}" for s, d in req.subject_breakdown.items()])
    weak_topics_str = "\n".join([f"- {t}" for t in req.weak_topics[:5]]) # Limit to 5 for brevity

    prompt = (
        f"You are an expert technical mentor. Generate a highly personalised, phased study roadmap for a student "
        f"named {req.student_name} who just completed a test titled '{req.test_title}'.\n\n"
        f"### Performance Summary:\n"
        f"- Grade: {req.grade} ({req.score_pct:.1f}%)\n"
        f"- Statistics: {req.correct} Correct, {req.incorrect} Incorrect, {req.pending} Pending Review\n"
        f"- Total Questions: {req.total_questions}\n\n"
        f"### Subject Breakdown:\n{subjects_str}\n\n"
        f"### Areas Needing Improvement (Weak Topics):\n{weak_topics_str}\n\n"
        f"Please provide a 4-week study plan to master these weak areas and progress further. "
        f"Use emojis, markdown tables, and clear headings. Make it feel encouraging and 'futuristic' in tone."
    )

    try:
        completion = _groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
        )
        return CareerResponse(answer=completion.choices[0].message.content)
    except Exception as e:
        logger.error(f"Roadmap from result generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from pydantic import BaseModel

class AutoScheduleRequest(BaseModel):
    prompt: str
    available_questions: list # list of dicts: id, title, topic, type

class AutoScheduleResponse(BaseModel):
    title: str
    description: str
    duration: int
    selected_question_ids: list

@app.post("/llm/auto-schedule", response_model=AutoScheduleResponse)
async def auto_schedule_test(req: AutoScheduleRequest):
    """Automatically generate test specs and pick questions based on admin prompt."""
    if not _groq_client:
        raise HTTPException(status_code=500, detail="Groq not configured")

    import json
    questions_context = json.dumps(req.available_questions)

    prompt = (
        f"You are an AI test generation assistant for a tech platform admin. "
        f"The admin wants to generate a test based on this description: '{req.prompt}'.\n\n"
        f"Available questions in the question bank (JSON format):\n"
        f"{questions_context}\n\n"
        f"Task:\n"
        f"1. Generate a fitting, professional 'title'.\n"
        f"2. Generate a compelling 'description'.\n"
        f"3. Estimate an appropriate 'duration' in minutes (integer).\n"
        f"4. Select a subset of 'selected_question_ids' from the available questions that best match the prompt.\n\n"
        f"Output ONLY a valid JSON object matching this schema exactly:\n"
        f"{{\n"
        f"  \"title\": \"string\",\n"
        f"  \"description\": \"string\",\n"
        f"  \"duration\": number,\n"
        f"  \"selected_question_ids\": [\"id1\", \"id2\"]\n"
        f"}}\n"
        f"Do not include any intro, outro, or markdown backticks."
    )

    try:
        completion = _groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        content = completion.choices[0].message.content
        data = json.loads(content)
        return AutoScheduleResponse(**data)
    except Exception as e:
        logger.error(f"Auto-schedule generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/llm/test-hint", response_model=HintResponse, tags=["test-assistance"])
async def generate_test_hint(req: HintRequest):
    """Generate a helpful, non-spoiling hint for a test question."""
    if not _groq_client:
        raise HTTPException(status_code=500, detail="Groq not configured")

    prompt = (
        f"You are an AI Teaching Assistant for a programming platform. "
        f"A student is stuck on a {req.question_type} question and needs a hint. "
        f"CRITICAL: Do NOT provide the direct answer. Provide a conceptual hint that points them in the right direction.\n\n"
        f"Question Content:\n{req.question_content}\n\n"
        f"Requirements:\n"
        f"1. Keep the hint concise (1-2 sentences).\n"
        f"2. Focus on the core logic or syntax needed.\n"
        f"3. Do not reveal the correct option if it is an MCQ.\n"
        f"4. If it is a coding question, suggest a logical step or a relevant function/method name."
    )

    try:
        completion = _groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=256,
        )
        hint_text = completion.choices[0].message.content or "Try breaking the problem into smaller steps."
        return HintResponse(hint=hint_text)
    except Exception as e:
        logger.error(f"Hint generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/llm/transcribe", response_model=TranscriptionResponse, tags=["audio"])
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe audio using Groq Whisper-large-v3."""
    if not _groq_client:
        raise HTTPException(status_code=503, detail="Groq not configured")
    
    try:
        # Read file into memory
        contents = await file.read()
        filename = file.filename or "audio.wav"
        
        # Call Groq Whisper API
        # Groq expects a tuple (filename, file_body, content_type)
        transcription = _groq_client.audio.transcriptions.create(
            file=(filename, contents),
            model="whisper-large-v3",
            response_format="json",
        )
        return TranscriptionResponse(text=transcription.text)
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


# ── Agent Endpoints ───────────────────────────────────────────────────────────

def _require_orchestrator():
    if not _orchestrator:
        raise HTTPException(status_code=503, detail="Groq / Orchestrator not configured. Set GROQ_API_KEY.")


@app.post("/llm/analyze-code", response_model=CodeAnalysisResponse, tags=["agents"])
async def analyze_code(req: CodeAnalysisRequest):
    """Code Analyzer Agent — static analysis, bug detection, quality score, complexity."""
    _require_orchestrator()
    try:
        result = _orchestrator.dispatch(
            task="analyze_code",
            payload={
                "code": req.code,
                "language": req.language,
                "question": req.question,
            },
            student_id=req.student_id,
        )
        return CodeAnalysisResponse(**result["result"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("analyze-code failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/llm/debug-assist", response_model=DebugResponse, tags=["agents"])
async def debug_assist(req: DebugRequest):
    """Debug Assistant Agent — root cause analysis + fix steps for runtime errors."""
    _require_orchestrator()
    try:
        result = _orchestrator.dispatch(
            task="debug",
            payload={
                "code": req.code,
                "error_message": req.error_message,
                "language": req.language,
            },
            student_id=req.student_id,
        )
        return DebugResponse(**result["result"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("debug-assist failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/llm/skill-graph-update", response_model=SkillUpdateResponse, tags=["agents"])
async def skill_graph_update(req: SkillUpdateRequest):
    """Skill Graph Updater Agent — maps test scores to skill graph deltas.

    After calling this endpoint, you should persist the updated_skills back
    to the user module via POST /api/students/{id}/activity with skill metadata.
    """
    _require_orchestrator()
    try:
        result = _orchestrator.dispatch(
            task="update_skills",
            payload={
                "student_id": req.student_id,
                "test_title": req.test_title,
                "score_pct": req.score_pct,
                "subject_breakdown": req.subject_breakdown,
                "languages_used": req.languages_used,
            },
            student_id=req.student_id,
        )
        skill_data = result["result"]

        # Persist each updated skill back to the user module in the background
        async def _persist_skills():
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    for skill, score in skill_data.get("updated_skills", {}).items():
                        await client.post(
                            f"http://localhost:3000/api/students/{req.student_id}/activity",
                            json={
                                "action": "SKILL_UPDATED",
                                "metadata": {"skill": skill, "score": score},
                            },
                        )
            except Exception as persist_err:
                logger.warning("Failed to persist skill updates: %s", persist_err)

        import asyncio
        asyncio.create_task(_persist_skills())

        return SkillUpdateResponse(**skill_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("skill-graph-update failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/llm/interview-feedback", response_model=InterviewFeedbackResponse, tags=["agents"])
async def interview_feedback(req: InterviewFeedbackRequest):
    """Interview Coach Agent — evaluates a completed mock interview transcript."""
    _require_orchestrator()
    try:
        result = _orchestrator.dispatch(
            task="interview_feedback",
            payload={
                "transcript": req.transcript,
                "role": req.role,
                "difficulty": req.difficulty,
            },
            student_id=req.student_id,
        )
        return InterviewFeedbackResponse(**result["result"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("interview-feedback failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/llm/orchestrate", response_model=OrchestratorResponse, tags=["agents"])
async def orchestrate(req: OrchestratorRequest):
    """Generic orchestrator endpoint — dispatches any registered task by name.

    Supported tasks: analyze_code, debug, update_skills, interview_feedback.
    """
    _require_orchestrator()
    try:
        result = _orchestrator.dispatch(
            task=req.task,
            payload=req.payload,
            student_id=req.student_id,
        )
        return OrchestratorResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("orchestrate failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
