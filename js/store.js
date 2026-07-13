// ============================================================
// store.js — Estado compartido de la aplicación.
// ============================================================

export const store = {
  metrics: null,        // metrics.json: { national, states, munis }
  statesGeo: null,      // GeoJSON de estados
  muniGeo: {},          // cache: cve_ent -> GeoJSON de municipios
  metric: 'cantidad',   // métrica activa: 'cantidad' | 'indice'
};
