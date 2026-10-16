"""
Modelos de dominio del sistema de traducción y análisis lingüístico.
Representan las entidades de negocio independientes de frameworks o proveedores externos.
"""

from datetime import UTC, datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class TranslationTone(StrEnum):
    STANDARD = "standard"
    LITERARY = "literary"
    FORMAL = "formal"
    CASUAL = "casual"
    ACADEMIC = "academic"


class Language(BaseModel):
    code: str = Field(
        ..., description="Código ISO 639-1 o IETF del idioma (ej: 'en', 'es', 'zh-CN')"
    )
    name: str = Field(..., description="Nombre del idioma en español")
    native_name: str = Field(..., description="Nombre en el idioma nativo")
    flag: str = Field(default="", description="Identificador regional o código abreviado")


class VocabularyItem(BaseModel):
    word: str = Field(..., description="Palabra o lema clave extraído")
    phonetic: str | None = Field(None, description="Transcripción fonética o IPA")
    part_of_speech: str | None = Field(
        None, description="Categoría gramatical (sustantivo, verbo, etc.)"
    )
    definition: str = Field(..., description="Definición o significado en contexto")
    example: str | None = Field(None, description="Ejemplo de uso")
    difficulty_cefr: str | None = Field(
        None, description="Nivel aproximado MCER (A1, A2, B1, B2, C1, C2)"
    )


class GrammarNote(BaseModel):
    pattern: str = Field(..., description="Patrón o construcción gramatical identificada")
    explanation: str = Field(..., description="Explicación pedagógica de la estructura")
    cultural_tip: str | None = Field(None, description="Matiz cultural o falso amigo asociado")


class TranslationRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000, description="Texto original a traducir")
    target_lang: str = Field(
        ..., min_length=2, max_length=10, description="Código de idioma destino (ej: 'en', 'zh-CN')"
    )
    source_lang: str = Field(
        default="auto", min_length=2, max_length=10, description="Código de idioma origen o 'auto'"
    )
    tone: TranslationTone = Field(
        default=TranslationTone.STANDARD, description="Tono o estilo de la traducción"
    )
    include_analysis: bool = Field(
        default=False, description="Indica si se solicita análisis gramatical y de vocabulario"
    )


class TranslationResponse(BaseModel):
    original_text: str
    translated_text: str
    source_lang: str
    target_lang: str
    detected_source_lang: str | None = None
    provider_used: str = Field(
        ...,
        description="Proveedor que resolvió la traducción ('gemini', 'deep-translator', 'cache')",
    )
    latency_ms: float = Field(default=0.0, description="Tiempo de procesamiento en milisegundos")
    cached: bool = Field(
        default=False, description="True si la respuesta provino de la capa de caché"
    )
    vocabulary: list[VocabularyItem] = Field(
        default_factory=list, description="Desglose de vocabulario relevante"
    )
    grammar_notes: list[GrammarNote] = Field(
        default_factory=list, description="Notas gramaticales y contextuales"
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
