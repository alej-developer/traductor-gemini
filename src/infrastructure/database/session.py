"""
Gestor de sesiones asincrónicas de base de datos con SQLAlchemy y SQLite (aiosqlite).
"""

from collections.abc import AsyncGenerator
from pathlib import Path

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.infrastructure.config import settings
from src.infrastructure.database.models_orm import Base

# Asegurar que el directorio de datos existe
db_path = settings.database_url.replace("sqlite+aiosqlite:///", "")
if "./" in db_path:
    parent_dir = Path(db_path).parent
    parent_dir.mkdir(parents=True, exist_ok=True)

engine = create_async_engine(settings.database_url, echo=settings.debug, future=True)

AsyncSessionLocal = async_sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
)


async def init_db() -> None:
    """Crea las tablas de la base de datos si no existen."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Generador de sesiones para inyección de dependencias en FastAPI."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
