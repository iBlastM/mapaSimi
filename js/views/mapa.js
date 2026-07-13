// ============================================================
// views/mapa.js — Vista principal: mapa coroplético con
// drill-down país → estado → municipio, popup de detalle y
// tabla lateral de rangos (rango → estados → municipios).
// ============================================================

import { store } from '../store.js';
import { METRICS, METRIC_ORDER, BUCKETS } from '../config.js';
import { renderStates, renderMunicipios } from '../map.js';
import { loadMuniGeo } from '../data.js';
import { createZoom } from '../zoom.js';
import { navigate } from '../router.js';

export async function render(root, cveEnt) {
  const metricId = store.metric;
  const m = METRICS[metricId];
  const nat = store.metrics.national;

  root.innerHTML = `
  <section class="mapa">
    <div class="map-col">
      <div class="map-stage" id="stage"><svg id="map" aria-label="Mapa de México"></svg>
        <div class="map-topbar">
          <button class="back-btn" id="backBtn" hidden>← México</button>
          <div class="crumb" id="crumb"></div>
        </div>
        <div class="zoom-ctl">
          <button data-z="in" aria-label="Acercar">+</button>
          <button data-z="out" aria-label="Alejar">−</button>
          <button data-z="reset" aria-label="Restablecer">⟳</button>
        </div>
        <div class="map-popup" id="popup" hidden></div>
        <div class="map-loading" id="loading" hidden><span class="spinner"></span> cargando…</div>
      </div>
    </div>

    <aside class="side">
      <div class="side-head">
        <p class="eyebrow">Cobertura territorial</p>
        <h1 class="side-title">Farmacias Similares</h1>
        <p class="side-sub" id="sideSub"></p>
      </div>

      <div class="seg" id="metricToggle" role="group" aria-label="Métrica">
        ${METRIC_ORDER.map((id) => `<button data-metric="${id}" class="${id === metricId ? 'on' : ''}">${METRICS[id].label}</button>`).join('')}
      </div>
      <p class="metric-note" id="metricNote"></p>

      <div class="legend" id="legend"></div>

      <div class="ranges">
        <div class="ranges-head">
          <h2>Rangos por estado</h2>
          <span class="ranges-hint">clic para desplegar</span>
        </div>
        <div id="ranges"></div>
      </div>
    </aside>
  </section>`;

  const stage = root.querySelector('#stage');
  const svg = root.querySelector('#map');
  const popup = root.querySelector('#popup');
  const loading = root.querySelector('#loading');
  const backBtn = root.querySelector('#backBtn');
  const crumb = root.querySelector('#crumb');
  const metricToggle = root.querySelector('#metricToggle');
  const dpr = 1;

  // Zoom/paneo manual (transform CSS del SVG).
  let zoom;
  function onApply(state) {
    svg.style.transformOrigin = '0 0';
    svg.style.transform = (state.scale === 1 && state.tx === 0 && state.ty === 0)
      ? '' : `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`;
  }
  zoom = createZoom(stage, { min: 1, max: 12, onApply });

  const metricNote = () => {
    root.querySelector('#metricNote').textContent = metricId === 'cantidad'
      ? 'Número de sucursales localizadas en el territorio.'
      : 'Sucursales por cada 10 000 habitantes (Censo 2020).';
  };
  const sideSub = () => {
    root.querySelector('#sideSub').innerHTML =
      `<b>${nat.branches.toLocaleString('es-MX')}</b> sucursales · <b>${nat.munis_con_sucursal.toLocaleString('es-MX')}</b> municipios con presencia · índice nacional <b>${nat.index.toFixed(2)}</b>`;
  };

  /* ---------- niveles ---------- */
  function showPopup(html) { popup.innerHTML = html; popup.hidden = false; }
  function hidePopup() { popup.hidden = true; }

  function drawNational() {
    hidePopup();
    backBtn.hidden = true;
    crumb.textContent = 'México · 32 estados';
    renderStates(svg, { metric: metricId, onSelect: (cve) => { if (!zoom.wasDrag()) navigate('/estado/' + cve); } });
    zoom.reset();
  }

  async function drawState(cve) {
    loading.hidden = false;
    try { await loadMuniGeo(cve); }
    catch (e) { loading.textContent = 'No se pudieron cargar los municipios.'; return; }
    loading.hidden = true;
    const st = store.metrics.states[cve];
    backBtn.hidden = false;
    crumb.textContent = `${st.name} · ${st.munis.length} municipios`;
    const ctrl = renderMunicipios(svg, cve, {
      metric: metricId,
      onSelect: (cvegeo) => {
        if (zoom.wasDrag()) return;
        const mu = store.metrics.munis[cvegeo];
        showPopup(muniPopup(mu));
      },
    });
    zoom.reset();
    showPopup(statePopup(st));
    root._muniCtrl = ctrl;
  }

  /* ---------- popups ---------- */
  function statePopup(st) {
    return `<button class="popup-x" aria-label="Cerrar">×</button>
      <p class="pu-kicker">Estado</p>
      <h3 class="pu-title">${st.name}</h3>
      <div class="pu-kpis">
        <div><span class="pu-k">${st.branches.toLocaleString('es-MX')}</span><span class="pu-l">sucursales</span></div>
        <div><span class="pu-k">${st.index.toFixed(2)}</span><span class="pu-l">por 10 mil hab.</span></div>
        <div><span class="pu-k">${st.pop.toLocaleString('es-MX')}</span><span class="pu-l">habitantes</span></div>
      </div>
      <p class="pu-hint">Clic en un municipio para ver su detalle.</p>`;
  }
  function muniPopup(mu) {
    if (!mu) return '';
    return `<button class="popup-x" aria-label="Cerrar">×</button>
      <p class="pu-kicker">Municipio · ${mu.state_name}</p>
      <h3 class="pu-title">${mu.name}</h3>
      <div class="pu-kpis">
        <div><span class="pu-k">${mu.branches.toLocaleString('es-MX')}</span><span class="pu-l">sucursales</span></div>
        <div><span class="pu-k">${mu.index.toFixed(2)}</span><span class="pu-l">por 10 mil hab.</span></div>
        <div><span class="pu-k">${mu.pop.toLocaleString('es-MX')}</span><span class="pu-l">habitantes</span></div>
      </div>`;
  }

  popup.addEventListener('click', (e) => { if (e.target.closest('.popup-x')) hidePopup(); });

  /* ---------- controles ---------- */
  root.querySelector('.zoom-ctl').addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    if (btn.dataset.z === 'in') zoom.zoomBy(1.5);
    else if (btn.dataset.z === 'out') zoom.zoomBy(1 / 1.5);
    else zoom.reset();
  });
  backBtn.addEventListener('click', () => navigate('/mapa'));

  metricToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn || btn.dataset.metric === store.metric) return;
    store.metric = btn.dataset.metric;
    navigate(cveEnt ? '/estado/' + cveEnt : '/mapa'); // re-render vista
  });

  // Render inicial según nivel.
  metricNote(); sideSub();
  renderLegend(root.querySelector('#legend'), metricId);
  renderRanges(root.querySelector('#ranges'), metricId);

  if (cveEnt && store.metrics.states[cveEnt]) await drawState(cveEnt);
  else drawNational();
}

