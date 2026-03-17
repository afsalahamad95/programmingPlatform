"""A MCP server for AI agents to manage questions and tests"""

import os
import httpx
from fastmcp import FastMCP
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

mcp = FastMCP("programming-platform-mcp")

BACKEND_URL = "http://localhost:3000/api"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = "llama-3.3-70b-versatile"

_groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


@mcp.tool
async def fetch_tests() -> list:
    """Fetch all active and scheduled tests from the backend."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BACKEND_URL}/tests")
        return response.json()


@mcp.tool
async def fetch_questions() -> list:
    """Fetch all questions from the backend."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BACKEND_URL}/questions")
            if response.status_code == 200:
                return response.json()
    except Exception as e:
        print(f"Error fetching questions: {e}")
    return []


@mcp.tool
async def evolve_question(question_id: str) -> dict:
    """Uses LLM to create a new version of an existing question."""
    if not _groq_client:
        return {"error": "Groq client not configured"}

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{BACKEND_URL}/questions/{question_id}")
        if resp.status_code != 200:
            return {"error": f"Could not fetch question {question_id}"}
        question = resp.json()

    prompt = f"""
    You are an expert programming instructor. Evolve the following question to a 'v2' version.
    The new version should test the same core concept but with different parameters, 
    different code snippets, or different options (if MCQ).
    
    Current Question:
    {question}
    
    Return ONLY the updated JSON object representing the question. 
    Maintain the same schema.
    """

    # Groq-python client is sync, so we wrap it or use it as is
    completion = _groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        response_format={"type": "json_object"},
    )

    import json

    evolved_str = completion.choices[0].message.content
    try:
        evolved_data = json.loads(evolved_str)
        return evolved_data
    except Exception as e:
        return {"error": f"Failed to parse evolved question: {e}", "raw": evolved_str}


@mcp.tool
async def update_question(question_id: str, updated_data: dict) -> dict:
    """Update an existing question in the backend."""
    async with httpx.AsyncClient() as client:
        response = await client.put(
            f"{BACKEND_URL}/questions/{question_id}", json=updated_data
        )
        return response.json()


if __name__ == "__main__":
    mcp.run()
