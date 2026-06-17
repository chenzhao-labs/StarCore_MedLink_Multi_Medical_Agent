"""
Token streaming bridge: sync LangChain LLM → async SSE.
"""
import queue
import asyncio
import threading
from typing import Optional

from langchain_core.callbacks.base import BaseCallbackHandler


class TokenQueue:
    """Thread-safe queue bridging sync LLM token generation to async SSE."""

    def __init__(self):
        self._queue: queue.Queue[Optional[str]] = queue.Queue()
        self._done = threading.Event()
        self._started = False

    def put(self, token: str) -> None:
        self._started = True
        self._queue.put(token)

    def mark_done(self) -> None:
        self._done.set()
        self._queue.put(None)  # sentinel

    def error(self, message: str) -> None:
        if not self._started:
            self._queue.put(f"__ERROR__:{message}")
        self.mark_done()

    async def __aiter__(self):
        loop = asyncio.get_event_loop()
        while True:
            try:
                token = self._queue.get_nowait()
            except queue.Empty:
                if self._done.is_set():
                    return
                token = await loop.run_in_executor(None, self._queue.get)
            if token is None:
                return
            yield token


class TokenCallback(BaseCallbackHandler):
    """LangChain callback that feeds streaming tokens into a TokenQueue."""

    def __init__(self, token_queue: TokenQueue):
        super().__init__()
        self.token_queue = token_queue

    def on_llm_new_token(self, token: str, **kwargs) -> None:
        self.token_queue.put(token)
