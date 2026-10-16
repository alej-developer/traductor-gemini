"""
Adaptador de infraestructura para la API oficial de Google Gemini (google-genai SDK).
Ofrece traducción contextual avanzada, detección de tono y análisis pedagógico de vocabulario y gramática.
"""

import json
import logging
import time

import anyio
from google import genai
from google.genai import types

from src.domain.models import (
    GrammarNote,
    TranslationRequest,
    TranslationResponse,
    VocabularyItem,
)
from src.domain.ports import ITranslationProvider

logger = logging.getLogger(__name__)


class GeminiProvider(ITranslationProvider):
    """Proveedor inteligente de traducción y análisis lingüístico impulsado por Gemini."""

    def __init__(self, api_key: str | None = None, model: str = "gemini-2.5-flash"):
        self._api_key = api_key
        self._model = model
        self._client: genai.Client | None = None

        if self._api_key and self._api_key.strip() and self._api_key != "your_gemini_api_key_here":
            try:
                self._client = genai.Client(api_key=self._api_key)
            except Exception as e:
                logger.warning(f"No se pudo inicializar el cliente de Gemini: {e}")
                self._client = None

    @property
    def name(self) -> str:
        return "gemini"

    def is_available(self) -> bool:
        return self._client is not None

    def _build_prompt(self, request: TranslationRequest) -> str:
        instructions = f"""Eres un motor senior de traducción multilingüe y lingüista experto.
Traduce el siguiente texto hacia el idioma destino: '{request.target_lang}'.
Idioma origen especificado: '{request.source_lang}'.
Tono/Estilo requerido: '{request.tone.value}'.

Instrucciones:
1. Traduce con fidelidad, precisión contextual y naturalidad nativa.
2. Identifica el idioma de origen si fue especificado como 'auto'.
3. Si include_analysis es verdadero ({request.include_analysis}), extrae entre 2 y 5 palabras o expresiones clave para aprendizaje (con pronunciación aproximada, definición breve, categoría gramatical y nivel MCER estimado de A1 a C2), y 1 o 2 notas gramaticales o matices culturales útiles.

Responde ESTRICTAMENTE con un objeto JSON válido con la siguiente estructura:
{{
    "translated_text": "Traducción completa aquí",
    "detected_source_lang": "código iso del idioma origen",
    "vocabulary": [
        {{
            "word": "palabra o frase en idioma destino",
            "phonetic": "pronunciación aproximada o IPA",
            "part_of_speech": "sustantivo | verbo | adjetivo | expresión",
            "definition": "definición en español orientada al contexto",
            "example": "breve frase de ejemplo en idioma destino",
            "difficulty_cefr": "B1"
        }}
    ],
    "grammar_notes": [
        {{
            "pattern": "estructura o regla observada",
            "explanation": "explicación clara y didáctica",
            "cultural_tip": "nota de uso real o falso amigo (opcional)"
        }}
    ]
}}

Texto a traducir:
\"\"\"{request.text}\"\"\"
"""
        return instructions

    def _sync_generate(self, prompt: str) -> str:
        if not self._client:
            raise RuntimeError("El cliente de Gemini no está configurado.")

        response = self._client.models.generate_content(
            model=self._model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.3,
            ),
        )
        return response.text or ""

    async def translate(self, request: TranslationRequest) -> TranslationResponse:
        if not self.is_available():
            raise RuntimeError(
                "GeminiProvider no está disponible (API Key no configurada o inválida)."
            )

        start_time = time.perf_counter()
        prompt = self._build_prompt(request)

        raw_json_str = await anyio.to_thread.run_sync(self._sync_generate, prompt)
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        try:
            data = json.loads(raw_json_str)
            translated_text = data.get("translated_text", "")
            detected_src = data.get("detected_source_lang", request.source_lang)

            vocab_list = []
            for item in data.get("vocabulary", []):
                vocab_list.append(
                    VocabularyItem(
                        word=item.get("word", ""),
                        phonetic=item.get("phonetic"),
                        part_of_speech=item.get("part_of_speech"),
                        definition=item.get("definition", ""),
                        example=item.get("example"),
                        difficulty_cefr=item.get("difficulty_cefr"),
                    )
                )

            notes_list = []
            for note in data.get("grammar_notes", []):
                notes_list.append(
                    GrammarNote(
                        pattern=note.get("pattern", ""),
                        explanation=note.get("explanation", ""),
                        cultural_tip=note.get("cultural_tip"),
                    )
                )

            return TranslationResponse(
                original_text=request.text,
                translated_text=translated_text,
                source_lang=request.source_lang,
                target_lang=request.target_lang,
                detected_source_lang=detected_src,
                provider_used=self.name,
                latency_ms=latency_ms,
                cached=False,
                vocabulary=vocab_list,
                grammar_notes=notes_list,
            )
        except Exception as err:
            logger.error(
                f"Error parseando respuesta JSON de Gemini: {err}. Salida cruda: {raw_json_str}"
            )
            raise RuntimeError(
                f"Fallo al procesar respuesta estructurada de Gemini: {err}"
            ) from err
