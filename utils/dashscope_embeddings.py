import os
import logging
from typing import List

import dashscope
from langchain_core.embeddings import Embeddings

logger = logging.getLogger(__name__)


class DashScopeEmbeddings(Embeddings):
    """LangChain Embeddings backed by DashScope native TextEmbedding API.

    Uses dashscope.TextEmbedding.call() directly, avoiding openai SDK
    compatibility issues with DashScope's OpenAI-compatible endpoint.
    """

    def __init__(self, model: str = "text-embedding-v1", api_key: str = ""):
        self.model = model
        dashscope.api_key = api_key or os.getenv("DASHSCOPE_API_KEY", "")

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of documents. Batched to stay under API limits."""
        texts = [t for t in texts if t.strip()]
        if not texts:
            return []

        all_embeddings: List[List[float]] = []
        batch_size = 6

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            resp = dashscope.TextEmbedding.call(
                model=self.model,
                input=batch,
            )

            output = resp.get("output")
            if output is None or "embeddings" not in (output or {}):
                logger.error("DashScope embedding API error: code=%s message=%s",
                             resp.get("code"), resp.get("message"))
                raise RuntimeError(
                    f"DashScope embedding API error: {resp.get('code')} - {resp.get('message')}"
                )

            for emb in output["embeddings"]:
                embedding = emb.get("embedding")
                if not embedding:
                    text_idx = emb.get("text_index", "unknown")
                    raise RuntimeError(
                        f"DashScope returned empty embedding for text_index={text_idx}"
                    )
                all_embeddings.append(embedding)

        return all_embeddings

    def embed_query(self, text: str) -> List[float]:
        """Embed a single query text."""
        embeddings = self.embed_documents([text])
        return embeddings[0] if embeddings else []
