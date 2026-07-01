"""
Shared Qdrant local client — singleton for the process lifetime.

Qdrant local mode does not support multiple client instances accessing the
same storage directory concurrently. All indexers (FactIndexer,
SystemKnowledgeIndexer, VectorStore, etc.) must share one client.
"""
import threading
from qdrant_client import QdrantClient

_LOCK = threading.Lock()
_CLIENT = None  # type: QdrantClient | None


def get_qdrant_client(path: str = "./data/qdrant_db") -> QdrantClient:
    """Return the process-global QdrantClient instance, creating it on first call."""
    global _CLIENT
    if _CLIENT is not None:
        return _CLIENT
    with _LOCK:
        if _CLIENT is not None:
            return _CLIENT
        _CLIENT = QdrantClient(path=path)
        return _CLIENT
