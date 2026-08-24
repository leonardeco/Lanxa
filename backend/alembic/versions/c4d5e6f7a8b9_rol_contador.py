"""usuarios: agregar rol 'Contador' al CHECK constraint ck_usuarios_rol

Revision ID: c4d5e6f7a8b9
Revises: b2c3d4e5f6a7
Create Date: 2026-07-10

Recrea el CHECK de `usuarios.rol` para admitir el nuevo rol 'Contador' (área
contable: contabilidad, cartera, reportes; sin gestión de usuarios ni anulación
de ventas/compras). Batch para SQLite; también válido en PostgreSQL.
"""
from alembic import op
from sqlalchemy import text

revision = "c4d5e6f7a8b9"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None

_ROLES_NUEVO = "rol IN ('Admin', 'Administradora', 'Auxiliar', 'Contador')"
_ROLES_VIEJO = "rol IN ('Admin', 'Administradora', 'Auxiliar')"


def _is_sqlite() -> bool:
    return op.get_bind().dialect.name == "sqlite"


def upgrade() -> None:
    # SQLite: recreate=always (no DROP CONSTRAINT). Postgres: ALTER CHECK —
    # recreate=always intenta DROP TABLE usuarios con FKs y falla from-scratch.
    if _is_sqlite():
        with op.batch_alter_table("usuarios", schema=None, recreate="always") as batch:
            try:
                batch.drop_constraint("ck_usuarios_rol", type_="check")
            except (KeyError, ValueError):
                pass
            batch.create_check_constraint("ck_usuarios_rol", _ROLES_NUEVO)
        return
    op.execute(text("ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS ck_usuarios_rol"))
    op.execute(text(f"ALTER TABLE usuarios ADD CONSTRAINT ck_usuarios_rol CHECK ({_ROLES_NUEVO})"))


def downgrade() -> None:
    if _is_sqlite():
        with op.batch_alter_table("usuarios", schema=None, recreate="always") as batch:
            try:
                batch.drop_constraint("ck_usuarios_rol", type_="check")
            except (KeyError, ValueError):
                pass
            batch.create_check_constraint("ck_usuarios_rol", _ROLES_VIEJO)
        return
    op.execute(text("ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS ck_usuarios_rol"))
    op.execute(text(f"ALTER TABLE usuarios ADD CONSTRAINT ck_usuarios_rol CHECK ({_ROLES_VIEJO})"))
