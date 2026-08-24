# Design: review-fixes (secrets, dominio, numbering, uniques, Reportes)

**Goal:** Close the blockers from the 2026-08-24 review: stop publishing live credentials, make login-by-domain work for seed/onboard/tests, restore per-tenant document numbering and unique keys, restore ReportesView.

**Chosen approach:** Surgical patches on current `main`. No rewrite of applied Alembic revisions except `c4d5e6f7a8b9` (dialect split; already applied on LAN so it will not re-run). New forward migration `b7c8d9e0f1a2` restores composite uniques and backfills NULL `tenants.dominio`.

**Rejected:**
- Squash/rebase of the whole Alembic chain (would break the LAN DB that already applied `3deee189e9bd`).
- Inventing a new Superusuario password and writing it to git (replaces one leak with another). Rotation is an operator action in the UI after denylist + docs scrub.
- Making GitHub repos private from this session if the token is not `leonardeco` with admin (TIbitwan6 is pull-only).

**Code-graph anchors:**
- `app/modules/usuarios/router.py` login domain lookup
- `seeds/seed.py` `seed_tenant`
- `app/modules/tenancy/router.py` onboard
- `app/core/numbering.py` `DocumentSequence` / `next_sequential_numero`
- Unique columns in `contabilidad/models.py`, `compras/models.py`, `ventas/models.py`
- `frontend/src/views/ReportesView.tsx` (emptied in `b47db65`; restore from `2eac7bf`)

**Global constraints:**
- FastAPI + SQLAlchemy 2 async, Alembic HEAD currently `4e24b843eccd`
- Do not commit `backend/.env` or live secrets
- Password policy remains min 8, letter+digit, denylist
- Tenant isolation: UNIQUE(tenant_id, business_key) on tenant-scoped tables
- UI restore matches existing CSS classes (`.btn-secondary`, `.fade-in`, ErrorState) — no new visual system

**Threat model:**
- Credentials in git → scrub + denylist of leaked values; operator must rotate live password
- Login fail-closed without dominio → lockout of new tenants; fix by always setting unique dominio
- Global uniques / shared sequences → cross-tenant IntegrityError or shared invoice numbers; restore composites + tenant-scoped counters

**UX / visual direction:** Restore `ReportesView.tsx` from `2eac7bf` unchanged except encoding-safe checkout. Existing Lanxa tokens in `index.css` already apply.
