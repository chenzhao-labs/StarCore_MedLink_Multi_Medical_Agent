import os
import logging
from typing import Dict

from .pubmed_search import PubmedSearchAgent
from .tavily_search import TavilySearchAgent

logger = logging.getLogger(__name__)


class WebSearchAgent:
    """Agent responsible for retrieving real-time medical information from web sources.

    Combines Tavily (general web search) and PubMed (medical literature) results.
    """

    def __init__(self, config):
        self.tavily_search_agent = TavilySearchAgent(tavily_api_key=config.tavily_api_key)

        # PubMed (Phase 1.3)
        pubmed_api_key = os.getenv("PUBMED_API_KEY", "")
        pubmed_email = os.getenv("PUBMED_EMAIL", "")
        self.pubmed_search_agent = PubmedSearchAgent(
            api_key=pubmed_api_key, email=pubmed_email
        )

    def search(self, query: str) -> str:
        """Perform both general (Tavily) and medical-specific (PubMed) searches."""
        tavily_results = self.tavily_search_agent.search_tavily(query=query)

        pubmed_results = ""
        try:
            pubmed_results = self.pubmed_search_agent.search_pubmed(query)
        except Exception as e:
            logger.warning("PubMed search failed, continuing with Tavily only: %s", e)

        if pubmed_results:
            return f"Tavily Results:\n{tavily_results}\n\n{pubmed_results}"
        return f"Tavily Results:\n{tavily_results}\n"
