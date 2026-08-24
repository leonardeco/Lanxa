import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ViewId } from '../App';
import { ventasApi } from '../services/ventasApi';
import { comprasApi } from '../services/comprasApi';

interface ModuleItem {
  id: ViewId;
  label: string;
}

interface Hit {
  id: string;
  group: string;
  label: string;
  hint?: string;
  view: ViewId;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  modules: ModuleItem[];
  onNavigate: (view: ViewId) => void;
}

function norm(s: string) {
  return s.toLowerCase();
}

export default function CommandPalette({ open, onClose, modules, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setHits([]);
      setActive(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      ventasApi.getClientes().then((r) => r.data).catch(() => []),
      ventasApi.getProductos().then((r) => r.data).catch(() => []),
      ventasApi.getVentas().then((r) => r.data).catch(() => []),
      ventasApi.getCotizaciones().then((r) => r.data).catch(() => []),
      comprasApi.getProveedores().then((r) => r.data).catch(() => []),
      comprasApi.getCompras().then((r) => r.data).catch(() => []),
    ])
      .then(([clientes, productos, ventas, cots, proveedores, compras]) => {
        if (cancelled) return;
        const rec: Hit[] = [
          ...clientes.map((c) => ({
            id: `cli-${c.id}`,
            group: 'Clientes',
            label: c.razon_social,
            hint: c.nit_cc,
            view: 'contactos' as ViewId,
          })),
          ...proveedores.map((p) => ({
            id: `prv-${p.id}`,
            group: 'Proveedores',
            label: p.razon_social,
            hint: p.nit_cc,
            view: 'contactos' as ViewId,
          })),
          ...productos.map((p) => ({
            id: `prd-${p.id}`,
            group: 'Productos',
            label: p.nombre,
            hint: p.sku,
            view: 'productos' as ViewId,
          })),
          ...cots.map((c) => ({
            id: `cot-${c.id}`,
            group: 'Cotizaciones',
            label: c.numero,
            hint: c.cliente_razon_social,
            view: 'cotizaciones' as ViewId,
          })),
          ...ventas.map((v) => ({
            id: `vta-${v.id}`,
            group: 'Ventas',
            label: v.numero,
            hint: v.cliente_razon_social,
            view: 'ventas' as ViewId,
          })),
          ...compras.map((c) => ({
            id: `cpa-${c.id}`,
            group: 'Compras',
            label: c.numero,
            hint: c.proveedor_razon_social,
            view: 'compras' as ViewId,
          })),
        ];
        setHits(rec);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    const el = activeRef.current;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [active]);

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    const moduleHits: Hit[] = modules.map((m) => ({
      id: `mod-${m.id}`,
      group: 'Ir a',
      label: m.label,
      view: m.id,
    }));
    const all = [...moduleHits, ...hits];
    if (!q) return all.slice(0, 40);
    return all.filter((h) =>
      norm(h.label).includes(q) || (h.hint ? norm(h.hint).includes(q) : false),
    ).slice(0, 40);
  }, [query, hits, modules]);

  useEffect(() => {
    setActive(0);
  }, [query, filtered.length]);

  const go = useCallback((hit: Hit) => {
    onNavigate(hit.view);
    onClose();
  }, [onNavigate, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[active]) {
        e.preventDefault();
        go(filtered[active]);
      } else if (e.key === 'Tab') {
        const root = cardRef.current;
        if (!root) return;
        const focusable = root.querySelectorAll<HTMLElement>('input, button');
        if (focusable.length === 0) return;
        e.preventDefault();
        const idx = Array.from(focusable).indexOf(document.activeElement as HTMLElement);
        const next = e.shiftKey
          ? (idx <= 0 ? focusable.length - 1 : idx - 1)
          : (idx + 1) % focusable.length;
        focusable[next].focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, active, go, onClose]);

  if (!open) return null;

  let lastGroup = '';

  return (
    <div
      className="cmdk-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cmdk-card" role="dialog" aria-modal="true" aria-label="Búsqueda global" ref={cardRef}>
        <input
          ref={inputRef}
          className="cmdk-input"
          type="search"
          placeholder="Buscar módulos, contactos, productos, documentos…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar en el ERP"
          aria-autocomplete="list"
        />
        <div className="cmdk-list">
          {loading && <div className="cmdk-empty">Cargando registros…</div>}
          {!loading && filtered.length === 0 && (
            <div className="cmdk-empty">Sin coincidencias</div>
          )}
          {filtered.map((h, i) => {
            const showGroup = h.group !== lastGroup;
            lastGroup = h.group;
            return (
              <div key={h.id}>
                {showGroup && <div className="cmdk-group">{h.group}</div>}
                <button
                  type="button"
                  ref={i === active ? activeRef : undefined}
                  className={`cmdk-item ${i === active ? 'active' : ''}`}
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(h)}
                >
                  <span>{h.label}</span>
                  {h.hint && <span className="cmdk-hint">{h.hint}</span>}
                </button>
              </div>
            );
          })}
        </div>
        <div className="cmdk-foot">
          <span>↑↓ navegar</span>
          <span>Enter abrir</span>
          <span>Esc cerrar</span>
        </div>
      </div>
    </div>
  );
}
