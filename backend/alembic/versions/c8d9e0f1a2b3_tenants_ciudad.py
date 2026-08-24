"""tenants: ciudad para ajustes de empresa en UI

Revision ID: c8d9e0f1a2b3
Revises: b7c8d9e0f1a2
Create Date: 2026-08-24
"""
from alembic import op
import sqlalchemy as sa

revision = "c8d9e0f1a2b3"
down_revision = "b7c8d9e0f1a2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("tenants", schema=None) as batch:
        batch.add_column(sa.Column("ciudad", sa.String(length=100), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("tenants", schema=None) as batch:
        batch.drop_column("ciudad")
