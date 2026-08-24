import { esc } from './htmlEscape';

/** Datos de empresa que salen en el membrete de impresión. */
export interface EmpresaPrint {
  nombre?: string;
  nit?: string;
  ciudad?: string;
}

export const EMPRESA_FALLBACK: Required<EmpresaPrint> = {
  nombre: 'LANXA S.A.S.',
  nit: '',
  ciudad: '',
};

export function resolveEmpresa(partial?: EmpresaPrint | null): Required<EmpresaPrint> {
  return {
    nombre: partial?.nombre?.trim() || EMPRESA_FALLBACK.nombre,
    nit: (partial?.nit ?? EMPRESA_FALLBACK.nit).trim(),
    ciudad: (partial?.ciudad ?? EMPRESA_FALLBACK.ciudad).trim(),
  };
}

export function letterheadBlock(e: Required<EmpresaPrint>): string {
  return `<div class="empresa-nombre">${esc(e.nombre)}</div>
      ${e.nit ? `<div class="empresa-sub">NIT: ${esc(e.nit)}</div>` : ''}
      ${e.ciudad ? `<div class="empresa-sub">${esc(e.ciudad)}</div>` : ''}`;
}
