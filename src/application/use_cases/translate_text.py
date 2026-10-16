"""
Caso de uso: Traducir texto con persistencia opcional en el historial.
"""

from src.application.engine import TranslationEngine
from src.domain.models import TranslationRequest, TranslationResponse
from src.domain.ports import IHistoryRepository


class TranslateTextUseCase:
    """Caso de uso de traducción central."""

    def __init__(self, engine: TranslationEngine, history_repo: IHistoryRepository | None = None):
        self.engine = engine
        self.history_repo = history_repo

    async def execute(
        self, request: TranslationRequest, persist: bool = True
    ) -> TranslationResponse:
        # Validación de negocio
        if not request.text.strip():
            raise ValueError("El texto a traducir no puede estar vacío.")

        response = await self.engine.translate(request)

        # Persistir en historial si está configurado
        if persist and self.history_repo:
            try:
                await self.history_repo.save(response)
            except Exception:
                # La falla en persistencia no debe tumbar la respuesta de traducción
                pass

        return response
