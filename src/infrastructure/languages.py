"""
Catálogo enriquecido de idiomas soportados.
"""

from src.domain.models import Language
from src.domain.ports import ILanguageCatalog


class InMemoryLanguageCatalog(ILanguageCatalog):
    """Catálogo en memoria de idiomas con metadatos y nombres nativos."""

    _LANGUAGES: dict[str, Language] = {
        "en": Language(code="en", name="Inglés", native_name="English", flag=""),
        "zh-CN": Language(
            code="zh-CN", name="Chino (Simplificado)", native_name="简体中文", flag=""
        ),
        "fi": Language(code="fi", name="Finés", native_name="Suomi", flag=""),
        "it": Language(code="it", name="Italiano", native_name="Italiano", flag=""),
        "es": Language(code="es", name="Español", native_name="Español", flag=""),
        "fr": Language(code="fr", name="Francés", native_name="Français", flag=""),
        "de": Language(code="de", name="Alemán", native_name="Deutsch", flag=""),
        "ja": Language(code="ja", name="Japonés", native_name="日本語", flag=""),
        "pt": Language(code="pt", name="Portugués", native_name="Português", flag=""),
        "ko": Language(code="ko", name="Coreano", native_name="한국어", flag=""),
        "ru": Language(code="ru", name="Ruso", native_name="Русский", flag=""),
    }

    def list_languages(self) -> list[Language]:
        return list(self._LANGUAGES.values())

    def get_by_code(self, code: str) -> Language | None:
        return self._LANGUAGES.get(code)


# Singleton
language_catalog = InMemoryLanguageCatalog()
