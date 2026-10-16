"""
Pruebas unitarias para el repositorio de caché en memoria.
"""

import pytest

from src.domain.models import TranslationResponse
from src.infrastructure.cache.memory_cache import InMemoryCacheRepository


@pytest.mark.asyncio
async def test_cache_set_and_get():
    cache = InMemoryCacheRepository(default_ttl_seconds=60)
    key = InMemoryCacheRepository.generate_key("hello", "auto", "es", "standard", False)

    response = TranslationResponse(
        original_text="hello",
        translated_text="hola",
        source_lang="en",
        target_lang="es",
        provider_used="test",
        latency_ms=10.0,
    )

    await cache.set(key, response)
    cached = await cache.get(key)

    assert cached is not None
    assert cached.translated_text == "hola"
    assert cached.cached is True


@pytest.mark.asyncio
async def test_cache_expiration():
    cache = InMemoryCacheRepository(default_ttl_seconds=1)
    key = "sample_key"

    response = TranslationResponse(
        original_text="test",
        translated_text="prueba",
        source_lang="en",
        target_lang="es",
        provider_used="test",
    )

    # Set with 0 second TTL to expire immediately
    await cache.set(key, response, ttl_seconds=-1)
    cached = await cache.get(key)
    assert cached is None
