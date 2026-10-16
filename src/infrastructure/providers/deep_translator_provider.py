"""
Adaptador de infraestructura para deep-translator y motor de traducción Google GTX.
Actúa como motor secundario / fallback ultra-rápido sin necesidad de API Key.
"""

import logging
import time

import anyio
import requests
from deep_translator import GoogleTranslator

from src.domain.models import TranslationRequest, TranslationResponse
from src.domain.ports import ITranslationProvider

logger = logging.getLogger(__name__)


class DeepTranslatorProvider(ITranslationProvider):
    """Proveedor basado en la API de Google Translate y deep-translator."""

    @property
    def name(self) -> str:
        return "deep-translator"

    def is_available(self) -> bool:
        return True

    def _sync_translate(self, text: str, source: str, target: str) -> tuple[str, str | None]:
        # Intento 1: API directa de Google Translate GTX (alta velocidad y estabilidad)
        try:
            resp = requests.get(
                "https://translate.googleapis.com/translate_a/single",
                params={
                    "client": "gtx",
                    "sl": source,
                    "tl": target,
                    "dt": "t",
                    "q": text,
                },
                timeout=10,
                headers={"User-Agent": "Mozilla/5.0"},
            )
            if resp.status_code == 200:
                data = resp.json()
                if data and len(data) > 0 and data[0]:
                    translated_chunks = [part[0] for part in data[0] if part and part[0]]
                    translated_text = "".join(translated_chunks)
                    detected_src = data[2] if len(data) > 2 and isinstance(data[2], str) else None
                    if translated_text:
                        return translated_text, detected_src
        except Exception as err:
            logger.warning(f"Error en Google GTX API: {err}. Intentando con deep-translator...")

        # Intento 2: Scraper deep-translator
        try:
            translator = GoogleTranslator(source=source, target=target)
            result = translator.translate(text)
            return str(result), None
        except Exception as exc:
            logger.error(f"Fallo en deep-translator: {exc}")
            raise RuntimeError(f"Error al traducir con el motor fallback: {exc}") from exc

    async def translate(self, request: TranslationRequest) -> TranslationResponse:
        start_time = time.perf_counter()

        # Ejecución en threadpool para no bloquear el bucle de eventos asyncio
        translated_text, detected_src = await anyio.to_thread.run_sync(
            self._sync_translate, request.text, request.source_lang, request.target_lang
        )

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return TranslationResponse(
            original_text=request.text,
            translated_text=translated_text,
            source_lang=request.source_lang,
            target_lang=request.target_lang,
            detected_source_lang=detected_src
            if detected_src
            else (None if request.source_lang == "auto" else request.source_lang),
            provider_used=self.name,
            latency_ms=latency_ms,
            cached=False,
            vocabulary=[],
            grammar_notes=[],
        )
