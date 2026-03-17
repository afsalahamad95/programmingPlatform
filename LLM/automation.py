import logging
import httpx
from apscheduler.schedulers.background import BackgroundScheduler
from mcp_server import evolve_question, update_question
import asyncio

logger = logging.getLogger(__name__)

# Backend configuration
BACKEND_URL = "http://localhost:3000/api"


async def auto_evolve_questions():
    """Periodic task to evolve a subset of questions."""
    logger.info("Starting automatic question evolution task...")
    try:
        async with httpx.AsyncClient() as client:
            # 1. Fetch questions
            resp = await client.get(f"{BACKEND_URL}/questions")
            if resp.status_code != 200:
                logger.error(f"Failed to fetch questions: {resp.status_code}")
                return

            questions = resp.json()
            if not questions:
                logger.info("No questions found to evolve.")
                return

            # For demo/automation, we evolve the oldest one or a random one
            # Here we just take the first one that hasn't been evolved recently (placeholder logic)
            target = questions[0]
            q_id = target.get("id")

            logger.info(f"Automatically evolving question ID: {q_id}")

            # 2. Evolve
            evolved_json = await evolve_question(q_id)
            if evolved_json:
                # 3. Update in backend
                update_result = await update_question(q_id, evolved_json)
                logger.info(
                    f"Auto-evolution complete for {q_id}. Result: {update_result}"
                )

    except Exception as e:
        logger.error(f"Error in auto_evolve_questions: {e}")


def start_scheduler():
    scheduler = BackgroundScheduler()
    # Run every 24 hours (for testing, maybe every hour or triggered once)
    # scheduler.add_job(lambda: asyncio.run(auto_evolve_questions()), 'interval', hours=24)

    # Run once at startup for verification/demonstration
    scheduler.add_job(lambda: asyncio.run(auto_evolve_questions()), "date")

    scheduler.start()
    logger.info("Background scheduler started.")
    return scheduler
