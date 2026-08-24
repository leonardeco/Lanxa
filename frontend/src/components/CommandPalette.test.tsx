import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../services/ventasApi', () => ({
  ventasApi: {
    getClientes: () => Promise.resolve({ data: [{ id: 1, razon_social: 'Acme SAS', nit_cc: '900111' }] }),
    getProductos: () => Promise.resolve({ data: [{ id: 1, nombre: 'Producto Alfa', sku: 'PRD-001' }] }),
    getVentas: () => Promise.resolve({ data: [{ id: 1, numero: 'LNX-V-0001', cliente_razon_social: 'Acme SAS' }] }),
    getCotizaciones: () => Promise.resolve({ data: [] }),
  },
}));

vi.mock('../services/comprasApi', () => ({
  comprasApi: {
    getProveedores: () => Promise.resolve({ data: [] }),
    getCompras: () => Promise.resolve({ data: [] }),
  },
}));

import CommandPalette from './CommandPalette';

describe('CommandPalette', () => {
  const onClose = vi.fn();
  const onNavigate = vi.fn();

  beforeEach(() => {
    onClose.mockClear();
    onNavigate.mockClear();
  });

  it('lista módulos y registros, y navega al elegir uno', async () => {
    const user = userEvent.setup();
    render(
      <CommandPalette
        open
        onClose={onClose}
        onNavigate={onNavigate}
        modules={[{ id: 'ventas', label: 'Ventas' }, { id: 'productos', label: 'Productos' }]}
      />,
    );

    expect(screen.getByLabelText('Buscar en el ERP')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Producto Alfa')).toBeInTheDocument());
    expect(screen.getByText('LNX-V-0001')).toBeInTheDocument();
    expect(screen.getAllByText('Acme SAS').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /^Ventas$/ }));
    expect(onNavigate).toHaveBeenCalledWith('ventas');
    expect(onClose).toHaveBeenCalled();
  });

  it('filtra por texto', async () => {
    const user = userEvent.setup();
    render(
      <CommandPalette
        open
        onClose={onClose}
        onNavigate={onNavigate}
        modules={[{ id: 'ventas', label: 'Ventas' }, { id: 'dashboard', label: 'Dashboard' }]}
      />,
    );
    await waitFor(() => expect(screen.getByText('Producto Alfa')).toBeInTheDocument());
    await user.type(screen.getByLabelText('Buscar en el ERP'), 'dash');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Ventas')).not.toBeInTheDocument();
  });
});
