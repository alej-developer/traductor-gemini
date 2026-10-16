"""
Módulo de Dominio del Traductor Gemini.
"""

from src.domain.models import (
    GrammarNote,
    Language,
    TranslationRequest,
    TranslationResponse,
    TranslationTone,
    VocabularyItem,
)
from src.domain.ports import (
    ICacheRepository,
    IHistoryRepository,
    ILanguageCatalog,
    ITranslationProvider,
)

__all__ = [
    "GrammarNote",
    "ICacheRepository",
    "IHistoryRepository",
    "ILanguageCatalog",
    "ITranslationProvider",
    "Language",
    "TranslationRequest",
    "TranslationResponse",
    "TranslationTone",
    "VocabularyItem",
]
