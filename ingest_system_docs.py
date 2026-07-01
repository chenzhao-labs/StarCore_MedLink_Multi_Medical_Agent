"""One-shot script to index system documentation into Qdrant.

Usage:
    python ingest_system_docs.py [--dir data/system_docs]
"""
import sys
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from config import Config
from agents.system_knowledge_indexer import SystemKnowledgeIndexer
from logging_config import setup_logging

logger = setup_logging(__name__)


def main():
    parser = argparse.ArgumentParser(description="Index system docs into Qdrant")
    parser.add_argument("--dir", type=str, default=None, help="Path to system_docs directory")
    args = parser.parse_args()

    config = Config()
    indexer = SystemKnowledgeIndexer(config)
    count = indexer.index_docs(docs_dir=args.dir)
    logger.info("Done — indexed %d chunks into system_knowledge collection.", count)


if __name__ == "__main__":
    main()
