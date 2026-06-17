"""
Centralized logging configuration.

Usage:
    from logging_config import setup_logging
    logger = setup_logging(__name__)

Set LOG_LEVEL in .env: DEBUG, INFO, WARNING, ERROR, CRITICAL (default: INFO).
"""

import logging
import os


def setup_logging(name: str = None) -> logging.Logger:
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        force=True,  # uvicorn 已配置 root logger，必须强制覆盖
    )
    return logging.getLogger(name)
