import { useEffect, useState } from 'react';
import { ventasApi, type EmpresaInfo } from '../services/ventasApi';
import type { EmpresaPrint } from '../utils/printEmpresa';

const EVENT = 'lanxa:empresa-updated';

let generation = 0;
let cached: EmpresaInfo | null = null;
let inflight: Promise<EmpresaInfo> | null = null;

async function loadEmpresa(): Promise<EmpresaInfo> {
  if (cached) return cached;
  const myGen = generation;
  if (!inflight) {
    inflight = ventasApi.getEmpresa()
      .then((r) => {
        if (myGen !== generation) {
          return Promise.reject(new Error('stale-empresa'));
        }
        cached = r.data;
        return r.data;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Llamar tras guardar Ajustes de empresa o al cerrar sesión. */
export function invalidateEmpresaCache() {
  generation += 1;
  cached = null;
  inflight = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENT));
  }
}

export function useEmpresa(): EmpresaInfo | null {
  const [empresa, setEmpresa] = useState<EmpresaInfo | null>(cached);

  useEffect(() => {
    let alive = true;
    const refresh = () => {
      loadEmpresa()
        .then((e) => { if (alive) setEmpresa(e); })
        .catch(() => {/* header/impresión usan fallback */});
    };
    refresh();
    window.addEventListener(EVENT, refresh);
    return () => {
      alive = false;
      window.removeEventListener(EVENT, refresh);
    };
  }, []);

  return empresa;
}

export function empresaToPrint(empresa: EmpresaInfo | null): EmpresaPrint | undefined {
  if (!empresa) return undefined;
  return {
    nombre: empresa.razon_social,
    nit: empresa.nit,
    ciudad: empresa.ciudad,
  };
}
