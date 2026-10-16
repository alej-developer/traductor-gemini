"""
Punto de entrada de la API REST FastAPI.
Ofrece endpoints OpenAPI / Swagger interactivos, CORS, observabilidad y manejo de errores.
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.engine import TranslationEngine
from src.application.use_cases.export_cards import ExportCardsUseCase
from src.application.use_cases.translate_text import TranslateTextUseCase
from src.domain.models import Language, TranslationRequest, TranslationResponse
from src.infrastructure.cache.memory_cache import InMemoryCacheRepository
from src.infrastructure.config import settings
from src.infrastructure.database.history_repo import SqlAlchemyHistoryRepository
from src.infrastructure.database.session import get_db_session, init_db
from src.infrastructure.languages import language_catalog
from src.infrastructure.providers.deep_translator_provider import DeepTranslatorProvider
from src.infrastructure.providers.gemini_provider import GeminiProvider

# Instancias compartidas del motor
gemini_provider = GeminiProvider(api_key=settings.gemini_api_key, model=settings.gemini_model)
deep_translator_provider = DeepTranslatorProvider()
cache_repo = InMemoryCacheRepository(default_ttl_seconds=settings.cache_ttl_seconds)

translation_engine = TranslationEngine(
    primary_provider=gemini_provider, fallback_provider=deep_translator_provider, cache=cache_repo
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicialización en arranque
    await init_db()
    yield
    # Limpieza al apagar
    pass


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="API empresarial de traducción y análisis lingüístico impulsado por Google Gemini y DeepTranslator.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health/live", tags=["Observabilidad"])
async def liveness():
    """Comprobación de liveness para Kubernetes / Docker healthcheck."""
    return {"status": "ok", "version": settings.app_version}


@app.get("/health/ready", tags=["Observabilidad"])
async def readiness():
    """Comprobación de disponibilidad de componentes y proveedores."""
    return {
        "status": "ready",
        "providers": {
            "gemini": {"available": gemini_provider.is_available(), "model": settings.gemini_model},
            "deep_translator": {"available": deep_translator_provider.is_available()},
        },
        "environment": settings.app_env,
    }


@app.get("/api/v1/languages", response_model=list[Language], tags=["Idiomas"])
async def get_languages():
    """Obtiene el listado completo de idiomas disponibles con banderas y códigos."""
    return language_catalog.list_languages()


@app.post("/api/v1/translate", response_model=TranslationResponse, tags=["Traducción"])
async def translate_text(request: TranslationRequest, db: AsyncSession = Depends(get_db_session)):
    """
    Traduce texto con opción de análisis de vocabulario y notas gramaticales.
    Usa Google Gemini si está disponible; degrada automáticamente a DeepTranslator ante cualquier fallo.
    """
    try:
        history_repo = SqlAlchemyHistoryRepository(db)
        use_case = TranslateTextUseCase(engine=translation_engine, history_repo=history_repo)
        result = await use_case.execute(request, persist=True)
        return result
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err)
        ) from val_err
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inesperado al traducir: {exc}",
        ) from exc


@app.get("/api/v1/history", response_model=list[TranslationResponse], tags=["Historial"])
async def get_history(limit: int = 20, offset: int = 0, db: AsyncSession = Depends(get_db_session)):
    """Consulta el historial de traducciones persistidas."""
    history_repo = SqlAlchemyHistoryRepository(db)
    return await history_repo.list_recent(limit=limit, offset=offset)


@app.get("/api/v1/export/anki", response_class=PlainTextResponse, tags=["Exportación"])
async def export_anki(db: AsyncSession = Depends(get_db_session)):
    """Exporta las traducciones recientes y su vocabulario en formato Anki TSV."""
    history_repo = SqlAlchemyHistoryRepository(db)
    translations = await history_repo.list_recent(limit=50)
    tsv_content = ExportCardsUseCase.to_anki_tsv(translations)
    return PlainTextResponse(
        content=tsv_content,
        headers={"Content-Disposition": "attachment; filename=anki_deck_gemini.txt"},
    )


@app.get("/api/v1/export/markdown", response_class=PlainTextResponse, tags=["Exportación"])
async def export_markdown(db: AsyncSession = Depends(get_db_session)):
    """Exporta las traducciones y el análisis pedagógico como un documento Markdown de estudio."""
    history_repo = SqlAlchemyHistoryRepository(db)
    translations = await history_repo.list_recent(limit=50)
    md_content = ExportCardsUseCase.to_markdown(translations)
    return PlainTextResponse(
        content=md_content,
        headers={"Content-Disposition": "attachment; filename=cuaderno_estudio.md"},
    )


# Montaje de la Web App estática moderna
static_dir = Path(__file__).resolve().parent.parent.parent.parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
