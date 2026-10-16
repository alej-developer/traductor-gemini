"""
Pruebas unitarias para el motor de traducción y estrategia de fallback.
"""

import pytest

from src.application.engine import TranslationEngine
from src.domain.models import TranslationRequest, TranslationResponse
from src.domain.ports import ITranslationProvider


class MockFailingProvider(ITranslationProvider):
    @property
    def name(self) -> str:
        return "mock_failing"

    def is_available(self) -> bool:
        return True

    async def translate(self, request: TranslationRequest) -> TranslationResponse:
        raise ConnectionError("API quota exceeded or server unreachable")


class MockSuccessfulProvider(ITranslationProvider):
    def __init__(self, name: str = "mock_success"):
        self._name = name

    @property
    def name(self) -> str:
        return self._name

    def is_available(self) -> bool:
        return True

    async def translate(self, request: TranslationRequest) -> TranslationResponse:
        return TranslationResponse(
            original_text=request.text,
            translated_text=f"translated: {request.text}",
            source_lang=request.source_lang,
            target_lang=request.target_lang,
            provider_used=self.name,
            latency_ms=25.0,
        )


@pytest.mark.asyncio
async def test_engine_primary_success():
    primary = MockSuccessfulProvider("gemini_mock")
    fallback = MockSuccessfulProvider("fallback_mock")
    engine = TranslationEngine(primary_provider=primary, fallback_provider=fallback)

    req = TranslationRequest(text="Good morning", target_lang="es")
    res = await engine.translate(req)

    assert res.provider_used == "gemini_mock"
    assert res.translated_text == "translated: Good morning"


@pytest.mark.asyncio
async def test_engine_fallback_on_primary_failure():
    primary = MockFailingProvider()
    fallback = MockSuccessfulProvider("deep_translator_mock")
    engine = TranslationEngine(primary_provider=primary, fallback_provider=fallback)

    req = TranslationRequest(text="Good morning", target_lang="es")
    res = await engine.translate(req)

    # Verifica que el fallback tomó el control tras el fallo del primario
    assert res.provider_used == "deep_translator_mock"
    assert res.translated_text == "translated: Good morning"
