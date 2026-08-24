# Design: pipeline comercial (Negocios Kanban)

**Goal:** Add a sales pipeline to Lanxa ERP so commercial users can track opportunities (negocios) through fixed stages before a quote or invoice exists, linked to existing clientes / cotizaciones / ventas.

**Chosen approach:** New `pipeline` module in the current FastAPI + React app (SQLite LAN). Table `negocios`, REST `/api/v1/pipeline`, sidebar item **Pipeline**. Do not import Nexus-CRM code or schema-per-tenant.

**Rejected:**
- Git-merge Nexus `master` (unrelated history, Postgres schemas, Redis/MFA).
- Kanban that only filters cotizaciones (a deal exists before a quote).
- Configurable stages in v1 (extra table + UI; user chose fixed stages).

**Code-graph anchors:**
- `app.core.tenancy.TenantScoped`, `tenant_clause`, `RLS_TABLES`
- `app.core.numbering.next_sequential_numero`
- `app.modules.ventas.models.Cliente`, `Cotizacion`, `VentaDocumento`
- `app.api.deps.CurrentUser`
- `frontend/src/App.tsx` `ViewId` / `ROLE_VIEWS`
- `frontend/src/components/Sidebar.tsx` Operaciones
- Tokens in `frontend/src/index.css` (`--oz-green-*`, `--neutral-*`, `.badge`, `.modal-*`)

**Global constraints:**
- FastAPI + SQLAlchemy 2 async; Alembic head `c8d9e0f1a2b3`; new revision `d9e0f1a2b3c4`
- Unique per tenant; no global unique on `numero`
- SQLite LAN now; Postgres RLS policy on `negocios` in the same migration (no-op on SQLite)
- Do not create asientos when etapa = Ganado
- Copy in Spanish UI; code/commits English
- Roles: same visibility as Contactos/Ventas (Superusuario, Directora, CEO, Contador, Auxiliar Contable)

**Threat model:**
- Cross-tenant leak of deals → always `tenant_clause` + stamp `tenant_id`; validate cliente/cotizacion/venta belong to current tenant
- IDOR on PATCH etapa → load via tenant-scoped get or 404
- Inflated forecast from untrusted valor_estimado → stored only; never posts accounting
- XSS in titulo/notas → existing React text; print not in v1
- Privilege: any authenticated user who can open the module; no public routes

**UX / visual direction (Lanxa design system, dark):**
- Style: existing glass-dark ERP (not a new visual language)
- Palette: board background `--neutral-900`; columns `--neutral-850` border `rgba(255,255,255,0.08)`; primary `--oz-green-500` `#7c5cff`; accent cyan `#1fe6cd`; Ganado `--oz-green-300`; Perdido `--red-400`; mid stages `--blue-400` / `--amber-400`
- Type: Inter body 0.82–0.9rem; JetBrains Mono for `numero` and COP amounts
- Spacing: 8px rhythm; column min-width 200px; card padding 12px; gap 12px
- Interaction: HTML5 drag-and-drop plus `<select>` on the card (keyboard / no-hover)
- Empty column: short hint, not a spinner
- Modal: existing `Modal` + `.form-label` / `.form-input`; required asterisks; confirmDiscard
- a11y: column `aria-label` with stage name + count; cards `button` or `article` with keyboard; drag is extra; contrast text `--neutral-200` on `--neutral-850` > 4.5:1; focus ring 2px `--oz-green-500`
- Reduced motion: skip card lift transform when `prefers-reduced-motion`

**v1 behavior:**
- Stages: Nuevo, Contactado, Cotizado, Negociación, Ganado, Perdido
- Fields: titulo*, cliente_id*, valor_estimado (default 0), fecha_cierre optional, cotizacion_id/venta_id optional, notas
- Numero `LNX-N-0001`
- Moving to Cotizado does not auto-create a quote
- Ganado does not auto-create a sale
- Delete allowed (UI confirm)
- List returns all deals for tenant (no pagination in v1; typical LAN volume)

**Out of v1:** custom stages, forecast %, rotting, WhatsApp, operational suite.
