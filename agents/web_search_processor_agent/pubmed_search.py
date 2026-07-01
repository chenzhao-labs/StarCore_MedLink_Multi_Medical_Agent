"""PubMed search via NCBI E-utilities API.

Returns article titles, abstracts, and links for medical literature search.
Rate limit: 3 requests/sec without API key, 10/sec with API key.
"""
import logging
import time
from typing import List, Dict
from urllib.parse import quote

import requests

logger = logging.getLogger(__name__)

ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"


class PubmedSearchAgent:
    """Search PubMed for medical literature and return structured results."""

    def __init__(self, api_key: str = "", tool: str = "StarCoreMedLink", email: str = ""):
        self.api_key = api_key
        self.tool = tool
        self.email = email
        self._last_request = 0.0

    # ------------------------------------------------------------------
    # Rate limiting
    # ------------------------------------------------------------------
    def _rate_limit(self):
        """Ensure we don't exceed NCBI rate limits."""
        min_interval = 0.1 if self.api_key else 0.34  # 10/s with key, ~3/s without
        elapsed = time.time() - self._last_request
        if elapsed < min_interval:
            time.sleep(min_interval - elapsed)
        self._last_request = time.time()

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------
    def search_pubmed(self, query: str, retmax: int = 5) -> str:
        """Search PubMed and return formatted results with titles and links.

        Returns a string suitable for inclusion in an LLM prompt.
        """
        if not query.strip():
            return ""

        # ── Step 1: Search for article IDs ──
        params: Dict[str, str | int] = {
            "db": "pubmed",
            "term": query,
            "retmode": "json",
            "retmax": retmax,
            "sort": "relevance",
            "tool": self.tool,
        }
        if self.email:
            params["email"] = self.email
        if self.api_key:
            params["api_key"] = self.api_key

        self._rate_limit()
        try:
            resp = requests.get(ESEARCH_URL, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.warning("PubMed search failed: %s", e)
            return ""

        article_ids: List[str] = data.get("esearchresult", {}).get("idlist", [])
        if not article_ids:
            return ""

        # ── Step 2: Fetch titles ──
        self._rate_limit()
        try:
            fetch_params: Dict[str, str | int] = {
                "db": "pubmed",
                "id": ",".join(article_ids),
                "retmode": "xml",
                "rettype": "abstract",
                "tool": self.tool,
            }
            if self.email:
                fetch_params["email"] = self.email
            if self.api_key:
                fetch_params["api_key"] = self.api_key

            resp = requests.get(EFETCH_URL, params=fetch_params, timeout=15)
            resp.raise_for_status()
            xml_text = resp.text
        except Exception as e:
            logger.warning("PubMed fetch failed, falling back to links only: %s", e)
            # Fallback: just return links
            links = [f"https://pubmed.ncbi.nlm.nih.gov/{aid}/" for aid in article_ids]
            return "PubMed Articles:\n" + "\n".join(f"- {link}" for link in links)

        # ── Step 3: Parse titles from XML (simple regex, no extra deps) ──
        import re
        titles: List[str] = []
        for aid in article_ids:
            # Find the ArticleTitle for this article
            pattern = re.compile(
                r"<PubmedArticle>.*?<PMID[^>]*>" + aid + r"</PMID>.*?<ArticleTitle>(.*?)</ArticleTitle>",
                re.DOTALL,
            )
            m = pattern.search(xml_text)
            title = m.group(1) if m else "Unknown title"
            titles.append(f"- [{title}](https://pubmed.ncbi.nlm.nih.gov/{aid}/)")

        if not titles:
            links = [f"https://pubmed.ncbi.nlm.nih.gov/{aid}/" for aid in article_ids]
            return "PubMed Articles:\n" + "\n".join(f"- {link}" for link in links)

        return "PubMed Articles:\n" + "\n".join(titles)
