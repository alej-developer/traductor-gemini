"""
Proyecto: Traductor Multilingüe
Desarrollador: Alejandro Peña
Asistencia IA: Pair-programming con Google Gemini
"""

from deep_translator import GoogleTranslator
from rich.console import Console
from rich.panel import Panel
from rich.text import Text

def traducir_texto(texto, idioma_destino):
    """
    Toma un texto y lo traduce al idioma indicado.
    idioma_destino deber ser el código del idioma (ej: 'en', zh-CN', 'fi', 'it').
    """
    try: 
        # Se crea una instancia del traductor indicando el idioma final
        traductor = GoogleTranslator(source='auto', target=idioma_destino)
        resultado = traductor.translate(texto)
        return resultado
    except Exception as e:
        return f"Error al traducr: {e}"  

# Inicializamos la consola para usar colores
consola = Console() 

# Diccionario para mapear las opciones númericas con los códigos de idiomas
IDIOMAS = {
    "1": {"nombre": "Ingles", "codigo": "en"},
    "2": {"nombre": "Chino (Simplificado)", "codigo": "zh-CN"},
    "3": {"nombre": "Finés", "codigo": "fi"},
    "4": {"nombre": "Italiano", "codigo": "it"}
}

def mostrar_encabezado():
    titulo = Text("🌐 TRADUCTOR MULTILINGÜE 🌐\nConstruido con Python & Google Gemini", style="bold cyan", justify="center")
    consola.print(Panel(titulo, border_style="blue"))

def mostrar_menu():
    consola.print("\n[bold yellow]Idiomas disponibles:[/bold yellow]")
    for clave, datos in IDIOMAS.items():
        consola.print(f"[green]{clave}.[/green] {datos['nombre']}")
    consola.print("  [red]5.[/red] Salir")

def iniciar_aplicacion():
    mostrar_encabezado()

    while True:
        mostrar_menu()
        opcion = consola.input("\n[bold magenta]▶ Elige una opción (1-5): [/bold magenta]")

        if opcion == '5':
            consola.print(Panel("¡Sigue practicando tu comprensión lectora y auditiva! Hasta pronto.", style="bold green"))
            break
            
        if opcion in IDIOMAS:
            idioma_seleccionado = IDIOMAS[opcion]
            texto_usuario = consola.input("\n[bold cyan]✍️  Escribe el texto a traducir:[/bold cyan] ")
            
            # Mostramos un mensaje de carga visual
            with consola.status("[bold yellow]La IA está traduciendo...[/bold yellow]", spinner="dots"):
                resultado = traducir_texto(texto_usuario, idioma_seleccionado["codigo"])
            
            # Mostramos el resultado en un panel bonito
            panel_resultado = Panel(
                f"[bold white]{resultado}[/bold white]", 
                title=f"Traducción al {idioma_seleccionado['nombre']}", 
                border_style="green"
            )
            consola.print("\n")
            consola.print(panel_resultado)
        else:
            consola.print("[bold red]❌ Opción no válida. Intenta de nuevo.[/bold red]")

# Esta línea asegura que la app solo se ejecute si llamamos a este archivo directamente
if __name__ == "__main__":
    iniciar_aplicacion()

    