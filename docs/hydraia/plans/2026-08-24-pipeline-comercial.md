# Pipeline comercial Implementation Plan

> **For agentic workers:** Implement task-by-task. Checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a tenant-scoped Negocios Kanban (fixed stages) in Lanxa ERP, linked to cliente and optional cotizacion/venta.

**Architecture:** New `app.modules.pipeline` (models, schemas, router) + Alembic `d9e0f1a2b3c4`. Frontend `PipelineView` + `pipelineApi`. Same auth cookie/JWT and `CurrentUser` as ventas.

**Tech Stack:** FastAPI, SQLAlchemy 2 async, Alembic, React 19, existing `index.css` tokens.

**Spec:** `docs/hydraia/specs/2026-08-24-pipeline-comercial-design.md`

## Global Constraints

- Alembic down_revision `c8d9e0f1a2b3`; new revision `d9e0f1a2b3c4`
- Prefix `LNX-N` via `next_sequential_numero`
- Stages exactly: Nuevo, Contactado, Cotizado, Negociación, Ganado, Perdido
- `tenant_clause` on every query; 404 if cliente/cotizacion/venta not in tenant
- Ganado does not create asientos
- UI uses `--oz-green-500`, `--neutral-850`, `.badge`, `Modal`, `Toast`, `ErrorState`
- Tests: `backend/tests/test_pipeline.py` with existing `client` + `auth_headers` fixtures
- Commands from `backend` with `venv\Scripts\python.exe -m pytest tests/test_pipeline.py -q`

## File Structure

- Create: `backend/app/modules/pipeline/__init__.py`
- Create: `backend/app/modules/pipeline/models.py`
- Create: `backend/app/modules/pipeline/schemas.py`
- Create: `backend/app/modules/pipeline/router.py`
- Create: `backend/alembic/versions/d9e0f1a2b3c4_negocios.py`
- Create: `backend/tests/test_pipeline.py`
- Create: `frontend/src/services/pipelineApi.ts`
- Create: `frontend/src/views/PipelineView.tsx`
- Modify: `backend/app/core/tenancy.py` (add `negocios` to `RLS_TABLES`)
- Modify: `backend/app/main.py` (include router)
- Modify: `frontend/src/App.tsx` (ViewId, ROLE_VIEWS, render)
- Modify: `frontend/src/components/Sidebar.tsx` (nav item)
- Modify: `frontend/src/index.css` (kanban classes)

### Task 1: Model, migration, API, tests

Implement the backend module and pytest coverage for create/list/patch etapa/tenant-safe FKs.

### Task 2: Frontend Kanban + menu

PipelineView with columns, create modal, drag + select etapa, wire App/Sidebar/CSS.

---

Adversarial notes closed: no auto-invoice; FK tenant checks; RLS on Postgres in same migration.
