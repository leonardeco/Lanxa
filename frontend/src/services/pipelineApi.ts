import { api } from './api';

export const ETAPAS_PIPELINE = [
  'Nuevo',
  'Contactado',
  'Cotizado',
  'Negociación',
  'Ganado',
  'Perdido',
] as const;

export type EtapaPipeline = (typeof ETAPAS_PIPELINE)[number];

export interface Negocio {
  id: number;
  numero: string;
  titulo: string;
  cliente_id: number;
  cliente_razon_social?: string | null;
  etapa: string;
  valor_estimado: number;
  fecha_cierre?: string | null;
  cotizacion_id?: number | null;
  venta_id?: number | null;
  notas?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface NegocioInput {
  titulo: string;
  cliente_id: number;
  etapa?: string;
  valor_estimado?: number;
  fecha_cierre?: string | null;
  cotizacion_id?: number | null;
  venta_id?: number | null;
  notas?: string | null;
}

const BASE = '/v1/pipeline';

export const pipelineApi = {
  listar: () => api.get<Negocio[]>(`${BASE}/`),
  crear: (data: NegocioInput) => api.post<Negocio>(`${BASE}/`, data),
  obtener: (id: number) => api.get<Negocio>(`${BASE}/${id}`),
  actualizar: (id: number, data: Partial<NegocioInput>) => api.put<Negocio>(`${BASE}/${id}`, data),
  cambiarEtapa: (id: number, etapa: string) =>
    api.patch<Negocio>(`${BASE}/${id}/etapa`, { etapa }),
  eliminar: (id: number) => api.delete(`${BASE}/${id}`),
};