/* ============================================================
   Leyenda (gradiente + extremos)
   ============================================================ */
function renderLegend(container, metricId) {
  const m = METRICS[metricId];
  const grad = `linear-gradient(90deg, ${m.ramp.join(',')})`;
  container.innerHTML = `
    <div class="lg-label">${m.label} — ${m.short}</div>
    <div class="lg-bar" style="background:${grad}"></div>
    <div class="lg-ends"><span>menos</span><span>más</span></div>`;
}

/* ============================================================
   Tabla de rangos: bucket → estados → municipios (acordeones)
   ============================================================ */
function renderRanges(container, metricId) {
  const m = METRICS[metricId];
  const buckets = BUCKETS[metricId];
  const states = Object.entries(store.metrics.states)
    .map(([cve, s]) => ({ cve, ...s, val: m.accessor(s) }))
    .sort((a, b) => b.val - a.val);

  let html = '';
  for (const bk of buckets) {
    const inBucket = states.filter((s) => s.val >= bk.min && s.val < bk.max);
    if (!inBucket.length) continue;
    html += `<details class="rg-bucket">
      <summary><span class="rg-bk-label">${bk.label}</span><span class="rg-count">${inBucket.length}</span></summary>
      <div class="rg-states">
        ${inBucket.map((s) => stateAccordion(s, m)).join('')}
      </div>
    </details>`;
  }
  container.innerHTML = html || '<p class="rg-empty">Sin estados en estos rangos.</p>';

  // Carga perezosa de municipios al abrir cada estado.
  container.addEventListener('toggle', (e) => {
    const det = e.target;
    if (!det.classList || !det.classList.contains('rg-state') || !det.open) return;
    if (det.dataset.loaded) return;
    det.dataset.loaded = '1';
    fillMunis(det, det.dataset.cve, metricId);
  }, true);
}

function stateAccordion(s, m) {
  return `<details class="rg-state" data-cve="${s.cve}">
    <summary>
      <span class="rg-st-name">${s.name}</span>
      <span class="rg-st-val">${m.format(s.val)}</span>
    </summary>
    <div class="rg-munis" data-cve="${s.cve}"><span class="rg-loading">cargando municipios…</span></div>
  </details>`;
}

function fillMunis(det, cve, metricId) {
  const m = METRICS[metricId];
  const box = det.querySelector('.rg-munis');
  const munis = Object.entries(store.metrics.munis)
    .filter(([, mu]) => mu.cve_ent === cve && m.accessor(mu) > 0)
    .map(([cvegeo, mu]) => ({ cvegeo, ...mu, val: m.accessor(mu) }))
    .sort((a, b) => b.val - a.val);
  if (!munis.length) { box.innerHTML = '<span class="rg-none">Sin sucursales registradas.</span>'; return; }
  box.innerHTML = munis.map((mu) => `
    <div class="rg-muni">
      <span class="rg-mu-name">${mu.name}</span>
      <span class="rg-mu-val">${m.format(mu.val)}</span>
    </div>`).join('');
}
