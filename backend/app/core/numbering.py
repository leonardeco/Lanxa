"""
Numeración secuencial de documentos (LNX-V-0001, LNX-CP-0001, RC-0001, CE-0001, …).

Usa la tabla `document_sequences` con bloqueo de fila (`SELECT … FOR UPDATE` en
PostgreSQL) para evitar el race MAX+1 cuando hay varios writers/workers (#12a).

- Si el prefijo no existe aún, se siembra con el MAX del sufijo en la columna
  de negocio (compatibilidad con datos previos) y se inserta la fila contador.
- Reintenta con savepoint si dos sesiones intentan crear el mismo prefijo
  (IntegrityError), sin hacer rollback de todo el request.
"""

from __future__ import annotations

import re

from sqlalchemy import ForeignKey, Integer, String, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.tenancy import get_tenant_id, tenant_clause

_SUFFIX_RE = re.compile(r"(\d+)$")
_MAX_RETRIES = 5


class DocumentSequence(Base):
    """Contador monotónico por (tenant_id, prefix). PK alineada con Alembic e6f7a8b9c0d1."""

    __tablename__ = "document_sequences"
    __table_args__ = {"extend_existing": True}

    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        primary_key=True,
    )
    prefix: Mapped[str] = mapped_column(String(32), primary_key=True)
    last_value: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


async def _max_suffix_from_column(
    session: AsyncSession, column, prefijo: str
) -> int:
    stmt = select(column).where(column.like(f"{prefijo}-%"))
    model = getattr(column, "class_", None)
    if model is not None and hasattr(model, "tenant_id"):
        stmt = stmt.where(tenant_clause(model))
    rows = (await session.execute(stmt)).scalars().all()
    max_num = 0
    for n in rows:
        m = _SUFFIX_RE.search(n or "")
        if m:
            max_num = max(max_num, int(m.group(1)))
    return max_num


async def next_sequential_numero(
    session: AsyncSession, column, prefijo: str, padding: int = 4
) -> str:
    """Devuelve el siguiente número '<prefijo>-NNNN' de forma segura bajo concurrencia."""
    if not prefijo or not str(prefijo).strip():
        raise ValueError("prefijo de numeración vacío")

    last_error: Exception | None = None
    for _ in range(_MAX_RETRIES):
        try:
            async with session.begin_nested():
                tid = get_tenant_id()
                stmt = (
                    select(DocumentSequence)
                    .where(
                        DocumentSequence.prefix == prefijo,
                        DocumentSequence.tenant_id == tid,
                    )
                    .with_for_update()
                )
                row = await session.scalar(stmt)

                if row is None:
                    seed = await _max_suffix_from_column(session, column, prefijo)
                    row = DocumentSequence(
                        tenant_id=tid, prefix=prefijo, last_value=seed
                    )
                    session.add(row)
                    await session.flush()

                row.last_value += 1
                await session.flush()
                return f"{prefijo}-{row.last_value:0{padding}d}"
        except IntegrityError as exc:
            last_error = exc
            continue

    raise RuntimeError(
        f"No se pudo asignar número para prefijo {prefijo!r}"
    ) from last_error
