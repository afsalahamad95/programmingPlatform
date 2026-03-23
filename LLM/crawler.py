import httpx
from bs4 import BeautifulSoup
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

# A simple mapping of roles/preferences to documentation URLs for the crawler
KNOWLEDGE_SOURCES = {
    "frontend": [
        "https://react.dev/learn",
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
        "https://developer.mozilla.org/en-US/docs/Web/CSS",
    ],
    "backend": [
        "https://go.dev/doc/effective_go",
        "https://docs.python.org/3/tutorial/index.html",
        "https://nodejs.org/en/learn",
    ],
    "fullstack": [
        "https://react.dev/learn",
        "https://go.dev/doc/effective_go",
        "https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs",
    ],
    "ai": [
        "https://pytorch.org/tutorials/",
        "https://scikit-learn.org/stable/tutorial/index.html",
        "https://huggingface.co/docs/transformers/index",
    ],
    "react": ["https://react.dev/learn", "https://react.dev/reference/react"],
    "go": ["https://go.dev/doc/effective_go", "https://go.dev/tour/welcome/1"],
    "python": ["https://docs.python.org/3/tutorial/index.html"],
    "node.js": ["https://nodejs.org/en/learn"],
}

async def crawl_site(url: str) -> str:
    """Fetches a URL and extracts the main text content."""
    logger.info(f"Crawling {url}...")
    try:
        # Use a browser-like user agent to avoid basic blocks
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove scripts, styles, and navigation elements
            for el in soup(["script", "style", "nav", "footer", "header", "aside"]):
                el.extract()
                
            # Focus on main content areas if possible
            main_content = soup.find('main') or soup.find('article') or soup.find('div', class_='content') or soup.body
            
            if not main_content:
                return ""
                
            text = main_content.get_text(separator=' ', strip=True)
            
            # Limit to a reasonable chunk for the LLM (e.g., first 5000 characters)
            return text[:5000]
            
    except Exception as e:
        logger.error(f"Failed to crawl {url}: {e}")
        return ""

async def gather_knowledge_for_roles(roles: List[str], preferences: List[str]) -> Dict[str, str]:
    """Crawls relevant sources based on roles and preferences to build a knowledge context context."""
    context_map = {}
    
    # Combine standard distinct sources
    targets = set()
    for role in roles:
        role_key = role.lower()
        if role_key in KNOWLEDGE_SOURCES:
            targets.update(KNOWLEDGE_SOURCES[role_key])
            
    for pref in preferences:
        pref_key = pref.lower()
        if pref_key in KNOWLEDGE_SOURCES:
            targets.update(KNOWLEDGE_SOURCES[pref_key])
            
    # Default to general if nothing matched
    if not targets:
        targets.update(KNOWLEDGE_SOURCES["fullstack"])
        
    # Crawl each target (limit to top 3 to avoid spamming/slow generation)
    target_list = list(targets)[:3]
    for target in target_list:
        content = await crawl_site(target)
        if content:
            context_map[target] = content
            
    return context_map
