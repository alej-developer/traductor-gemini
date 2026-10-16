"""
Motor orquestador de traducción con estrategia multi-proveedor, fallback automático y caché.
"""

import logging
import time

from src.domain.models import TranslationRequest, TranslationResponse
from src.domain.ports import ICacheRepository, ITranslationProvider
from src.infrastructure.cache.memory_cache import InMemoryCacheRepository

logger = logging.getLogger(__name__)


class TranslationEngine:
    """Orquestador de traducción de alta resiliencia."""

    def __init__(
        self,
        primary_provider: ITranslationProvider,
        fallback_provider: ITranslationProvider,
        cache: ICacheRepository | None = None,
    ):
        self.primary_provider = primary_provider
        self.fallback_provider = fallback_provider
        self.cache = cache

    async def translate(self, request: TranslationRequest) -> TranslationResponse:
        start_time = time.perf_counter()

        # 1. Comprobación en Caché
        cache_key = None
        if self.cache and isinstance(self.cache, InMemoryCacheRepository):
            cache_key = InMemoryCacheRepository.generate_key(
                text=request.text,
                source_lang=request.source_lang,
                target_lang=request.target_lang,
                tone=request.tone.value,
                include_analysis=request.include_analysis,
            )
            cached_result = await self.cache.get(cache_key)
            if cached_result:
                cached_result.latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                return cached_result

        # 2. Intento con Proveedor Primario (Gemini AI)
        response: TranslationResponse | None = None
        if self.primary_provider.is_available():
            try:
                response = await self.primary_provider.translate(request)
            except Exception as e:
                logger.warning(
                    f"Fallo en proveedor primario ({self.primary_provider.name}): {e}. "
                    f"Activando fallback hacia ({self.fallback_provider.name})."
                )

        # 3. Fallback a Proveedor Secundario (deep-translator) si fue necesario
        if response is None:
            logger.info(f"Traduciendo con motor fallback: {self.fallback_provider.name}")
            response = await self.fallback_provider.translate(request)

        # 4. Guardar en Caché
        if self.cache and cache_key and response:
            await self.cache.set(cache_key, response)

        return response
