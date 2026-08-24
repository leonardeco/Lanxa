# Review-fixes Implementation Plan

> **For agentic workers:** Implement sequentially in this session. Tasks share models/migrations; do not fan out parallel editors on the same files.

**Goal:** Scrub published credentials, make login-by-domain work, restore tenant-scoped numbering and uniques, restore ReportesView.

**Architecture:** Domain is derived from admin email at seed and onboard. DocumentSequence maps the Alembic composite PK. A forward Alembic revision restores UNIQUE(tenant_id, key) without rewriting `3deee189e9bd`. ReportesView is restored from git history.

**Tech Stack:** FastAPI, SQLAlchemy 2, Alembic, React 19, pytest, Vitest.

**Spec:** `docs/hydraia/specs/2026-08-24-review-fixes-design.md`

## Global Constraints

- Do not commit `backend/.env` or invent a live Superusuario password.
- New Alembic revision down_revision = `4e24b843eccd`.
- Composite unique names match Run 5 (`uq_*_tenant_*`) so `alembic check` matches models.
- Login remains fail-closed if dominio is missing.

## File Structure

- Modify: `DOCUMENTACION.md`, `PENDIENTES.md` — remove live passwords/IPs/NIT from credential tables
- Modify: `backend/app/core/passwords.py` — denylist leaked values
- Modify: `backend/app/core/tenancy.py` — `dominio_desde_email`
- Modify: `backend/seeds/seed.py` — set/backfill dominio
- Modify: `backend/app/modules/tenancy/schemas.py` + `router.py` — persist dominio
- Modify: `backend/tests/conftest.py` — `dominio="test.com"`
- Modify: `backend/app/core/numbering.py` — tenant PK
- Modify: contabilidad/compras/ventas `models.py` — UniqueConstraint(tenant_id, key)
- Create: `backend/alembic/versions/b7c8d9e0f1a2_tenant_uniques_y_dominio.py`
- Modify: `backend/alembic/versions/c4d5e6f7a8b9_rol_contador.py` — Postgres dialect split
- Restore: `frontend/src/views/ReportesView.tsx` from `2eac7bf`
- Test: `backend/tests/test_password_policy.py`, `test_tenant_onboard.py`, `test_tenancy.py`, `test_contabilidad_tenant_isolation.py`

### Task 1: Secrets in docs + denylist
### Task 2: dominio seed/onboard/conftest
### Task 3: DocumentSequence + model uniques + migration
### Task 4: Restore ReportesView
### Task 5: Verify tests
