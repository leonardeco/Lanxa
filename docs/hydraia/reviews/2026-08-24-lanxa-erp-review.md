# Review — Lanxa ERP (2026-08-24)

> **Repo canónico hoy:** [leonardeco/Lanxa](https://github.com/leonardeco/Lanxa). Lo de abajo es el estado del 24-ago-2026, cuando `origin` era Nexus-CRM y había una copia en Lanxa-ERP.

HEAD local: `452f98f` on `main`.
Remote local (ese día): `leonardeco/Nexus-CRM` (public, matches HEAD).
Cited remote (ese día): `leonardeco/Lanxa-ERP` (public, behind at `21073356`).

**Production audit: 44/100, blocked.** Do not treat this as ready for a public GitHub, a second company, or AWS until the blockers below are closed. The LAN single-operator path can keep running with the caveats listed.

## Blockers (do first)

1. **Both GitHub remotes are public and contain live credentials + PII of the operator.**
   - `DOCUMENTACION.md` §5 and `PENDIENTES.md` publish Superusuario email + password in plaintext, LAN IP, NIT, and company identity.
   - `leonardeco/Lanxa-ERP` and `leonardeco/Nexus-CRM` are both `visibility: public`.
   - History is not erased by a later commit. Rotate the Superusuario password on the live DB immediately; make both repos private; scrub the docs (point at `SEED_ADMIN_PASSWORD`, never the value).
   - Seed does not run `validate_password_policy()`, so a password that the UI would reject is accepted at boot.

2. **Login-by-domain is fail-closed, but seed/onboard never set `dominio`.**
   - `usuarios/router.py` rejects login if `Tenant.dominio` does not match the email domain.
   - `seeds/seed.py` creates `codigo="lanxa", dominio=None`.
   - `POST /tenants/onboard` does not set `dominio`; the schema has no field.
   - Alembic backfill only updates `codigo IN ('superozono','peru')`.
   - Fresh install and any onboarded company cannot log in. `conftest.py` also omits `dominio`, so HTTP tests that use `auth_headers` are expected to fail. E2E uses `admin@lanxa.local`.

3. **`DocumentSequence` ORM lost `tenant_id`; the migrated table requires it.**
   - Alembic `e6f7a8b9c0d1` rebuilt PK `(tenant_id, prefix)` NOT NULL.
   - `app/core/numbering.py` maps only `prefix` PK. Commit `452f98f` restored this file from an empty blob.
   - On Postgres: insert fails. On SQLite `create_all`: counters are global across tenants. `_max_suffix_from_column` has no tenant filter.

4. **Migration `3deee189e9bd` put global UNIQUEs back.**
   - Run 5 had `UNIQUE(tenant_id, col)`. The “drift fix” dropped those composites.
   - ORM still has `unique=True` on PUC code, centro code, periodos `(anio,mes)`, terceros NIT, comprobantes, etc.
   - `ventas_documentos.numero` has **no** unique at all.
   - Encoded as `xfail(strict=True)` in `test_contabilidad_tenant_isolation.py`. A second company cannot reuse PUC `110505` or period `2026-01`.

5. **`c4d5e6f7a8b9` cannot `alembic upgrade head` on empty Postgres.**
   - `batch_alter_table(..., recreate="always")` on `usuarios` while FKs exist. Documented in `PENDIENTES.md`. Empty-cloud bootstrap is broken.

## High

6. **SQLite is current LAN production — RLS is a no-op.** Isolation is only `for_tenant` / `tenant_clause`. Missed filters: `inventario/importador.py` SKU/centro queries, numbering MAX, `auditoria/purge.py` (all tenants), seed existence checks (global).
7. **`ver_tenant_id` / `resumen-global`:** any Superusuario (including a child-tenant admin) can switch tenant via contextvar. No `apply_rls_tenant`. On SQLite this is a real cross-tenant read. On Postgres it often returns empty (GUC still on JWT tenant). Hardcoded `_PAISES = {1,2,3}`.
8. **CEO is documented as consulta but can create/confirm ventas, compras, CxC** (`CurrentUser` on those endpoints; UI does not hide the buttons). Alegra mutations are also `CurrentUser`.
9. **Password change/reset does not revoke refresh tokens.** Stolen cookie survives up to 30 days.
10. **Login rate limit is 30/minute**, no lockout. Combined with a published password this is trivial.
11. **`DEBUG=true` on the LAN `.env` (gitignored) + uvicorn `0.0.0.0`** serves `/docs` and `create_all` to the whole Wi-Fi.
12. **Docker `--forwarded-allow-ips=*`** and `ClientIPMiddleware` trust `X-Forwarded-For` → rate-limit bypass + audit spoof.
13. **`ReportesView.tsx` is a 0-byte file.** Opening Reportes crashes. E2E “reportes financieros cargan” cannot pass. CI e2e is `continue-on-error`.
14. **AuthContext `[token]` effect can re-login after logout** if `/login/logout` fails and the HttpOnly cookie is still valid. Refresh interceptor `.catch(() => null)` logs out on network blips.
15. **Lifespan `except Exception` on seeds** — app boots with a warning even if PUC/admin failed.
16. **`get_tenant_id()` / login `or 1` fallback** stamps or reads Colombia if context is unset.
17. **Postgres HTTP path never uses `erp_rls_app`.** Docker `POSTGRES_USER` is superuser (`BYPASSRLS`). RLS is theater until a non-superuser role is used and GUC is set **before** reading `usuarios`.
18. **Alembic RLS never ENABLE/FORCE on `ventas_diarias*`** (listed in `RLS_TABLES` only).
19. **Inventory import / manual ajustes / anular CxC / ventas diarias skip asientos** — stock or cartera UI succeeds while books drift.
20. **Two remotes, two brands.** Local origin is Nexus-CRM; user cited Lanxa-ERP (stale). `DOCUMENTACION.md` is still Super Ozono. Compose images `superozono-*`.

## Medium (selected)

- `.env.produccion` tracked with placeholder `SECRET_KEY` / `CambiarEstaContrasena2026!`; no validator rejects them.
- Onboard does not copy PUC/periodos; combined with global uniques, Perú cannot insert the same codes.
- Business dates use `date.today()` (UTC in Docker) instead of `bogota_now()`.
- Line IVA uses `round(..., 2)` not `redondear_cop`.
- SQLite has no WAL / `busy_timeout`. Postgres has no `lock_timeout` / `statement_timeout`.
- Print `<title>` unescaped; no CSP. Body fields do go through `esc()`.
- Login labels not associated (`htmlFor`). Sidebar logo is a clickable `div`.
- `logo_ozono.png` still in `frontend/public`.
- Terraform ALB defaults to `0.0.0.0/0` if ECS is enabled; seed password `CHANGE_ME_AFTER_FIRST_DEPLOY`.
- `migrate_sqlite_to_postgres.py` omits ventas_diarias tables.

## What is solid

- Access token in memory; refresh hashed SHA-256, rotated, `HttpOnly + Secure + SameSite=Strict`.
- bcrypt cost 12; login generic error (no user enum); JWT `algorithms=[HS256]` only.
- `/docs` hidden when `DEBUG=false`; CORS wildcard rejected in production.
- JWT `tenant_id` ≠ `user.tenant_id` → 401.
- Main ventas/compras/contabilidad list/get paths use `for_tenant` / `get_for_tenant`. Isolation test suite exists (HTTP+RLS path is the hole).
- Anular venta/compra and inventory adjust are `AdminOrAdministradoraDep`.
- Asiento engine checks partida doble and closed periods.
- Encrypted backups; `*.db` and `certs/` gitignored; `backend/.env` gitignored.
- CI: flake8, mypy, pytest+coverage, pip-audit, frontend lint/tsc/vitest/build. E2E is informational only.

## Evidence checked

- Local tree at `C:\Users\MI PC\Documents\Lanxa ERP`, `git status` clean, `HEAD == origin/main` (Nexus-CRM).
- GitHub API: both `leonardeco/Lanxa-ERP` and `leonardeco/Nexus-CRM` `private: false`.
- `DOCUMENTACION.md` on the public Lanxa-ERP default branch still contains the credentials table.
- Auth (`security.py`, `deps.py`, `usuarios/router.py`, `AuthContext.tsx`, `api.ts`).
- Tenancy (`tenancy.py`, `database.py`, RLS migration, `ventas_diarias/router.py`, seed, onboard).
- Numbering + Alembic chain (`numbering.py`, `e6f7a8b9c0d1`, `3deee189e9bd`, `c4d5e6f7a8b9`).
- Frontend `App.tsx` ROLE_VIEWS, empty `ReportesView.tsx`, e2e smoke.
- Compose/Dockerfile/terraform secrets and security groups.
- Reviewer panel: hydraia-reviewer, security-reviewer, silent-failure-hunter, python-reviewer, react-reviewer, database-reviewer.

## Evidence missing

- Live pytest/Playwright run in this session (needs local Postgres + seeded LAN).
- Confirmation that the LAN Superusuario password was already rotated after it was written to docs.
- Whether `leonardeco` intended both remotes to stay public.

## Next action

1. Rotate Superusuario (and any password that appeared in git) on the live SQLite DB.
2. Make `leonardeco/Lanxa-ERP` and `leonardeco/Nexus-CRM` **private**.
3. Remove live passwords/IPs/NIT from `DOCUMENTACION.md` and `PENDIENTES.md`.
4. Set `Tenant.dominio` from `SEED_ADMIN_EMAIL` in seed + onboard; fix conftest.
5. Restore `tenant_id` on `DocumentSequence` and a forward migration for composite uniques.

Do not enable ECS/ALB or onboard a third company until 1–5 and the RLS HTTP path are done.
