import logging
import httpx
from apscheduler.schedulers.background import BackgroundScheduler
from mcp_server import evolve_question, update_question, generate_questions_from_context
import asyncio
import json
from crawler import gather_knowledge_for_roles

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


async def auto_crawl_and_generate():
    """Periodic task to crawl sites and generate new questions based on user roles."""
    logger.info("Starting automatic KB evolution (crawl and generate)...")
    try:
        async with httpx.AsyncClient() as client:
            # 1. Fetch users to get active roles and preferences
            user_resp = await client.get(f"{BACKEND_URL}/users")
            if user_resp.status_code != 200:
                logger.error("Failed to fetch users for KB generation")
                return
            users = user_resp.json()
            
            roles = set()
            prefs = set()
            for u in users:
                if u.get("targetRole"):
                    roles.add(u["targetRole"])
                if u.get("preferences"):
                    for p in u["preferences"]:
                        prefs.add(p)
            
            # 2. Crawl matching documentation sources
            logger.info(f"Targeting roles: {roles}, prefs: {prefs}")
            context_map = await gather_knowledge_for_roles(list(roles), list(prefs))
            if not context_map:
                logger.info("No context crawled.")
                return
                
            # 3. Generate questions via LLM
            # For simplicity, we just generate for the most popular role or iterate 1 by 1
            main_role = list(roles)[0] if roles else "fullstack"
            
            all_generated = []
            for url, text_content in context_map.items():
                logger.info(f"Generating questions from context: {url}")
                qa_list = await generate_questions_from_context(text_content, main_role)
                if qa_list:
                    all_generated.extend(qa_list)
                    
            # 4. Save to backend
            for q in all_generated:
                post_resp = await client.post(f"{BACKEND_URL}/questions", json=q)
                if post_resp.status_code in [200, 201]:
                    logger.info("Successfully saved generated question to DB.")
                else:
                    logger.error(f"Failed to save question: {post_resp.text}")
                    
    except Exception as e:
        logger.error(f"Error in auto_crawl_and_generate: {e}")


def start_scheduler():
    scheduler = BackgroundScheduler()
    # Run every 24 hours (for testing, maybe every hour or triggered once)
    # scheduler.add_job(lambda: asyncio.run(auto_evolve_questions()), 'interval', hours=24)

    # Run once at startup for verification/demonstration
    scheduler.add_job(lambda: asyncio.run(auto_evolve_questions()), "date")
    # Also add the new crawl and generate job
    scheduler.add_job(lambda: asyncio.run(auto_crawl_and_generate()), "date")

    scheduler.start()
    logger.info("Background scheduler started.")
    return scheduler
