"""
Repositorio de historial implementado sobre SQLAlchemy asincrónico.
"""

import json

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models import (
    GrammarNote,
    TranslationResponse,
    VocabularyItem,
)
from src.domain.ports import IHistoryRepository
from src.infrastructure.database.models_orm import TranslationHistoryORM


class SqlAlchemyHistoryRepository(IHistoryRepository):
    """Implementación del puerto IHistoryRepository con SQLAlchemy."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, response: TranslationResponse) -> int:
        vocab_json = (
            json.dumps([item.model_dump() for item in response.vocabulary])
            if response.vocabulary
            else None
        )
        grammar_json = (
            json.dumps([note.model_dump() for note in response.grammar_notes])
            if response.grammar_notes
            else None
        )

        record = TranslationHistoryORM(
            original_text=response.original_text,
            translated_text=response.translated_text,
            source_lang=response.source_lang,
            target_lang=response.target_lang,
            provider_used=response.provider_used,
            vocabulary_json=vocab_json,
            grammar_notes_json=grammar_json,
            latency_ms=response.latency_ms,
            created_at=response.created_at,
        )
        self._session.add(record)
        await self._session.commit()
        await self._session.refresh(record)
        return record.id

    async def list_recent(self, limit: int = 20, offset: int = 0) -> list[TranslationResponse]:
        query = (
            select(TranslationHistoryORM)
            .order_by(desc(TranslationHistoryORM.created_at))
            .limit(limit)
            .offset(offset)
        )
        result = await self._session.execute(query)
        rows = result.scalars().all()

        responses = []
        for r in rows:
            vocab = []
            if r.vocabulary_json:
                try:
                    for v in json.loads(r.vocabulary_json):
                        vocab.append(VocabularyItem(**v))
                except Exception:
                    pass

            notes = []
            if r.grammar_notes_json:
                try:
                    for n in json.loads(r.grammar_notes_json):
                        notes.append(GrammarNote(**n))
                except Exception:
                    pass

            responses.append(
                TranslationResponse(
                    original_text=r.original_text,
                    translated_text=r.translated_text,
                    source_lang=r.source_lang,
                    target_lang=r.target_lang,
                    provider_used=r.provider_used,
                    latency_ms=float(r.latency_ms),
                    cached=False,
                    vocabulary=vocab,
                    grammar_notes=notes,
                    created_at=r.created_at,
                )
            )
        return responses

    async def delete(self, translation_id: int) -> bool:
        record = await self._session.get(TranslationHistoryORM, translation_id)
        if record:
            await self._session.delete(record)
            await self._session.commit()
            return True
        return False
