import { describe, it, expect } from 'vitest';
import { resolveEmpresa, letterheadBlock, EMPRESA_FALLBACK } from './printEmpresa';

describe('resolveEmpresa', () => {
  it('usa el fallback Lanxa si no hay datos', () => {
    expect(resolveEmpresa()).toEqual(EMPRESA_FALLBACK);
    expect(resolveEmpresa(null).nombre).toBe('LANXA S.A.S.');
  });

  it('toma razón social, NIT y ciudad de ajustes', () => {
    const e = resolveEmpresa({ nombre: '  Acme SAS  ', nit: '900111222', ciudad: 'Bogotá' });
    expect(e.nombre).toBe('Acme SAS');
    expect(e.nit).toBe('900111222');
    expect(e.ciudad).toBe('Bogotá');
  });
});

describe('letterheadBlock', () => {
  it('escapa markup en el nombre', () => {
    const html = letterheadBlock(resolveEmpresa({ nombre: '<b>X</b>', nit: '1', ciudad: 'Y' }));
    expect(html).not.toContain('<b>X</b>');
    expect(html).toContain('&lt;b&gt;X&lt;/b&gt;');
    expect(html).toContain('NIT: 1');
  });
});
