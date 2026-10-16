"""
Configuración centralizada de la aplicación usando Pydantic Settings.
Carga variables de entorno (.env) de forma segura y tipada.
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Identificación del Proyecto
    app_name: str = "Traductor Gemini Enterprise"
    app_version: str = "2.0.0"
    app_env: str = Field(default="development", alias="APP_ENV")
    debug: bool = Field(default=False, alias="DEBUG")

    # Servidor HTTP
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")

    # API de Google Gemini
    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-2.5-flash", alias="GEMINI_MODEL")

    # Base de datos y Almacenamiento
    database_url: str = Field(
        default="sqlite+aiosqlite:///./data/traductor.db", alias="DATABASE_URL"
    )
    cache_ttl_seconds: int = Field(default=86400, alias="CACHE_TTL_SECONDS")

    # Seguridad y CORS
    cors_origins_raw: str = Field(
        default="http://localhost:3000,http://localhost:5173,http://127.0.0.1:8000,http://localhost:8000",
        alias="CORS_ORIGINS",
    )

    @property
    def cors_origins(self) -> list[str]:
        if not self.cors_origins_raw:
            return ["*"]
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]


# Instancia singleton para inyección en la aplicación
settings = Settings()
