"""Lanxa ERP — Negocios del pipeline comercial."""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.tenancy import TenantScoped
from app.core.time import utcnow

ETAPAS_PIPELINE = (
    "Nuevo",
    "Contactado",
    "Cotizado",
    "Negociación",
    "Ganado",
    "Perdido",
)


class Negocio(TenantScoped, Base):
    __tablename__ = "negocios"
    __table_args__ = (
        UniqueConstraint("tenant_id", "numero", name="uq_negocios_tenant_numero"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    numero: Mapped[str] = mapped_column(String(20), index=True)
    titulo: Mapped[str] = mapped_column(String(200))
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id", ondelete="RESTRICT"))
    etapa: Mapped[str] = mapped_column(String(40), default="Nuevo", index=True)
    valor_estimado: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    fecha_cierre: Mapped[date | None] = mapped_column(Date)
    cotizacion_id: Mapped[int | None] = mapped_column(ForeignKey("cotizaciones.id", ondelete="SET NULL"))
    venta_id: Mapped[int | None] = mapped_column(ForeignKey("ventas_documentos.id", ondelete="SET NULL"))
    notas: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
