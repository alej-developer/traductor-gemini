"""
Adaptador de caché en memoria de alta velocidad con TTL y desalojo automático.
"""

import hashlib
import time

from src.domain.models import TranslationResponse
from src.domain.ports import ICacheRepository


class InMemoryCacheRepository(ICacheRepository):
    """Implementación de caché en memoria ultra-rápida (sub-milisegundo)."""

    def __init__(self, default_ttl_seconds: int = 86400):
        self._cache: dict[str, tuple[TranslationResponse, float]] = {}
        self._default_ttl = default_ttl_seconds

    @staticmethod
    def generate_key(
        text: str, source_lang: str, target_lang: str, tone: str, include_analysis: bool
    ) -> str:
        raw_key = f"{text.strip().lower()}||{source_lang.strip().lower()}||{target_lang.strip().lower()}||{tone}||{include_analysis}"
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    async def get(self, key: str) -> TranslationResponse | None:
        item = self._cache.get(key)
        if not item:
            return None

        response, expire_at = item
        now = time.time()
        if now > expire_at:
            # Expirado
            del self._cache[key]
            return None

        # Retornamos copia marcada como cached
        cached_copy = response.model_copy()
        cached_copy.cached = True
        return cached_copy

    async def set(
        self, key: str, value: TranslationResponse, ttl_seconds: int | None = None
    ) -> None:
        ttl = ttl_seconds if ttl_seconds is not None else self._default_ttl
        expire_at = time.time() + ttl
        self._cache[key] = (value, expire_at)

    def clear(self) -> None:
        self._cache.clear()
