"""
Personal Health Fact Indexer — manages the personal_health_facts Qdrant collection.

Each health fact (a medication, a condition, a log entry) is stored as an independent
chunk with its own embedding, enabling semantic retrieval: "最近容易累" matches "贫血史".
"""
import logging
from uuid import uuid4
from typing import List, Dict, Any

from langchain_core.documents import Document
from langchain_qdrant import FastEmbedSparse, QdrantVectorStore, RetrievalMode
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, SparseVectorParams, VectorParams

logger = logging.getLogger(__name__)

COLLECTION_NAME = "personal_health_facts"


class FactIndexer:
    """Creates and queries the personal_health_facts Qdrant collection."""

    def __init__(self, config):
        self.embedding_model = config.rag.embedding_model
        self.embedding_dim = config.rag.embedding_dim
        self.vectorstore_path = config.rag.vector_local_path
        self._client = QdrantClient(path=self.vectorstore_path)

    # ------------------------------------------------------------------
    # Collection lifecycle
    # ------------------------------------------------------------------

    def _collection_exists(self) -> bool:
        names = [c.name for c in self._client.get_collections().collections]
        return COLLECTION_NAME in names

    def ensure_collection(self) -> None:
        if self._collection_exists():
            return
        self._client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config={
                "dense": VectorParams(size=self.embedding_dim, distance=Distance.COSINE)
            },
            sparse_vectors_config={
                "sparse": SparseVectorParams()
            },
        )
        logger.info("Created collection: %s", COLLECTION_NAME)

    # ------------------------------------------------------------------
    # Indexing
    # ------------------------------------------------------------------

    def index_facts(self, facts: List[str], profile_id: str) -> int:
        """Embed and upsert fact chunks into Qdrant. Returns count of indexed facts."""
        if not facts:
            return 0

        self.ensure_collection()

        doc_ids = [str(uuid4()) for _ in facts]
        docs = [
            Document(
                page_content=fact,
                metadata={"profile_id": profile_id, "doc_id": doc_ids[i]},
            )
            for i, fact in enumerate(facts)
        ]

        sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")
        vectorstore = QdrantVectorStore(
            client=self._client,
            collection_name=COLLECTION_NAME,
            embedding=self.embedding_model,
            sparse_embedding=sparse_embeddings,
            retrieval_mode=RetrievalMode.HYBRID,
            vector_name="dense",
            sparse_vector_name="sparse",
        )
        vectorstore.add_documents(documents=docs, ids=doc_ids)
        logger.info("Indexed %d facts for profile %s", len(facts), profile_id)
        return len(facts)

    # ------------------------------------------------------------------
    # Retrieval
    # ------------------------------------------------------------------

    def search(self, query: str, profile_id: str, k: int = 3) -> List[Dict[str, Any]]:
        """Retrieve top-k relevant health facts for a query, scoped to one profile."""
        if not self._collection_exists():
            return []

        sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")
        vectorstore = QdrantVectorStore(
            client=self._client,
            collection_name=COLLECTION_NAME,
            embedding=self.embedding_model,
            sparse_embedding=sparse_embeddings,
            retrieval_mode=RetrievalMode.HYBRID,
            vector_name="dense",
            sparse_vector_name="sparse",
        )

        results = vectorstore.similarity_search_with_score(query, k=k)

        # Build filter — only return facts for this profile
        filtered = []
        for doc, score in results:
            if doc.metadata.get("profile_id") == profile_id:
                filtered.append({"content": doc.page_content, "score": score})

        return filtered

    # ------------------------------------------------------------------
    # Maintenance
    # ------------------------------------------------------------------

    def delete_profile(self, profile_id: str) -> bool:
        """Remove all facts for a profile (called when profile is deleted)."""
        if not self._collection_exists():
            return False
        from qdrant_client.http import models as qmodels

        self._client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="profile_id",
                        match=qmodels.MatchValue(value=profile_id),
                    )
                ]
            ),
        )
        logger.info("Deleted facts for profile %s", profile_id)
        return True

    def reindex_profile(self, profile_id: str, facts: List[str]) -> int:
        """Full rebuild: delete existing facts, then re-index."""
        self.delete_profile(profile_id)
        return self.index_facts(facts, profile_id)
