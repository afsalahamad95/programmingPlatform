"""Background automation pipeline.

Schedules:
  • Every 24h  — auto-evolve a batch of questions (LLM rewrite for freshness)
  • Every 12h  — crawl documentation and generate new questions per active user roles
  • Every 6h   — adaptive KB ingest for active students' skill set
  • Every 1h   — push pending skill-graph updates for recently active students

The scheduler is started in server.py's lifespan and runs in-process.
"""

import logging
import asyncio
import httpx
from apscheduler.schedulers.background import BackgroundScheduler
from mcp_server import evolve_question, update_question, generate_questions_from_context
from crawler import gather_knowledge_for_roles

logger = logging.getLogger(__name__)

BACKEND_URL = "http://localhost:3000/api"
LLM_URL = "http://localhost:8000/llm"

# ─── Question Evolution ───────────────────────────────────────────────────────

async def auto_evolve_questions():
    """Rewrite a batch of questions using the LLM to keep content fresh."""
    logger.info("[Scheduler] Starting question evolution task…")
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(f"{BACKEND_URL}/questions")
            if resp.status_code != 200:
                logger.error("[Scheduler] Failed to fetch questions: %s", resp.status_code)
                return

            questions = resp.json()
            if not questions:
                logger.info("[Scheduler] No questions to evolve.")
                return

            # Evolve up to 3 questions per run to avoid rate limiting
            batch = questions[:3]
            for target in batch:
                q_id = target.get("id")
                if not q_id:
                    continue
                try:
                    evolved_json = await evolve_question(q_id)
                    if evolved_json:
                        update_result = await update_question(q_id, evolved_json)
                        logger.info("[Scheduler] Evolved question %s → %s", q_id, update_result)
                except Exception as q_err:
                    logger.warning("[Scheduler] Failed to evolve question %s: %s", q_id, q_err)

    except Exception as e:
        logger.error("[Scheduler] auto_evolve_questions error: %s", e)


# ─── KB Growth (Crawl + Generate) ────────────────────────────────────────────

async def auto_crawl_and_generate():
    """Crawl docs for active user roles and generate new questions."""
    logger.info("[Scheduler] Starting KB evolution (crawl + generate)…")
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            user_resp = await client.get(f"{BACKEND_URL}/users")
            if user_resp.status_code != 200:
                logger.error("[Scheduler] Failed to fetch users")
                return

            users = user_resp.json()
            roles: set = set()
            prefs: set = set()
            for u in users:
                if u.get("targetRole"):
                    roles.add(u["targetRole"])
                for p in u.get("preferences", []):
                    prefs.add(p)

            if not roles:
                logger.info("[Scheduler] No user roles found, skipping KB growth.")
                return

            logger.info("[Scheduler] Targeting roles=%s prefs=%s", roles, prefs)
            context_map = await gather_knowledge_for_roles(list(roles), list(prefs))
            if not context_map:
                return

            main_role = next(iter(roles))
            for url, text_content in context_map.items():
                qa_list = await generate_questions_from_context(text_content, main_role)
                for q in (qa_list or []):
                    post_resp = await client.post(f"{BACKEND_URL}/questions", json=q)
                    if post_resp.status_code in [200, 201]:
                        logger.info("[Scheduler] Saved generated question from %s", url)
                    else:
                        logger.warning("[Scheduler] Failed to save question: %s", post_resp.text[:100])

    except Exception as e:
        logger.error("[Scheduler] auto_crawl_and_generate error: %s", e)


# ─── Adaptive KB Ingest ───────────────────────────────────────────────────────

async def auto_adaptive_kb_ingest():
    """For recently active students, ingest documentation for their top skills."""
    logger.info("[Scheduler] Starting adaptive KB ingest…")
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            user_resp = await client.get(f"{BACKEND_URL}/users")
            if user_resp.status_code != 200:
                return

            users = user_resp.json()
            # Process up to 5 users per run
            for user in users[:5]:
                uid = user.get("id") or user.get("_id")
                if not uid:
                    continue
                try:
                    await client.post(f"{LLM_URL}/adaptive-ingest", params={"student_id": uid}, timeout=15)
                    logger.info("[Scheduler] Adaptive ingest triggered for user %s", uid)
                except Exception as user_err:
                    logger.warning("[Scheduler] Adaptive ingest failed for user %s: %s", uid, user_err)

    except Exception as e:
        logger.error("[Scheduler] auto_adaptive_kb_ingest error: %s", e)


