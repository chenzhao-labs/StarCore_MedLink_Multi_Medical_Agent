import os
import pickle


class LocalFileStore:
    """Simple file-based key-value store, replacement for the removed langchain.storage.LocalFileStore."""

    def __init__(self, path: str):
        self._path = path
        os.makedirs(path, exist_ok=True)

    def _key_path(self, key: str) -> str:
        return os.path.join(self._path, f"{key}.pkl")

    def mset(self, items: list[tuple[str, bytes]]) -> None:
        for key, value in items:
            with open(self._key_path(key), "wb") as f:
                f.write(value)

    def mget(self, keys: list[str]) -> list[bytes | None]:
        results = []
        for key in keys:
            p = self._key_path(key)
            if os.path.exists(p):
                with open(p, "rb") as f:
                    results.append(f.read())
            else:
                results.append(None)
        return results
