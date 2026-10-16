"""
Caso de uso: Exportación de vocabulario y traducciones para memorización espaciada (Anki / Markdown).
"""

from src.domain.models import TranslationResponse


class ExportCardsUseCase:
    """Generador de mazos de estudio lingüístico a partir de traducciones y vocabulario."""

    @staticmethod
    def to_anki_tsv(translations: list[TranslationResponse]) -> str:
        """
        Genera un archivo TSV compatible con la importación estándar de Anki.
        Columnas: Front \t Back \t Context / Notes \t Tags
        """
        lines = ["#separator:tab", "#html:true", "#tags column:4"]

        for item in translations:
            # 1. Tarjeta principal de la oración / párrafo
            front = item.original_text.replace("\t", " ").replace("\n", "<br>")
            back = item.translated_text.replace("\t", " ").replace("\n", "<br>")
            notes = f"Proveedor: {item.provider_used} | {item.source_lang} -> {item.target_lang}"
            tags = f"traductor-gemini {item.target_lang} oraciones"
            lines.append(f"{front}\t{back}\t{notes}\t{tags}")

            # 2. Tarjetas individuales por cada palabra o lema de vocabulario detectado
            for vocab in item.vocabulary:
                v_front = vocab.word
                v_back = f"<b>{vocab.definition}</b>"
                if vocab.part_of_speech:
                    v_back += f" <i>({vocab.part_of_speech})</i>"
                if vocab.example:
                    v_back += f"<br><small>Ejemplo: {vocab.example}</small>"
                v_notes = f"Pronunciación: {vocab.phonetic or 'N/A'} | Nivel: {vocab.difficulty_cefr or 'N/A'}"
                v_tags = f"traductor-gemini {item.target_lang} vocabulario"
                lines.append(f"{v_front}\t{v_back}\t{v_notes}\t{v_tags}")

        return "\n".join(lines)

    @staticmethod
    def to_markdown(translations: list[TranslationResponse]) -> str:
        """Genera un resumen en Markdown formateado con tablas de estudio y notas gramaticales."""
        output = ["# Cuaderno de Estudio Lingüístico - Traductor Gemini\n"]

        for idx, item in enumerate(translations, start=1):
            output.append(f"## {idx}. {item.source_lang.upper()} -> {item.target_lang.upper()}")
            output.append(f"> **Original:** {item.original_text}\n")
            output.append(f"**Traducción:** {item.translated_text}\n")
            output.append(f"*Motor:* `{item.provider_used}` | *Latencia:* `{item.latency_ms}ms`\n")

            if item.vocabulary:
                output.append("### Vocabulario Clave")
                output.append(
                    "| Palabra / Expresión | Pronunciación | Categoría | Significado | Nivel |"
                )
                output.append("| :--- | :--- | :--- | :--- | :--- |")
                for v in item.vocabulary:
                    output.append(
                        f"| **{v.word}** | {v.phonetic or '-'} | {v.part_of_speech or '-'} | {v.definition} | {v.difficulty_cefr or '-'} |"
                    )
                output.append("")

            if item.grammar_notes:
                output.append("### Notas Gramaticales y Culturales")
                for g in item.grammar_notes:
                    output.append(f"- **{g.pattern}:** {g.explanation}")
                    if g.cultural_tip:
                        output.append(f"  - *Nota cultural:* {g.cultural_tip}")
                output.append("")

            output.append("---\n")

        return "\n".join(output)