# ─── Post-test Skill Graph Update ─────────────────────────────────────────────

async def auto_skill_graph_sync():
    """Push skill graph updates for recent test submissions.

    Reads the last 20 attempts, calls /llm/skill-graph-update for each
    attempt that has a recognized studentId, and lets the orchestrator
    persist the deltas back to the user module.
    """
    logger.info("[Scheduler] Starting skill graph sync…")
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(f"{BACKEND_URL}/admin-protected/test-results", timeout=10)
            if resp.status_code != 200:
                logger.warning("[Scheduler] Could not fetch test results: %s", resp.status_code)
                return

            attempts = resp.json()
            recent = attempts[:20]  # process only the most recent 20

            for attempt in recent:
                student_id = attempt.get("studentId")
                if not student_id:
                    continue

                subject_breakdown = {}
                for ans in attempt.get("answers", []):
                    qtype = ans.get("questionType", "General")
                    if qtype not in subject_breakdown:
                        subject_breakdown[qtype] = {"correct": 0, "total": 0}
                    subject_breakdown[qtype]["total"] += 1
                    if ans.get("score", 0) > 0:
                        subject_breakdown[qtype]["correct"] += 1

                payload = {
                    "student_id": student_id,
                    "test_title": attempt.get("testTitle", "Unknown Test"),
                    "score_pct": attempt.get("percentageScore", 0),
                    "subject_breakdown": subject_breakdown,
                }

                try:
                    sg_resp = await client.post(f"{LLM_URL}/skill-graph-update", json=payload, timeout=20)
                    if sg_resp.status_code == 200:
                        logger.info("[Scheduler] Skill graph updated for student %s", student_id)
                    else:
                        logger.warning("[Scheduler] Skill graph update failed: %s", sg_resp.text[:100])
                except Exception as sg_err:
                    logger.warning("[Scheduler] Skill graph sync error for %s: %s", student_id, sg_err)

    except Exception as e:
        logger.error("[Scheduler] auto_skill_graph_sync error: %s", e)


# ─── Scheduler Bootstrap ──────────────────────────────────────────────────────

def _run(coro):
    """Helper: run an async coroutine from the sync scheduler thread."""
    asyncio.run(coro)


def start_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="UTC")

    # Question evolution — daily at 02:00 UTC
    scheduler.add_job(
        lambda: _run(auto_evolve_questions()),
        trigger="cron",
        hour=2,
        minute=0,
        id="evolve_questions",
        replace_existing=True,
    )

    # KB growth — every 12 hours
    scheduler.add_job(
        lambda: _run(auto_crawl_and_generate()),
        trigger="interval",
        hours=12,
        id="kb_growth",
        replace_existing=True,
    )

    # Adaptive KB ingest — every 6 hours
    scheduler.add_job(
        lambda: _run(auto_adaptive_kb_ingest()),
        trigger="interval",
        hours=6,
        id="adaptive_kb",
        replace_existing=True,
    )

    # Skill graph sync — every hour
    scheduler.add_job(
        lambda: _run(auto_skill_graph_sync()),
        trigger="interval",
        hours=1,
        id="skill_graph_sync",
        replace_existing=True,
    )

    # One-shot at startup for immediate verification
    scheduler.add_job(lambda: _run(auto_evolve_questions()), "date", id="startup_evolve")
    scheduler.add_job(lambda: _run(auto_adaptive_kb_ingest()), "date", id="startup_ingest")

    scheduler.start()
    logger.info(
        "[Scheduler] Started. Jobs: %s",
        [job.id for job in scheduler.get_jobs()],
    )
    return scheduler
