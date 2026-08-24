import { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import ErrorState from '../components/ErrorState';
import {
  ventasApi,
  type Cliente,
  type Cotizacion,
  type Venta,
} from '../services/ventasApi';

function cop(n: number) {
  return Number(n).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

export default function ClienteFichaModal({
  cliente,
  onClose,
  onEdit,
}: {
  cliente: Cliente;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cots, setCots] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      ventasApi.getVentas().then((r) => r.data.filter((v) => v.cliente_id === cliente.id)),
      ventasApi.getCotizaciones().then((r) => r.data.filter((c) => c.cliente_id === cliente.id)),
    ])
      .then(([v, c]) => {
        if (cancelled) return;
        setVentas(v);
        setCots(c);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar el historial del cliente');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [cliente.id, intento]);

  const totalVentas = ventas
    .filter((v) => v.estado !== 'Anulada')
    .reduce((s, v) => s + Number(v.total), 0);

  return (
    <Modal title={`Ficha — ${cliente.razon_social}`} onClose={onClose} wide>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)' }}>NIT / CC</div>
          <div style={{ fontWeight: 600 }}>{cliente.nit_cc}{cliente.dv ? `-${cliente.dv}` : ''}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)' }}>Ciudad</div>
          <div>{cliente.ciudad || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)' }}>Contacto</div>
          <div>{cliente.contacto_nombre || '—'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>{cliente.email || cliente.celular || ''}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)' }}>Cupo / plazo</div>
          <div>{cop(cliente.cupo_credito)} · {cliente.dias_credito} días</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: '0.85rem' }}>
        <span>Facturado (no anulado): <strong>{cop(totalVentas)}</strong></span>
        <span>Ventas: <strong>{ventas.length}</strong></span>
        <span>Cotizaciones: <strong>{cots.length}</strong></span>
      </div>

      {loading ? (
        <div className="empty-state" style={{ padding: 16 }}><div className="empty-state-icon">⏳</div></div>
      ) : error ? (
        <ErrorState mensaje={error} onRetry={() => setIntento((n) => n + 1)} />
      ) : (
        <>
          <div className="section-label" style={{ marginBottom: 8 }}>Cotizaciones</div>
          {cots.length === 0 ? (
            <div style={{ color: 'var(--neutral-500)', fontSize: '0.8rem', marginBottom: 16 }}>Sin cotizaciones</div>
          ) : (
            <table className="data-table" style={{ marginBottom: 16 }}>
              <thead>
                <tr><th>N°</th><th>Fecha</th><th>Estado</th><th>Total</th></tr>
              </thead>
              <tbody>
                {cots.map((c) => (
                  <tr key={c.id}>
                    <td className="code">{c.numero}</td>
                    <td>{c.fecha}</td>
                    <td><span className="badge">{c.estado}</span></td>
                    <td className="code">{cop(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="section-label" style={{ marginBottom: 8 }}>Ventas</div>
          {ventas.length === 0 ? (
            <div style={{ color: 'var(--neutral-500)', fontSize: '0.8rem' }}>Sin documentos de venta</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>N°</th><th>Fecha</th><th>Estado</th><th>Pago</th><th>Total</th></tr>
              </thead>
              <tbody>
                {ventas.map((v) => (
                  <tr key={v.id}>
                    <td className="code">{v.numero}</td>
                    <td>{v.fecha}</td>
                    <td><span className="badge">{v.estado}</span></td>
                    <td><span className="badge">{v.estado_pago}</span></td>
                    <td className="code">{cop(v.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      <div className="form-actions" style={{ marginTop: 16 }}>
        <button type="button" className="btn-secondary" onClick={onClose}>Cerrar</button>
        <button type="button" className="btn-primary" onClick={onEdit}>Editar ficha</button>
      </div>
    </Modal>
  );
}
