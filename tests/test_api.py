"""
Pruebas de integración para los endpoints de la API FastAPI.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from src.presentation.api.main import app


@pytest.mark.asyncio
async def test_health_liveness():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health/live")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "version" in data


@pytest.mark.asyncio
async def test_health_readiness():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert "providers" in data


@pytest.mark.asyncio
async def test_get_languages():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/languages")
        assert response.status_code == 200
        langs = response.json()
        assert isinstance(langs, list)
        assert any(lang["code"] == "en" for lang in langs)
        assert any(lang["code"] == "fi" for lang in langs)


@pytest.mark.asyncio
async def test_translate_api_endpoint(monkeypatch):
    # Mockeamos el engine en la API para evitar consumo innecesario de red en tests de integración
    from src.domain.models import TranslationResponse
    from src.presentation.api import main as api_module

    async def mock_translate(req):
        return TranslationResponse(
            original_text=req.text,
            translated_text="Texto traducido mock",
            source_lang="en",
            target_lang=req.target_lang,
            provider_used="mock",
            latency_ms=15.0,
        )

    monkeypatch.setattr(api_module.translation_engine, "translate", mock_translate)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "text": "Hello world",
            "target_lang": "es",
            "source_lang": "en",
            "tone": "standard",
            "include_analysis": False,
        }
        response = await client.post("/api/v1/translate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["translated_text"] == "Texto traducido mock"
        assert data["provider_used"] == "mock"


@pytest.mark.asyncio
async def test_static_index_serves():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        assert "Traductor Gemini Enterprise" in response.text
