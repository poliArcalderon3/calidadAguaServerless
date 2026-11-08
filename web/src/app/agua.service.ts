import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export type Parametro =
  | 'ph' | 'Hardness' | 'Solids' | 'Chloramines' | 'Sulfate'
  | 'Conductivity' | 'Organic_carbon' | 'Trihalomethanes' | 'Turbidity';

export type Muestra = Record<Parametro, number | null> & {
  id_muestra: string;
  fila: number;
  Potability: number;
};

export interface Pagina {
  resultados: Muestra[];
  siguiente: string | null;
}

/** Nombre en español y unidad de cada columna del dataset */
export const PARAMETROS: { clave: Parametro; nombre: string; unidad: string }[] = [
  { clave: 'ph', nombre: 'pH', unidad: '0 a 14' },
  { clave: 'Hardness', nombre: 'Dureza', unidad: 'mg/L' },
  { clave: 'Solids', nombre: 'Sólidos disueltos', unidad: 'ppm' },
  { clave: 'Chloramines', nombre: 'Cloraminas', unidad: 'ppm' },
  { clave: 'Sulfate', nombre: 'Sulfatos', unidad: 'mg/L' },
  { clave: 'Conductivity', nombre: 'Conductividad', unidad: 'μS/cm' },
  { clave: 'Organic_carbon', nombre: 'Carbono orgánico', unidad: 'ppm' },
  { clave: 'Trihalomethanes', nombre: 'Trihalometanos', unidad: 'μg/L' },
  { clave: 'Turbidity', nombre: 'Turbidez', unidad: 'NTU' },
];

/** Cliente de las funciones serverless de /api: la app nunca se conecta a Firestore directamente */
@Injectable({ providedIn: 'root' })
export class AguaService {
  private readonly http = inject(HttpClient);

  buscarPorId(id: string) {
    return this.http.get<Muestra>(`/api/muestras/${encodeURIComponent(id.trim())}`);
  }

  buscarPorSolidos(valor: string) {
    return this.http.get<{ resultados: Muestra[] }>('/api/muestras', { params: { solidos: valor.trim() } });
  }

  listar(potable: '' | '0' | '1', desde: string | null, limite = 15) {
    let params = new HttpParams().set('limite', limite);
    if (potable) params = params.set('potable', potable);
    if (desde) params = params.set('desde', desde);
    return this.http.get<Pagina>('/api/muestras', { params });
  }
}
