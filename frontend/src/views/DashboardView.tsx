import { useState, useEffect } from 'react';
import { dashboardApi, type ContabilidadStats, type VentasStats } from '../services/dashboardApi';
import Skeleton from '../components/Skeleton';
import ErrorState from '../components/ErrorState';

function fmt(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}

export default function DashboardView() {
  const [contab, setContab] = useState<ContabilidadStats | null>(null);
  const [ventas, setVentas] = useState<VentasStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([dashboardApi.getVentasStats(), dashboardApi.getContabilidadStats()])
      .then(([v, c]) => {
        setVentas(v);
        setContab(c);
      })
      .catch(() => setError('No se pudo cargar el dashboard. Verifica que el backend esté corriendo.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div aria-busy="true">
        <Skeleton variant="text" width={200} style={{ marginBottom: 16 }} />
        <div className="stats-grid"><Skeleton variant="card" count={3} /></div>
      </div>
    );
  }

  if (error) {
    return <ErrorState mensaje={error} onRetry={load} />;
  }

  const delta = ventas && ventas.ventas_mes_anterior > 0
    ? Math.round(((ventas.ventas_mes_actual - ventas.ventas_mes_anterior) / ventas.ventas_mes_anterior) * 100)
    : null;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--neutral-100)' }}>
          Resumen de operación
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--neutral-400)', marginTop: 2 }}>
          {contab?.empresa_razon_social || 'Lanxa ERP'} — mes en curso
        </div>
      </div>

      {ventas && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
          <div className="stat-card fade-in">
            <div className="stat-card-header"><div className="stat-card-icon green">💵</div></div>
            <div className="stat-card-value">{fmt(ventas.ventas_mes_actual)}</div>
            <div className="stat-card-label">
              Ventas del mes
              {delta !== null && (
                <span style={{ marginLeft: 8, color: delta >= 0 ? 'var(--oz-green-400)' : 'var(--red-400)' }}>
                  {delta >= 0 ? '+' : ''}{delta}% vs mes anterior
                </span>
              )}
            </div>
          </div>
          <div className="stat-card fade-in fade-in-delay-1">
            <div className="stat-card-header"><div className="stat-card-icon blue">🧾</div></div>
            <div className="stat-card-value">{ventas.cantidad_ventas_mes}</div>
            <div className="stat-card-label">Documentos del mes</div>
          </div>
          <div className="stat-card fade-in fade-in-delay-2">
            <div className="stat-card-header"><div className="stat-card-icon amber">🎫</div></div>
            <div className="stat-card-value">{fmt(ventas.ticket_promedio)}</div>
            <div className="stat-card-label">Ticket promedio</div>
          </div>
          <div className="stat-card fade-in">
            <div className="stat-card-header"><div className="stat-card-icon purple">👥</div></div>
            <div className="stat-card-value">{ventas.total_clientes_activos}</div>
            <div className="stat-card-label">Clientes activos</div>
          </div>
          <div className="stat-card fade-in fade-in-delay-1">
            <div className="stat-card-header"><div className="stat-card-icon blue">📦</div></div>
            <div className="stat-card-value">{ventas.total_productos_activos}</div>
            <div className="stat-card-label">Productos activos</div>
          </div>
          <div className="stat-card fade-in fade-in-delay-2">
            <div className="stat-card-header"><div className="stat-card-icon red">⚠️</div></div>
            <div className="stat-card-value" style={{ color: ventas.productos_stock_bajo > 0 ? 'var(--amber-400)' : undefined }}>
              {ventas.productos_stock_bajo}
            </div>
            <div className="stat-card-label">Stock bajo</div>
          </div>
        </div>
      )}

      {ventas && ventas.ventas_por_marca.length > 0 && (
        <>
          <div className="section-label" style={{ marginBottom: 12 }}>Ventas por marca</div>
          <div className="chart-card fade-in" style={{ marginBottom: 24 }}>
            {ventas.ventas_por_marca.map((vm) => {
              const max = Math.max(...ventas.ventas_por_marca.map((x) => x.total), 1);
              return (
                <div key={vm.marca} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 120, fontSize: '0.8rem', color: 'var(--neutral-300)' }}>{vm.marca || 'Sin marca'}</div>
                  <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
                    <div style={{ width: `${Math.max((vm.total / max) * 100, 4)}%`, height: '100%', background: 'var(--oz-green-500)', borderRadius: 4 }} />
                  </div>
                  <div style={{ width: 110, textAlign: 'right', fontSize: '0.8rem', fontWeight: 600 }}>{fmt(vm.total)}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {contab && (
        <>
          <div className="section-label" style={{ marginBottom: 12 }}>Contabilidad</div>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="stat-card fade-in">
              <div className="stat-card-header"><div className="stat-card-icon green">📋</div></div>
              <div className="stat-card-value">{contab.total_cuentas_puc}</div>
              <div className="stat-card-label">Cuentas PUC</div>
            </div>
            <div className="stat-card fade-in fade-in-delay-1">
              <div className="stat-card-header"><div className="stat-card-icon blue">🏷️</div></div>
              <div className="stat-card-value">{contab.total_centros_costo}</div>
              <div className="stat-card-label">Centros de costo</div>
            </div>
            <div className="stat-card fade-in fade-in-delay-2">
              <div className="stat-card-header"><div className="stat-card-icon amber">📅</div></div>
              <div className="stat-card-value">{contab.total_periodos}</div>
              <div className="stat-card-label">Períodos {new Date().getFullYear()}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
