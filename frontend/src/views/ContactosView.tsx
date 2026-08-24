import { useState } from 'react';
import VentasView from './VentasView';
import ComprasView from './ComprasView';

type ContactoTab = 'clientes' | 'proveedores';

export default function ContactosView() {
  const [tab, setTab] = useState<ContactoTab>('clientes');

  return (
    <div className="fade-in">
      <div className="tabs-bar" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={`tab-item ${tab === 'clientes' ? 'active' : ''}`}
          onClick={() => setTab('clientes')}
        >
          Clientes
        </button>
        <button
          type="button"
          className={`tab-item ${tab === 'proveedores' ? 'active' : ''}`}
          onClick={() => setTab('proveedores')}
        >
          Proveedores
        </button>
      </div>
      {tab === 'clientes' && <VentasView initialTab="clientes" hideTabs />}
      {tab === 'proveedores' && <ComprasView initialTab="proveedores" hideTabs />}
    </div>
  );
}
