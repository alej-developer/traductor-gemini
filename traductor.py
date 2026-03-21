"""
Proyecto: Traductor Multilingüe
Desarrollador: Alejandro Peña
Asistencia IA: Pair-programming con Google Gemini
"""

from deep_translator import GoogleTranslator

def traducir_texto(texto, idioma_distinto):
    """
    Toma un texto y lo traduce al idioma indicado.
    idioma_distinto deber ser el código del idioma (ej: 'en', zh-CN', 'fi', 'it').
    """
    try: 
        # Se crea una instancia del traductor indicando el idioma final
        traductor = GoogleTranslator(source='auto', target=idioma_destino)
        resultado = traductor.translate(texto)
        return resultado
    except Exception as e:
        return f"Error al traducr: {e}"  

# Prueba rápida
if __name__ == "__main__":
    prueba = traducir_texto("Hola, estoy aprendiendo a programar con IA", "en")
    print(prueba)