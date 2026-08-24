"""Pipeline comercial: CRUD, etapas fijas y FKs del tenant."""
import pytest
from httpx import AsyncClient


CLIENTE = {
    "nit_cc": "900888777",
    "razon_social": "Cliente Pipeline S.A.S.",
    "ciudad": "Bogotá",
}


async def _cliente(client: AsyncClient, headers: dict) -> dict:
    resp = await client.post("/api/v1/ventas/clientes", json=CLIENTE, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.mark.asyncio
async def test_etapas_fijas(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/pipeline/etapas", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == [
        "Nuevo",
        "Contactado",
        "Cotizado",
        "Negociación",
        "Ganado",
        "Perdido",
    ]


@pytest.mark.asyncio
async def test_crear_listar_mover_eliminar(client: AsyncClient, auth_headers: dict):
    cli = await _cliente(client, auth_headers)
    resp = await client.post(
        "/api/v1/pipeline/",
        json={"titulo": "  Proyecto riego  ", "cliente_id": cli["id"], "valor_estimado": "2500000"},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    n = resp.json()
    assert n["numero"].startswith("LNX-N-")
    assert n["titulo"] == "Proyecto riego"
    assert n["etapa"] == "Nuevo"
    assert n["cliente_razon_social"] == CLIENTE["razon_social"]

    lista = await client.get("/api/v1/pipeline/", headers=auth_headers)
    assert lista.status_code == 200
    assert any(x["id"] == n["id"] for x in lista.json())

    moved = await client.patch(
        f"/api/v1/pipeline/{n['id']}/etapa",
        json={"etapa": "Negociación"},
        headers=auth_headers,
    )
    assert moved.status_code == 200, moved.text
    assert moved.json()["etapa"] == "Negociación"

    bad = await client.patch(
        f"/api/v1/pipeline/{n['id']}/etapa",
        json={"etapa": "Inventada"},
        headers=auth_headers,
    )
    assert bad.status_code == 422

    gone = await client.delete(f"/api/v1/pipeline/{n['id']}", headers=auth_headers)
    assert gone.status_code == 204
    missing = await client.get(f"/api/v1/pipeline/{n['id']}", headers=auth_headers)
    assert missing.status_code == 404


@pytest.mark.asyncio
async def test_cliente_inexistente_404(client: AsyncClient, auth_headers: dict):
    resp = await client.post(
        "/api/v1/pipeline/",
        json={"titulo": "Huérfano", "cliente_id": 999999},
        headers=auth_headers,
    )
    assert resp.status_code == 404
