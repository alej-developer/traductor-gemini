"""
Pruebas para el exportador de tarjetas Anki y cuaderno Markdown.
"""

from src.application.use_cases.export_cards import ExportCardsUseCase
from src.domain.models import GrammarNote, TranslationResponse, VocabularyItem


def test_export_anki_tsv():
    response = TranslationResponse(
        original_text="The quick brown fox",
        translated_text="El rápido zorro marrón",
        source_lang="en",
        target_lang="es",
        provider_used="gemini",
        vocabulary=[
            VocabularyItem(
                word="zorro",
                phonetic="/ˈθoro/",
                part_of_speech="sustantivo",
                definition="Mamífero cánido de hocico alargado",
                difficulty_cefr="A2",
            )
        ],
    )

    tsv = ExportCardsUseCase.to_anki_tsv([response])
    assert "#separator:tab" in tsv
    assert "El rápido zorro marrón" in tsv
    assert "Mamífero cánido de hocico alargado" in tsv


def test_export_markdown():
    response = TranslationResponse(
        original_text="To be or not to be",
        translated_text="Ser o no ser",
        source_lang="en",
        target_lang="es",
        provider_used="gemini",
        grammar_notes=[
            GrammarNote(
                pattern="Infinitivo disyuntivo", explanation="Construcción clásica shakespeariana"
            )
        ],
    )

    md = ExportCardsUseCase.to_markdown([response])
    assert "# Cuaderno de Estudio Lingüístico" in md
    assert "Ser o no ser" in md
    assert "Construcción clásica shakespeariana" in md
