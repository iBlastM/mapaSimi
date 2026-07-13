// ============================================================
// utils.js — Helpers de formato, color y SVG.
// ============================================================

const SVG_NS = 'http://www.w3.org/2000/svg';

export function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const fmtInt = (v) => new Intl.NumberFormat('es-MX').format(Math.round(v || 0));

export const fmtNum = (v, d = 2) =>
  (v || 0).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ---------- color ---------- */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function mix(a, b, t) {
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/**
 * Devuelve un color de una rampa (array de hex) según t ∈ [0,1].
 */
export function rampColor(ramp, t) {
  t = clamp(t, 0, 1);
  const n = ramp.length - 1;
  const seg = clamp(Math.floor(t * n), 0, n - 1);
  const local = t * n - seg;
  return mix(hexToRgb(ramp[seg]), hexToRgb(ramp[seg + 1]), local);
}

/**
 * Escala perceptual: usa raíz para comprimir colas largas (distribución
 * muy sesgada de conteos). gamma < 1 resalta diferencias en valores bajos.
 */
export function scaleT(value, max, gamma = 0.5) {
  if (!max || value <= 0) return 0;
  return Math.pow(clamp(value / max, 0, 1), gamma);
}
