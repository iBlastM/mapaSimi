// ============================================================
// main.js — Arranque de la SPA: datos, rutas y navegación.
// ============================================================

import { loadMetrics, loadStatesGeo } from './data.js';
import { route, setNotFound, startRouter, currentTop } from './router.js';
import * as mapa from './views/mapa.js';
import * as acerca from './views/acerca.js';

const app = document.getElementById('app');

function after() { window.scrollTo({ top: 0, behavior: 'auto' }); syncNav(); }

function view(fn) {
  return async () => { app.innerHTML = ''; await fn(app); after(); };
}
function viewP(fn, key) {
  return async (params) => { app.innerHTML = ''; await fn(app, params[key]); after(); };
}

function syncNav() {
  const top = currentTop();
  document.querySelectorAll('.nav a[data-top]').forEach((a) => a.classList.toggle('on', a.dataset.top === top));
}

function fatal(msg) {
  app.innerHTML = `<section class="empty">
    <h2>No se pudo iniciar el mapa</h2><p>${msg}</p>
    <p class="hint">Sirve el proyecto con un servidor local:<br><code>python serve.py</code>
      y abre <code>http://localhost:8000</code></p></section>`;
}

async function boot() {
  try {
    await Promise.all([loadMetrics(), loadStatesGeo()]);
  } catch (err) {
    fatal('No se pudieron cargar los datos (JSON/GeoJSON). Ábrelo desde un servidor local, no con file://.');
    return;
  }

  route('/mapa', view(mapa.render));
  route('/estado/:cve', viewP(mapa.render, 'cve'));
  route('/acerca', view(acerca.render));
  setNotFound(view(mapa.render));

  startRouter();
}

boot();
