// ============================================================
// data.js — Carga de métricas y GeoJSON (país y por estado).
// ============================================================

import { store } from './store.js';

export async function loadMetrics() {
  if (store.metrics) return store.metrics;
  const res = await fetch('data/metrics.json');
  if (!res.ok) throw new Error('metrics.json no disponible');
  store.metrics = await res.json();
  return store.metrics;
}

export async function loadStatesGeo() {
  if (store.statesGeo) return store.statesGeo;
  const res = await fetch('geojsons/estados.geojson');
  if (!res.ok) throw new Error('estados.geojson no disponible');
  store.statesGeo = await res.json();
  return store.statesGeo;
}

/** Carga (y cachea) el GeoJSON de municipios de un estado. */
export async function loadMuniGeo(cveEnt) {
  if (store.muniGeo[cveEnt]) return store.muniGeo[cveEnt];
  const res = await fetch(`geojsons/muni/${cveEnt}.geojson`);
  if (!res.ok) throw new Error(`municipios ${cveEnt} no disponibles`);
  const gj = await res.json();
  store.muniGeo[cveEnt] = gj;
  return gj;
}

/** Máximo valor de la métrica entre estados (para la escala de color). */
export function stateMax(metricAccessor) {
  let max = 0;
  for (const s of Object.values(store.metrics.states)) {
    const v = metricAccessor(s);
    if (v > max) max = v;
  }
  return max;
}

/** Máximo valor de la métrica entre los municipios de un estado. */
export function muniMax(cveEnt, metricAccessor) {
  let max = 0;
  for (const [cvegeo, m] of Object.entries(store.metrics.munis)) {
    if (m.cve_ent !== cveEnt) continue;
    const v = metricAccessor(m);
    if (v > max) max = v;
  }
  return max;
}
