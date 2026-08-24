import { useCallback, useEffect, useState } from 'react';
import { pipelineApi, ETAPAS_PIPELINE, type Negocio } from '../services/pipelineApi';
import { ventasApi, type Cliente } from '../services/ventasApi';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import ErrorState from '../components/ErrorState';

const ETAPA_COLOR: Record<string, string> = {
  Nuevo: 'neutral',
  Contactado: 'blue',
  Cotizado: 'cyan',
  Negociación: 'amber',
  Ganado: 'green',
  Perdido: 'red',
};

function cop(n: number) {
  return Number(n).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

export default function PipelineView() {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showNuevo, setShowNuevo] = useState(false);
  const [editing, setEditing] = useState<Negocio | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([pipelineApi.listar(), ventasApi.getClientes()])
      .then(([n, c]) => {
        setNegocios(n.data);
        setClientes(c.data);
      })
      .catch(() => setError('No se pudo cargar el pipeline'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const mover = async (id: number, etapa: string) => {
    const actual = negocios.find((n) => n.id === id);
    if (!actual || actual.etapa === etapa) return;
    setNegocios((prev) => prev.map((n) => (n.id === id ? { ...n, etapa } : n)));
    try {
      const r = await pipelineApi.cambiarEtapa(id, etapa);
      setNegocios((prev) => prev.map((n) => (n.id === id ? r.data : n)));
    } catch {
      setToast({ msg: 'No se pudo mover el negocio', type: 'error' });
      load();
    }
  };

  const borrar = async (n: Negocio) => {
    if (!confirm(`¿Eliminar ${n.numero} — ${n.titulo}?`)) return;
    try {
      await pipelineApi.eliminar(n.id);
      setNegocios((prev) => prev.filter((x) => x.id !== n.id));
      setToast({ msg: `${n.numero} eliminado`, type: 'success' });
    } catch {
      setToast({ msg: 'No se pudo eliminar', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="empty-state fade-in">
        <div className="empty-state-icon">⏳</div>
        <div className="empty-state-text">Cargando pipeline…</div>
      </div>
    );
  }
  if (error) return <ErrorState mensaje={error} onRetry={load} />;

  return (
    <div className="fade-in">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="table-header" style={{ marginBottom: 16 }}>
        <div className="table-title">Pipeline comercial</div>
        <button type="button" className="btn-primary-sm" onClick={() => { setEditing(null); setShowNuevo(true); }}>
          + Nuevo negocio
        </button>
      </div>

      <div className="kanban-board" role="region" aria-label="Tablero de pipeline">
        {ETAPAS_PIPELINE.map((etapa) => {
          const cards = negocios.filter((n) => n.etapa === etapa);
          const total = cards.reduce((s, n) => s + Number(n.valor_estimado || 0), 0);
          return (
            <section
              key={etapa}
              className="kanban-col"
              role="list"
              aria-label={`${etapa}, ${cards.length} negocios`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = Number(e.dataTransfer.getData('text/plain') || dragId);
                if (id && negocios.some((n) => n.id === id)) void mover(id, etapa);
                setDragId(null);
              }}
            >
              <div className="kanban-col-head">
                <span className={`badge ${ETAPA_COLOR[etapa] || 'neutral'}`}>{etapa}</span>
                <span className="table-count">{cards.length}</span>
              </div>
              <div className="kanban-col-sum">{cop(total)}</div>
              {cards.length === 0 ? (
                <div className="kanban-empty">Sin negocios</div>
              ) : cards.map((n) => (
                <article
                  key={n.id}
                  className="kanban-card"
                  role="listitem"
                  draggable
                  onDragStart={(e) => {
                    const t = e.target as HTMLElement;
                    if (t.closest('select,button,label,input,textarea')) {
                      e.preventDefault();
                      return;
                    }
                    setDragId(n.id);
                    e.dataTransfer.setData('text/plain', String(n.id));
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => setDragId(null)}
                >
                  <div className="kanban-card-num">{n.numero}</div>
                  <h3 className="kanban-card-title">{n.titulo}</h3>
                  <div className="kanban-card-client">{n.cliente_razon_social || '—'}</div>
                  <div className="kanban-card-val">{cop(Number(n.valor_estimado))}</div>
                  <label className="kanban-card-stage">
                    <span className="sr-only">Etapa de {n.numero}</span>
                    <select
                      aria-label={`Etapa de ${n.numero}`}
                      value={n.etapa}
                      onChange={(e) => void mover(n.id, e.target.value)}
                    >
                      {ETAPAS_PIPELINE.map((et) => (
                        <option key={et} value={et}>{et}</option>
                      ))}
                    </select>
                  </label>
                  <div className="kanban-card-actions">
                    <button type="button" className="btn-icon" title="Editar" aria-label={`Editar ${n.numero}`} onClick={() => { setEditing(n); setShowNuevo(true); }}>✏️</button>
                    <button type="button" className="btn-icon" title="Eliminar" aria-label={`Eliminar ${n.numero}`} onClick={() => void borrar(n)}>🗑️</button>
                  </div>
                </article>
              ))}
            </section>
          );
        })}
      </div>

      {showNuevo && (
        <NegocioFormModal
          negocio={editing}
          clientes={clientes}
          onClose={() => { setShowNuevo(false); setEditing(null); }}
          onSaved={(saved) => {
            setNegocios((prev) => {
              const i = prev.findIndex((x) => x.id === saved.id);
              if (i < 0) return [saved, ...prev];
              const next = [...prev];
              next[i] = saved;
              return next;
            });
            setShowNuevo(false);
            setEditing(null);
            setToast({ msg: editing ? 'Negocio actualizado' : `Creado ${saved.numero}`, type: 'success' });
          }}
        />
      )}
    </div>
  );
}

function NegocioFormModal({
  negocio,
  clientes,
  onClose,
  onSaved,
}: {
  negocio: Negocio | null;
  clientes: Cliente[];
  onClose: () => void;
  onSaved: (n: Negocio) => void;
}) {
  const [titulo, setTitulo] = useState(negocio?.titulo || '');
  const [clienteId, setClienteId] = useState(negocio?.cliente_id?.toString() || '');
  const [valor, setValor] = useState(negocio ? String(negocio.valor_estimado) : '');
  const [fecha, setFecha] = useState(negocio?.fecha_cierre || '');
  const [notas, setNotas] = useState(negocio?.notas || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const dirty =
    titulo !== (negocio?.titulo || '') ||
    clienteId !== (negocio?.cliente_id?.toString() || '') ||
    valor !== (negocio ? String(negocio.valor_estimado) : '') ||
    fecha !== (negocio?.fecha_cierre || '') ||
    notas !== (negocio?.notas || '');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !clienteId) {
      setErr('Título y cliente son obligatorios');
      return;
    }
    setSaving(true);
    setErr('');
    const body = {
      titulo: titulo.trim(),
      cliente_id: Number(clienteId),
      valor_estimado: Number(valor) || 0,
      fecha_cierre: fecha || null,
      notas: notas.trim() || null,
    };
    try {
      const r = negocio
        ? await pipelineApi.actualizar(negocio.id, body)
        : await pipelineApi.crear(body);
      onSaved(r.data);
    } catch (ex: unknown) {
      const detail = (ex as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErr(typeof detail === 'string' ? detail : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={negocio ? `Editar ${negocio.numero}` : 'Nuevo negocio'} onClose={onClose} confirmDiscard={dirty}>
      <form onSubmit={submit} className="form-vertical" style={{ padding: 4 }}>
        <div className="form-group">
          <label className="form-label" htmlFor="ng-titulo">Título *</label>
          <input id="ng-titulo" className="form-input" value={titulo} onChange={(e) => setTitulo(e.target.value)} required maxLength={200} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="ng-cli">Cliente *</label>
          <select id="ng-cli" className="form-input" value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
            <option value="">Selecciona un cliente</option>
            {clientes.filter((c) => c.activo || c.id === negocio?.cliente_id).map((c) => (
              <option key={c.id} value={c.id}>{c.razon_social}{c.activo ? '' : ' (inactivo)'}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="ng-val">Valor estimado</label>
            <input id="ng-val" className="form-input" type="number" min="0" step="1000" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="ng-fec">Cierre esperado</label>
            <input id="ng-fec" className="form-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="ng-not">Notas</label>
          <textarea id="ng-not" className="form-input" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={2000} />
        </div>
        {err && <div className="form-error" role="alert">{err}</div>}
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}
