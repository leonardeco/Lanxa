"""Pydantic schemas for the commercial pipeline."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

from app.modules.pipeline.models import ETAPAS_PIPELINE

ETAPAS = list(ETAPAS_PIPELINE)


class NegocioCreate(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=200)
    cliente_id: int
    etapa: str = "Nuevo"
    valor_estimado: Decimal = Field(default=Decimal("0.00"), ge=0)
    fecha_cierre: date | None = None
    cotizacion_id: int | None = None
    venta_id: int | None = None
    notas: str | None = Field(default=None, max_length=2000)

    @field_validator("titulo")
    @classmethod
    def titulo_no_vacio(cls, v: str) -> str:
        t = v.strip()
        if not t:
            raise ValueError("El título es obligatorio")
        return t

    @field_validator("etapa")
    @classmethod
    def etapa_valida(cls, v: str) -> str:
        if v not in ETAPAS:
            raise ValueError("Etapa no válida")
        return v


class NegocioUpdate(BaseModel):
    titulo: str | None = Field(default=None, min_length=1, max_length=200)
    cliente_id: int | None = None
    etapa: str | None = None
    valor_estimado: Decimal | None = Field(default=None, ge=0)
    fecha_cierre: date | None = None
    cotizacion_id: int | None = None
    venta_id: int | None = None
    notas: str | None = Field(default=None, max_length=2000)

    @field_validator("titulo")
    @classmethod
    def titulo_no_vacio(cls, v: str | None) -> str | None:
        if v is None:
            return v
        t = v.strip()
        if not t:
            raise ValueError("El título es obligatorio")
        return t

    @field_validator("etapa")
    @classmethod
    def etapa_valida(cls, v: str | None) -> str | None:
        if v is not None and v not in ETAPAS:
            raise ValueError("Etapa no válida")
        return v


class NegocioEtapaPatch(BaseModel):
    etapa: str

    @field_validator("etapa")
    @classmethod
    def etapa_valida(cls, v: str) -> str:
        if v not in ETAPAS:
            raise ValueError("Etapa no válida")
        return v


class NegocioResponse(BaseModel):
    id: int
    numero: str
    titulo: str
    cliente_id: int
    cliente_razon_social: str | None = None
    etapa: str
    valor_estimado: Decimal
    fecha_cierre: date | None = None
    cotizacion_id: int | None = None
    venta_id: int | None = None
    notas: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
