// ============================================================
// map.js — Mapa coroplético SVG de México.
// Vista país: 32 estados. Drill-down: municipios de un estado,
// con viewBox ajustado a los límites de ese estado.
// Color por métrica activa (cantidad de sucursales o índice).
// ============================================================

import { store } from './store.js';
import { METRICS, NO_DATA } from './config.js';
import { svgEl, rampColor, scaleT, clamp } from './utils.js';
import { stateMax, muniMax } from './data.js';

/* ---------- geometría → path (proyección x=lng, y=-lat) ---------- */
function ringToPath(ring) {
  let d = '';
  for (let i = 0; i < ring.length; i++) {
    d += (i === 0 ? 'M' : 'L') + ring[i][0] + ',' + (-ring[i][1]);
  }
  return d + 'Z';
}
function geometryToPaths(geometry) {
  const out = [];
  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates) out.push(ringToPath(ring));
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates)
      for (const ring of poly) out.push(ringToPath(ring));
  }
  return out;
}

/** viewBox que encierra un conjunto de features (con padding relativo). */
function computeViewBox(features, padRatio = 0.04) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const f of features) {
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    for (const poly of polys)
      for (const ring of poly)
        for (const [lng, lat] of ring) {
          const x = lng, y = -lat;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
  }
  const w = maxX - minX, h = maxY - minY;
  const pad = Math.max(w, h) * padRatio;
  return `${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}`;
}

/* ---------- color ---------- */
function colorFor(value, max, metricId) {
  const m = METRICS[metricId];
  if (!value || value <= 0) return NO_DATA;
  const gamma = metricId === 'cantidad' ? 0.5 : 0.7;
  return rampColor(m.ramp, scaleT(value, max, gamma));
}

/* ============================================================
   Vista país: estados
   ============================================================ */
export function renderStates(svg, opts = {}) {
  const metricId = opts.metric || store.metric;
  const m = METRICS[metricId];
  const max = stateMax(m.accessor);

  svg.innerHTML = '';
  svg.setAttribute('viewBox', computeViewBox(store.statesGeo.features, 0.03));
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const groups = [];
  for (const feature of store.statesGeo.features) {
    const cve = feature.properties.cve_ent;
    const data = store.metrics.states[cve];
    const value = m.accessor(data);
    const fill = colorFor(value, max, metricId);

    const g = svgEl('g', { class: 'geo state' });
    g.dataset.cve = cve;
    for (const d of geometryToPaths(feature.geometry)) {
      const path = svgEl('path', { d, fill });
      path.setAttribute('stroke', '#ffffff');
      path.setAttribute('stroke-width', 0.06);
      path.setAttribute('vector-effect', 'non-scaling-stroke');
      g.appendChild(path);
    }
    g.style.cursor = 'pointer';
    g.addEventListener('mouseenter', (ev) => showHover(svg, stateHoverHTML(cve, data, metricId), ev));
    g.addEventListener('mousemove', (ev) => moveHover(svg, ev));
    g.addEventListener('mouseleave', () => hideHover(svg));
    g.addEventListener('click', () => opts.onSelect && opts.onSelect(cve));
    g.tabIndex = 0;
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', data ? data.name : cve);
    g.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && opts.onSelect) { e.preventDefault(); opts.onSelect(cve); }
    });
    svg.appendChild(g);
    groups.push(g);
  }
  return groups;
}

/* ============================================================
   Drill-down: municipios de un estado
   ============================================================ */
export function renderMunicipios(svg, cveEnt, opts = {}) {
  const metricId = opts.metric || store.metric;
  const m = METRICS[metricId];
  const gj = store.muniGeo[cveEnt];
  const max = muniMax(cveEnt, m.accessor);

  svg.innerHTML = '';
  svg.setAttribute('viewBox', computeViewBox(gj.features, 0.05));
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  let selected = null;
  const groups = [];
  for (const feature of gj.features) {
    const cvegeo = feature.properties.cvegeo;
    const data = store.metrics.munis[cvegeo];
    const value = m.accessor(data);
    const fill = colorFor(value, max, metricId);

    const g = svgEl('g', { class: 'geo muni' });
    g.dataset.cvegeo = cvegeo;
    for (const d of geometryToPaths(feature.geometry)) {
      const path = svgEl('path', { d, fill });
      path.setAttribute('stroke', '#ffffff');
      path.setAttribute('stroke-width', 0.05);
      path.setAttribute('vector-effect', 'non-scaling-stroke');
      g.appendChild(path);
    }
    g.style.cursor = 'pointer';
    g.addEventListener('mouseenter', (ev) => showHover(svg, muniHoverHTML(data, metricId), ev));
    g.addEventListener('mousemove', (ev) => moveHover(svg, ev));
    g.addEventListener('mouseleave', () => hideHover(svg));
    g.addEventListener('click', () => {
      if (selected) selected.classList.remove('sel');
      g.classList.add('sel'); selected = g;
      opts.onSelect && opts.onSelect(cvegeo);
    });
    g.tabIndex = 0;
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', data ? data.name : cvegeo);
    g.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && opts.onSelect) {
        e.preventDefault();
        if (selected) selected.classList.remove('sel');
        g.classList.add('sel'); selected = g;
        opts.onSelect(cvegeo);
      }
    });
    svg.appendChild(g);
    groups.push(g);
  }
  return {
    groups,
    select(cvegeo) {
      const g = groups.find((x) => x.dataset.cvegeo === cvegeo);
      if (!g) return;
      if (selected) selected.classList.remove('sel');
      g.classList.add('sel'); selected = g;
    },
  };
}

/* ---------- contenido de las tarjetas hover ---------- */
function metricLine(data, metricId) {
  const m = METRICS[metricId];
  const v = m.accessor(data);
  return `<b>${m.format(v)}</b> ${m.short}`;
}
function stateHoverHTML(cve, data, metricId) {
  if (!data) return `<div class="mh-name">Estado ${cve}</div><div class="mh-sub">sin datos</div>`;
  return `<div class="mh-name">${data.name}</div>
    <div class="mh-metric">${metricLine(data, metricId)}</div>
    <div class="mh-sub">${data.munis.length} municipios · clic para ver detalle</div>`;
}
function muniHoverHTML(data, metricId) {
  if (!data) return `<div class="mh-name">Municipio</div><div class="mh-sub">sin datos</div>`;
  return `<div class="mh-name">${data.name}</div>
    <div class="mh-metric">${metricLine(data, metricId)}</div>
    <div class="mh-sub">${data.state_name}</div>`;
}

/* ---------- tarjeta flotante ---------- */
function hoverHost(svg) {
  return svg.closest('.map-stage') || svg.parentElement;
}
function showHover(svg, html, ev) {
  const host = hoverHost(svg);
  let card = host.querySelector('.map-hover');
  if (!card) { card = document.createElement('div'); card.className = 'map-hover'; host.appendChild(card); }
  card.innerHTML = html;
  card.classList.add('on');
  moveHover(svg, ev);
}
function moveHover(svg, ev) {
  const host = hoverHost(svg);
  const card = host.querySelector('.map-hover');
  if (!card) return;
  const r = host.getBoundingClientRect();
  let x = ev.clientX - r.left + 14;
  let y = ev.clientY - r.top + 14;
  x = clamp(x, 4, r.width - card.offsetWidth - 4);
  y = clamp(y, 4, r.height - card.offsetHeight - 4);
  card.style.transform = `translate(${x}px, ${y}px)`;
}
function hideHover(svg) {
  const host = hoverHost(svg);
  const card = host && host.querySelector('.map-hover');
  if (card) card.classList.remove('on');
}
