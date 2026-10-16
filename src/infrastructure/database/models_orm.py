"""
Modelos ORM de SQLAlchemy 2.0 para la persistencia del historial de traducciones y vocabulario.
"""

from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TranslationHistoryORM(Base):
    __tablename__ = "translation_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    translated_text: Mapped[str] = mapped_column(Text, nullable=False)
    source_lang: Mapped[str] = mapped_column(String(10), nullable=False)
    target_lang: Mapped[str] = mapped_column(String(10), nullable=False)
    provider_used: Mapped[str] = mapped_column(String(50), nullable=False)
    tone: Mapped[str] = mapped_column(String(20), default="standard")
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    vocabulary_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    grammar_notes_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    latency_ms: Mapped[float] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
