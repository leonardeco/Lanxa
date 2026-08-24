"""negocios: pipeline comercial Kanban

Revision ID: d9e0f1a2b3c4
Revises: c8d9e0f1a2b3
Create Date: 2026-08-24
"""
from alembic import op
import sqlalchemy as sa

revision = "d9e0f1a2b3c4"
down_revision = "c8d9e0f1a2b3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "negocios",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id", ondelete="RESTRICT"), nullable=False, server_default="1"),
        sa.Column("numero", sa.String(length=20), nullable=False),
        sa.Column("titulo", sa.String(length=200), nullable=False),
        sa.Column("cliente_id", sa.Integer(), sa.ForeignKey("clientes.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("etapa", sa.String(length=40), nullable=False, server_default="Nuevo"),
        sa.Column("valor_estimado", sa.Numeric(18, 2), nullable=False, server_default="0"),
        sa.Column("fecha_cierre", sa.Date(), nullable=True),
        sa.Column("cotizacion_id", sa.Integer(), sa.ForeignKey("cotizaciones.id", ondelete="SET NULL"), nullable=True),
        sa.Column("venta_id", sa.Integer(), sa.ForeignKey("ventas_documentos.id", ondelete="SET NULL"), nullable=True),
        sa.Column("notas", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("tenant_id", "numero", name="uq_negocios_tenant_numero"),
    )
    op.create_index("ix_negocios_tenant_id", "negocios", ["tenant_id"])
    op.create_index("ix_negocios_numero", "negocios", ["numero"])
    op.create_index("ix_negocios_etapa", "negocios", ["etapa"])

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute('ALTER TABLE "negocios" ENABLE ROW LEVEL SECURITY')
        op.execute('ALTER TABLE "negocios" FORCE ROW LEVEL SECURITY')
        op.execute(
            """
            CREATE POLICY tenant_isolation ON "negocios"
            FOR ALL
            USING (
                tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::integer
            )
            WITH CHECK (
                tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::integer
            )
            """
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute('DROP POLICY IF EXISTS tenant_isolation ON "negocios"')
        op.execute('ALTER TABLE "negocios" DISABLE ROW LEVEL SECURITY')
    op.drop_table("negocios")
