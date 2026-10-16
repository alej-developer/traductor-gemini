"""
Pruebas unitarias para los modelos de dominio.
"""

from src.domain.models import (
    Language,
    TranslationRequest,
    TranslationResponse,
    TranslationTone,
    VocabularyItem,
)


def test_translation_request_defaults():
    req = TranslationRequest(text="Hello world", target_lang="es")
    assert req.source_lang == "auto"
    assert req.tone == TranslationTone.STANDARD
    assert req.include_analysis is False


def test_vocabulary_item_creation():
    item = VocabularyItem(
        word="wanderlust",
        phonetic="/ˈwɒndəlʌst/",
        part_of_speech="sustantivo",
        definition="Fuerte deseo de viajar y explorar el mundo",
        example="She was overcome by wanderlust.",
        difficulty_cefr="B2",
    )
    assert item.word == "wanderlust"
    assert item.difficulty_cefr == "B2"


def test_language_model():
    lang = Language(code="fi", name="Finés", native_name="Suomi", flag="")
    assert lang.code == "fi"
    assert lang.name == "Finés"


def test_translation_response_creation():
    res = TranslationResponse(
        original_text="Bonjour",
        translated_text="Hola",
        source_lang="fr",
        target_lang="es",
        provider_used="gemini",
        latency_ms=120.5,
    )
    assert res.cached is False
    assert res.latency_ms == 120.5
