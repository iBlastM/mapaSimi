// ============================================================
// config.js — Métricas, escalas de color y constantes.
// ============================================================

export const SOURCE_LABEL = 'DENUE · Censo INEGI 2020';

// Métricas disponibles en el mapa.
export const METRICS = {
  cantidad: {
    id: 'cantidad',
    label: 'Cantidad',
    short: 'sucursales',
    unit: '',
    // rampa secuencial teal (pocas → muchas)
    ramp: ['#E4EFEC', '#A7D2C8', '#5FAC9E', '#2A8377', '#0C5B54', '#053B37'],
    accessor: (d) => (d ? d.branches : 0),
    format: (v) => new Intl.NumberFormat('es-MX').format(v),
  },
  indice: {
    id: 'indice',
    label: 'Índice',
    short: 'suc./10 mil hab.',
    unit: ' por 10 mil hab.',
    // rampa secuencial coral (bajo → alto acceso relativo)
    ramp: ['#FCEAE3', '#F7C3AF', '#F2946F', '#E5623C', '#C13F1F', '#8A2810'],
    accessor: (d) => (d ? d.index : 0),
    format: (v) => (Math.round(v * 100) / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  },
};

export const METRIC_ORDER = ['cantidad', 'indice'];

// Rangos (buckets) para la tabla lateral, por métrica.
// Cada bucket: { label, min, max } — un estado entra si su valor ∈ [min, max).
export const BUCKETS = {
  cantidad: [
    { label: 'Más de 500 sucursales', min: 500, max: Infinity },
    { label: '200 a 500', min: 200, max: 500 },
    { label: '100 a 200', min: 100, max: 200 },
    { label: '50 a 100', min: 50, max: 100 },
    { label: 'Menos de 50', min: 0, max: 50 },
  ],
  indice: [
    { label: 'Más de 1.0 por 10 mil hab.', min: 1.0, max: Infinity },
    { label: '0.8 a 1.0', min: 0.8, max: 1.0 },
    { label: '0.6 a 0.8', min: 0.6, max: 0.8 },
    { label: '0.4 a 0.6', min: 0.4, max: 0.6 },
    { label: 'Menos de 0.4', min: 0, max: 0.4 },
  ],
};

// Color neutro para territorios sin dato.
export const NO_DATA = '#DDE3E1';
