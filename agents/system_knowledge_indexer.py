"""
System Knowledge Indexer — manages the system_knowledge Qdrant collection.

Stores and retrieves system documentation (features, FAQ, privacy, limitations,
usage guide) as semantic chunks, powering the SYSTEM_HELP_AGENT's RAG capability.
"""
import os
import logging
from uuid import uuid4
from typing import List, Dict, Any, Optional

from langchain_core.documents import Document
from langchain_qdrant import FastEmbedSparse, QdrantVectorStore, RetrievalMode
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, SparseVectorParams, VectorParams
from utils.qdrant_client import get_qdrant_client

logger = logging.getLogger(__name__)

COLLECTION_NAME = "system_knowledge"

# Default system docs directory relative to project root
_DEFAULT_DOCS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "system_docs")


class SystemKnowledgeIndexer:
    """Creates and queries the system_knowledge Qdrant collection."""

    def __init__(self, config):
        self.embedding_model = config.rag.embedding_model
        self.embedding_dim = config.rag.embedding_dim
        self.vectorstore_path = config.rag.vector_local_path
        self._client = get_qdrant_client(self.vectorstore_path)

    # ------------------------------------------------------------------
    # Collection lifecycle
    # ------------------------------------------------------------------

    def _collection_exists(self) -> bool:
        names = [c.name for c in self._client.get_collections().collections]
        return COLLECTION_NAME in names

    def ensure_collection(self) -> None:
        """Create the system_knowledge collection if it doesn't exist."""
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

    def _split_markdown(self, content: str, source: str, max_chunk: int = 400) -> List[Document]:
        """Split a Markdown file into chunks by headings. Each chunk keeps its
        heading path for standalone readability."""
        lines = content.split("\n")
        docs: List[Document] = []
        current_heading = ""
        current_lines: List[str] = []

        def _flush():
            nonlocal current_lines, current_heading
            text = "\n".join(current_lines).strip()
            if not text:
                current_lines = []
                return
            heading_prefix = f"[{source}] {current_heading.strip('# ').strip()}" if current_heading else f"[{source}]"
            full = f"{heading_prefix}\n{text}"
            # If still too long, split further at paragraph boundaries
            if len(full) > max_chunk:
                paragraphs = text.split("\n\n")
                for para in paragraphs:
                    para = para.strip()
                    if not para:
                        continue
                    chunk = f"{heading_prefix}\n{para}"
                    docs.append(Document(
                        page_content=chunk[:max_chunk * 2],
                        metadata={"source": source, "topic": current_heading.strip("# ").strip()},
                    ))
            else:
                docs.append(Document(
                    page_content=full,
                    metadata={"source": source, "topic": current_heading.strip("# ").strip()},
                ))
            current_lines = []

        for line in lines:
            if line.startswith("#"):
                _flush()
                current_heading = line
                current_lines = [line]
            else:
                current_lines.append(line)
        _flush()
        return docs

    def index_docs(self, docs_dir: Optional[str] = None) -> int:
        """Index all Markdown files in docs_dir into the system_knowledge collection.

        Returns the number of chunks indexed.
        """
        docs_dir = docs_dir or _DEFAULT_DOCS_DIR
        docs_dir = os.path.abspath(docs_dir)

        if not os.path.isdir(docs_dir):
            logger.warning("System docs directory not found: %s", docs_dir)
            return 0

        md_files = sorted(
            f for f in os.listdir(docs_dir) if f.endswith(".md")
        )
        if not md_files:
            logger.warning("No .md files found in %s", docs_dir)
            return 0

        self.ensure_collection()

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

        total = 0
        for fname in md_files:
            fpath = os.path.join(docs_dir, fname)
            with open(fpath, "r", encoding="utf-8") as fh:
                content = fh.read()
            docs = self._split_markdown(content, source=fname)
            if not docs:
                continue
            ids = [str(uuid4()) for _ in docs]
            vectorstore.add_documents(documents=docs, ids=ids)
            logger.info("Indexed %d chunks from %s", len(docs), fname)
            total += len(docs)

        logger.info("System knowledge indexing complete: %d total chunks", total)
        return total

    # ------------------------------------------------------------------
    # Retrieval
    # ------------------------------------------------------------------

    def search(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """Retrieve top-k relevant system knowledge chunks for a query."""
        if not query or not query.strip():
            return []
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

        filtered = []
        for doc, score in results:
            filtered.append({
                "content": doc.page_content,
                "source": doc.metadata.get("source", ""),
                "topic": doc.metadata.get("topic", ""),
                "score": score,
            })

        return filtered
