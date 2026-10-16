"""
Proyecto: Traductor Multilingüe Enterprise
Desarrollador: Alejandro Peña
Asistencia IA: Pair-programming con Google Gemini
"""

import asyncio
import sys

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from src.application.engine import TranslationEngine
from src.domain.models import TranslationRequest, TranslationTone
from src.infrastructure.cache.memory_cache import InMemoryCacheRepository
from src.infrastructure.config import settings
from src.infrastructure.languages import language_catalog
from src.infrastructure.providers.deep_translator_provider import DeepTranslatorProvider
from src.infrastructure.providers.gemini_provider import GeminiProvider

consola = Console()

# Inicialización de componentes del motor
gemini_provider = GeminiProvider(api_key=settings.gemini_api_key, model=settings.gemini_model)
deep_translator_provider = DeepTranslatorProvider()
cache_repo = InMemoryCacheRepository(default_ttl_seconds=settings.cache_ttl_seconds)

engine = TranslationEngine(
    primary_provider=gemini_provider, fallback_provider=deep_translator_provider, cache=cache_repo
)


def mostrar_encabezado():
    motor_info = (
        "Google Gemini AI (Activo)"
        if gemini_provider.is_available()
        else "Deep-Translator (Modo Fallback / Standalone)"
    )
    status_color = "green" if gemini_provider.is_available() else "yellow"

    titulo = Text(
        f"TRADUCTOR MULTILINGÜE ENTERPRISE\n"
        f"Arquitectura Hexagonal & Clean Code | Por Alejandro Peña\n"
        f"Estado del Motor: [{status_color}]{motor_info}[/{status_color}]",
        justify="center",
    )
    consola.print(Panel(titulo, border_style="bright_blue", padding=(1, 2)))


def mostrar_menu_idiomas():
    table = Table(title="Idiomas Disponibles", border_style="cyan")
    table.add_column("Opción", style="bold yellow", justify="center")
    table.add_column("Idioma", style="bold white")
    table.add_column("Nombre Nativo", style="dim")
    table.add_column("Código ISO", style="magenta")

    idiomas = language_catalog.list_languages()
    for idx, lang in enumerate(idiomas, start=1):
        table.add_row(str(idx), lang.name, lang.native_name, lang.code)

    consola.print(table)
    consola.print("  [bold red]99.[/bold red] Salir de la aplicación")


async def ejecutar_traduccion_cli(texto: str, codigo_idioma: str, modo_estudio: bool):
    request = TranslationRequest(
        text=texto,
        target_lang=codigo_idioma,
        source_lang="auto",
        tone=TranslationTone.STANDARD,
        include_analysis=modo_estudio,
    )

    with consola.status(
        "[bold yellow]Procesando con IA lingüística...[/bold yellow]", spinner="dots"
    ):
        response = await engine.translate(request)

    # Panel de resultado principal
    cache_tag = " (Desde Caché)" if response.cached else ""
    panel_title = f"Traducción al {codigo_idioma.upper()} | Motor: {response.provider_used}{cache_tag} | {response.latency_ms}ms"

    consola.print("\n")
    consola.print(
        Panel(
            f"[bold bright_white]{response.translated_text}[/bold bright_white]",
            title=panel_title,
            border_style="green",
            padding=(1, 2),
        )
    )

    # Si hay vocabulario desglosado
    if response.vocabulary:
        vocab_table = Table(title="Vocabulario Clave Detectado", border_style="magenta")
        vocab_table.add_column("Palabra", style="bold cyan")
        vocab_table.add_column("Pronunciación", style="italic yellow")
        vocab_table.add_column("Tipo", style="green")
        vocab_table.add_column("Significado en Contexto", style="white")
        vocab_table.add_column("Nivel MCER", style="bold magenta", justify="center")

        for v in response.vocabulary:
            vocab_table.add_row(
                v.word,
                v.phonetic or "-",
                v.part_of_speech or "-",
                v.definition,
                v.difficulty_cefr or "-",
            )
        consola.print(vocab_table)

    # Si hay notas gramaticales
    if response.grammar_notes:
        for g in response.grammar_notes:
            nota_txt = f"[bold cyan]Regla:[/bold cyan] {g.pattern}\n[white]{g.explanation}[/white]"
            if g.cultural_tip:
                nota_txt += (
                    f"\n[bold yellow]Matiz Cultural / Falso Amigo:[/bold yellow] {g.cultural_tip}"
                )
            consola.print(
                Panel(nota_txt, title="Nota Gramatical y Cultural", border_style="yellow")
            )


async def iniciar_aplicacion_async():
    mostrar_encabezado()
    idiomas = language_catalog.list_languages()
    idioma_map = {str(idx): lang for idx, lang in enumerate(idiomas, start=1)}

    while True:
        mostrar_menu_idiomas()
        opcion = consola.input(
            "\n[bold magenta]Elige un idioma destino (o 99 para salir): [/bold magenta]"
        ).strip()

        if opcion == "99":
            consola.print(
                Panel(
                    "¡Sigue practicando tu fluidez lingüística! Hasta pronto.", style="bold green"
                )
            )
            break

        if opcion in idioma_map:
            idioma_elegido = idioma_map[opcion]
            texto_usuario = consola.input(
                "\n[bold cyan]Escribe el texto a traducir:[/bold cyan] "
            ).strip()
            if not texto_usuario:
                consola.print("[bold red]Error: El texto no puede estar vacío.[/bold red]")
                continue

            # Preguntar si desea modo estudio (análisis de vocabulario)
            modo_estudio_input = (
                consola.input(
                    "[yellow]¿Activar Modo Estudio de vocabulario y gramática con IA? (s/N): [/yellow]"
                )
                .strip()
                .lower()
            )
            modo_estudio = modo_estudio_input == "s"

            await ejecutar_traduccion_cli(texto_usuario, idioma_elegido.code, modo_estudio)
        else:
            consola.print("[bold red]Error: Opción no válida. Intenta de nuevo.[/bold red]")


def iniciar_aplicacion():
    if "--serve" in sys.argv:
        import uvicorn

        consola.print(
            "[bold green]Iniciando servidor FastAPI en http://127.0.0.1:8000 ...[/bold green]"
        )
        uvicorn.run(
            "src.presentation.api.main:app",
            host=settings.host,
            port=settings.port,
            reload=settings.debug,
        )
    else:
        asyncio.run(iniciar_aplicacion_async())


if __name__ == "__main__":
    iniciar_aplicacion()
