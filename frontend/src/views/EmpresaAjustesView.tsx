import { useState, useEffect } from 'react';
import { ventasApi, type EmpresaInfo } from '../services/ventasApi';
import { invalidateEmpresaCache } from '../hooks/useEmpresa';
import Toast from '../components/Toast';
import Skeleton from '../components/Skeleton';

export default function EmpresaAjustesView() {
  const [form, setForm] = useState({ nit: '', razon_social: '', ciudad: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    ventasApi.getEmpresa()
      .then((r) => {
        const e: EmpresaInfo = r.data;
        setForm({
          nit: e.nit ?? '',
          razon_social: e.razon_social ?? '',
          ciudad: e.ciudad ?? '',
        });
      })
      .catch(() => setToast({ message: 'No se pudieron cargar los datos de la empresa', type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [k]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.razon_social.trim()) {
      setToast({ message: 'La razón social es obligatoria', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const r = await ventasApi.updateEmpresa({
        nit: form.nit.trim(),
        razon_social: form.razon_social.trim(),
        ciudad: form.ciudad.trim(),
      });
      setForm({
        nit: r.data.nit ?? '',
        razon_social: r.data.razon_social ?? '',
        ciudad: r.data.ciudad ?? '',
      });
      invalidateEmpresaCache();
      setToast({ message: 'Datos de empresa guardados. Se usarán en facturas e impresión.', type: 'success' });
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setToast({ message: detail || 'Error al guardar', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="table-container" aria-busy="true" style={{ padding: 16 }}>
        <Skeleton variant="row" count={4} />
      </div>
    );
  }

  return (
    <div className="fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="table-container" style={{ maxWidth: 640 }}>
        <div className="table-header">
          <div className="table-title">Ajustes de empresa</div>
        </div>
        <form onSubmit={handleSubmit} className="form-vertical" style={{ padding: 20 }}>
          <p style={{ color: 'var(--neutral-400)', fontSize: '0.85rem', marginTop: 0 }}>
            Estos datos salen en facturas e impresión. Cada empresa tiene los suyos.
          </p>
          <div className="form-group">
            <label className="form-label" htmlFor="emp-razon">Razón social *</label>
            <input id="emp-razon" className="form-input" value={form.razon_social} onChange={set('razon_social')} placeholder="LANXA S.A.S." />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="emp-nit">NIT</label>
            <input id="emp-nit" className="form-input" value={form.nit} onChange={set('nit')} placeholder="900000000-0" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="emp-ciudad">Ciudad</label>
            <input id="emp-ciudad" className="form-input" value={form.ciudad} onChange={set('ciudad')} placeholder="Armenia, Quindío" />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
