"""
Puertos (interfaces abstractas) de la arquitectura hexagonal.
Definen los contratos que deben cumplir los adaptadores de infraestructura.
"""

from abc import ABC, abstractmethod

from src.domain.models import Language, TranslationRequest, TranslationResponse


class ITranslationProvider(ABC):
    """Interfaz para proveedores de traducción (Gemini, DeepTranslator, etc.)"""

    @property
    @abstractmethod
    def name(self) -> str:
        """Nombre identificativo del proveedor."""
        pass

    @abstractmethod
    async def translate(self, request: TranslationRequest) -> TranslationResponse:
        """Ejecuta la traducción del texto según los parámetros provistos."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Indica si el proveedor está operativo (credenciales válidas, etc.)."""
        pass


class ICacheRepository(ABC):
    """Interfaz para la capa de almacenamiento en caché."""

    @abstractmethod
    async def get(self, key: str) -> TranslationResponse | None:
        """Obtiene un resultado en caché si existe y no ha expirado."""
        pass

    @abstractmethod
    async def set(self, key: str, value: TranslationResponse, ttl_seconds: int = 86400) -> None:
        """Almacena un resultado en caché."""
        pass


class IHistoryRepository(ABC):
    """Interfaz para el almacenamiento persistente de traducciones y vocabulario."""

    @abstractmethod
    async def save(self, response: TranslationResponse) -> int:
        """Persiste una traducción en el historial y retorna su ID."""
        pass

    @abstractmethod
    async def list_recent(self, limit: int = 20, offset: int = 0) -> list[TranslationResponse]:
        """Lista las traducciones recientes."""
        pass

    @abstractmethod
    async def delete(self, translation_id: int) -> bool:
        """Elimina un registro del historial."""
        pass


class ILanguageCatalog(ABC):
    """Interfaz para consultar el catálogo de idiomas soportados."""

    @abstractmethod
    def list_languages(self) -> list[Language]:
        """Retorna todos los idiomas disponibles."""
        pass

    @abstractmethod
    def get_by_code(self, code: str) -> Language | None:
        """Obtiene un idioma por su código ISO."""
        pass
