"""REST API for commercial pipeline deals."""

from decimal import Decimal

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, SessionDep
from app.core.numbering import next_sequential_numero
from app.core.tenancy import get_for_tenant, tenant_clause
from app.core.time import utcnow
from app.modules.auditoria.service import registrar_auditoria
from app.modules.pipeline.models import ETAPAS_PIPELINE, Negocio
from app.modules.pipeline.schemas import (
    NegocioCreate,
    NegocioEtapaPatch,
    NegocioResponse,
    NegocioUpdate,
)
from app.modules.ventas.models import Cliente, Cotizacion, VentaDocumento

router = APIRouter(prefix="/api/v1/pipeline", tags=["Pipeline comercial"])


async def _cliente_nombre(db: AsyncSession, cliente_id: int) -> str | None:
    c = await get_for_tenant(db, Cliente, cliente_id)
    return c.razon_social if c else None


def _to_response(n: Negocio, razon: str | None) -> NegocioResponse:
    return NegocioResponse(
        id=n.id,
        numero=n.numero,
        titulo=n.titulo,
        cliente_id=n.cliente_id,
        cliente_razon_social=razon,
        etapa=n.etapa,
        valor_estimado=n.valor_estimado,
        fecha_cierre=n.fecha_cierre,
        cotizacion_id=n.cotizacion_id,
        venta_id=n.venta_id,
        notas=n.notas,
        created_at=n.created_at,
        updated_at=n.updated_at,
    )


async def _assert_links(
    db: AsyncSession,
    cliente_id: int,
    cotizacion_id: int | None,
    venta_id: int | None,
) -> Cliente:
    cliente = await get_for_tenant(db, Cliente, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    if cotizacion_id is not None:
        cot = await get_for_tenant(db, Cotizacion, cotizacion_id)
        if not cot:
            raise HTTPException(status_code=404, detail="Cotización no encontrada")
        if cot.cliente_id != cliente_id:
            raise HTTPException(status_code=400, detail="La cotización no pertenece a ese cliente")
    if venta_id is not None:
        venta = await get_for_tenant(db, VentaDocumento, venta_id)
        if not venta:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        if venta.cliente_id != cliente_id:
            raise HTTPException(status_code=400, detail="La venta no pertenece a ese cliente")
    return cliente


@router.get("/etapas", response_model=list[str])
async def listar_etapas(_user: CurrentUser) -> list[str]:
    return list(ETAPAS_PIPELINE)


@router.get("/", response_model=list[NegocioResponse])
async def listar_negocios(db: SessionDep, _user: CurrentUser) -> list[NegocioResponse]:
    rows = (
        await db.execute(
            select(Negocio, Cliente.razon_social)
            .join(Cliente, Cliente.id == Negocio.cliente_id)
            .where(tenant_clause(Negocio), tenant_clause(Cliente))
            .order_by(Negocio.created_at.desc())
        )
    ).all()
    return [_to_response(n, razon) for n, razon in rows]


@router.post("/", response_model=NegocioResponse, status_code=201)
async def crear_negocio(payload: NegocioCreate, db: SessionDep, user: CurrentUser) -> NegocioResponse:
    cliente = await _assert_links(db, payload.cliente_id, payload.cotizacion_id, payload.venta_id)
    numero = await next_sequential_numero(db, Negocio.numero, "LNX-N")
    n = Negocio(
        numero=numero,
        titulo=payload.titulo,
        cliente_id=payload.cliente_id,
        etapa=payload.etapa,
        valor_estimado=payload.valor_estimado or Decimal("0.00"),
        fecha_cierre=payload.fecha_cierre,
        cotizacion_id=payload.cotizacion_id,
        venta_id=payload.venta_id,
        notas=payload.notas,
    )
    db.add(n)
    await db.flush()
    registrar_auditoria(
        db, user, "crear", "negocio", n.id, f"Negocio {n.numero} — {n.titulo}"
    )
    await db.commit()
    await db.refresh(n)
    return _to_response(n, cliente.razon_social)


@router.get("/{negocio_id}", response_model=NegocioResponse)
async def obtener_negocio(negocio_id: int, db: SessionDep, _user: CurrentUser) -> NegocioResponse:
    n = await get_for_tenant(db, Negocio, negocio_id)
    if not n:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    razon = await _cliente_nombre(db, n.cliente_id)
    return _to_response(n, razon)


@router.put("/{negocio_id}", response_model=NegocioResponse)
async def actualizar_negocio(
    negocio_id: int, payload: NegocioUpdate, db: SessionDep, user: CurrentUser
) -> NegocioResponse:
    n = await get_for_tenant(db, Negocio, negocio_id)
    if not n:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    data = payload.model_dump(exclude_unset=True)
    cliente_id = data.get("cliente_id", n.cliente_id)
    await _assert_links(
        db,
        cliente_id,
        data["cotizacion_id"] if "cotizacion_id" in data else n.cotizacion_id,
        data["venta_id"] if "venta_id" in data else n.venta_id,
    )
    if "titulo" in data and data["titulo"] is not None:
        data["titulo"] = data["titulo"].strip()
    for k, v in data.items():
        setattr(n, k, v)
    n.updated_at = utcnow()
    registrar_auditoria(
        db, user, "editar", "negocio", n.id, f"Negocio {n.numero} actualizado", data
    )
    await db.commit()
    await db.refresh(n)
    razon = await _cliente_nombre(db, n.cliente_id)
    return _to_response(n, razon)


@router.patch("/{negocio_id}/etapa", response_model=NegocioResponse)
async def cambiar_etapa(
    negocio_id: int, payload: NegocioEtapaPatch, db: SessionDep, user: CurrentUser
) -> NegocioResponse:
    n = await get_for_tenant(db, Negocio, negocio_id)
    if not n:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    anterior = n.etapa
    n.etapa = payload.etapa
    n.updated_at = utcnow()
    registrar_auditoria(
        db,
        user,
        "editar",
        "negocio",
        n.id,
        f"Negocio {n.numero}: {anterior} → {payload.etapa}",
        {"etapa": payload.etapa},
    )
    await db.commit()
    await db.refresh(n)
    razon = await _cliente_nombre(db, n.cliente_id)
    return _to_response(n, razon)


@router.delete("/{negocio_id}", status_code=204)
async def eliminar_negocio(negocio_id: int, db: SessionDep, user: CurrentUser) -> None:
    n = await get_for_tenant(db, Negocio, negocio_id)
    if not n:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    registrar_auditoria(
        db, user, "eliminar", "negocio", n.id, f"Negocio {n.numero} eliminado"
    )
    await db.delete(n)
    await db.commit()
