"""Restore UNIQUE(tenant_id, key) and backfill tenants.dominio

Revision ID: b7c8d9e0f1a2
Revises: 4e24b843eccd
Create Date: 2026-08-24

Forward fix after 3deee189e9bd reintroduced global uniques. Does not rewrite
that revision (already applied on LAN). Also fills NULL tenants.dominio from
the Superusuario email so login-by-domain works.
"""
from alembic import op
import sqlalchemy as sa

revision = "b7c8d9e0f1a2"
down_revision = "4e24b843eccd"
branch_labels = None
depends_on = None

# (table, business_column, new unique name)
_COMPOSITES = [
    ("plan_cuentas", "codigo_puc", "uq_puc_tenant_codigo"),
    ("centros_costo", "codigo", "uq_cc_tenant_codigo"),
    ("terceros", "nit_cc", "uq_terceros_tenant_nit"),
    ("cuentas_por_cobrar", "numero_factura", "uq_cxc_tenant_factura"),
    ("cuentas_por_pagar", "numero_documento", "uq_cxp_tenant_documento"),
    ("pagos", "numero_comprobante", "uq_pagos_tenant_numero"),
    ("parametros_tributarios", "concepto", "uq_param_trib_tenant_concepto"),
    ("parametros_nomina", "concepto", "uq_param_nom_tenant_concepto"),
    ("compras_documentos", "numero", "uq_compras_tenant_numero"),
    ("devoluciones_compra", "numero", "uq_dev_compra_tenant_numero"),
    ("cotizaciones", "numero", "uq_cotizaciones_tenant_numero"),
    ("devoluciones_venta", "numero", "uq_dev_venta_tenant_numero"),
    ("ventas_documentos", "numero", "uq_ventas_tenant_numero"),
]


def _drop_matching_uniques(inspector, table: str, columns: list[str]) -> None:
    if table not in set(inspector.get_table_names()):
        return
    wanted = list(columns)
    for ix in inspector.get_indexes(table):
        cols = list(ix.get("column_names") or [])
        if ix.get("unique") and cols == wanted:
            op.drop_index(ix["name"], table_name=table)
    for uq in inspector.get_unique_constraints(table):
        cols = list(uq.get("column_names") or [])
        if cols == wanted:
            try:
                op.drop_constraint(uq["name"], table_name=table, type_="unique")
            except Exception:
                pass


def _ensure_unique(inspector, table: str, columns: list[str], name: str) -> None:
    if table not in set(inspector.get_table_names()):
        return
    existing_ix = {ix["name"] for ix in inspector.get_indexes(table)}
    existing_uq = {uq["name"] for uq in inspector.get_unique_constraints(table)}
    if name in existing_ix or name in existing_uq:
        return
    op.create_index(name, table, columns, unique=True)


def upgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name

    if dialect == "postgresql":
        conn.execute(
            sa.text(
                """
                UPDATE tenants t SET dominio = sub.dom
                FROM (
                    SELECT DISTINCT ON (u.tenant_id)
                        u.tenant_id,
                        lower(split_part(u.email, '@', 2)) AS dom
                    FROM usuarios u
                    WHERE u.rol = 'Superusuario'
                    ORDER BY u.tenant_id, u.id
                ) sub
                WHERE t.id = sub.tenant_id
                  AND t.dominio IS NULL
                  AND sub.dom IS NOT NULL
                  AND sub.dom <> ''
                """
            )
        )
    else:
        conn.execute(
            sa.text(
                """
                UPDATE tenants
                SET dominio = (
                    SELECT lower(substr(u.email, instr(u.email, '@') + 1))
                    FROM usuarios u
                    WHERE u.tenant_id = tenants.id
                      AND u.rol = 'Superusuario'
                    LIMIT 1
                )
                WHERE dominio IS NULL
                """
            )
        )
    conn.execute(
        sa.text(
            "UPDATE tenants SET dominio = 'lanxa.local' "
            "WHERE dominio IS NULL AND codigo IN ('lanxa', 'superozono')"
        )
    )

    inspector = sa.inspect(conn)
    for table, col, name in _COMPOSITES:
        _drop_matching_uniques(inspector, table, [col])
        inspector = sa.inspect(conn)
        _ensure_unique(inspector, table, ["tenant_id", col], name)
        inspector = sa.inspect(conn)

    if "periodos_contables" in set(inspector.get_table_names()):
        _drop_matching_uniques(inspector, "periodos_contables", ["anio", "mes"])
        inspector = sa.inspect(conn)
        _drop_matching_uniques(inspector, "periodos_contables", ["periodo"])
        inspector = sa.inspect(conn)
        _ensure_unique(
            inspector,
            "periodos_contables",
            ["tenant_id", "anio", "mes"],
            "uq_periodo_tenant_anio_mes",
        )
        inspector = sa.inspect(conn)
        _ensure_unique(
            inspector,
            "periodos_contables",
            ["tenant_id", "periodo"],
            "uq_periodo_tenant_periodo",
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    for table, col, name in reversed(_COMPOSITES):
        if table not in set(inspector.get_table_names()):
            continue
        existing_ix = {ix["name"] for ix in inspector.get_indexes(table)}
        if name in existing_ix:
            op.drop_index(name, table_name=table)
        inspector = sa.inspect(conn)
        _ensure_unique(inspector, table, [col], f"ix_{table}_{col}")
        inspector = sa.inspect(conn)
