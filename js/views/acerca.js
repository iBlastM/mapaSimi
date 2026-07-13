// ============================================================
// views/acerca.js — Página informativa.
// ============================================================

import { store } from '../store.js';

export function render(root) {
  const n = store.metrics.national;
  root.innerHTML = `
  <section class="about">
    <p class="eyebrow">Acerca del proyecto</p>
    <h1 class="about-h">Cómo leer el mapa</h1>
    <div class="about-grid">
      <div class="about-card">
        <h3>Qué muestra</h3>
        <p>La cobertura territorial de <b>Farmacias Similares</b> en México con dos lecturas:
        <b>Cantidad</b> (número de sucursales) e <b>Índice</b> (sucursales por cada 10 000
        habitantes), que revela el acceso relativo a la población.</p>
      </div>
      <div class="about-card">
        <h3>Cómo navegar</h3>
        <p>Empieza en el país por estados. Haz clic en un estado para acercarte a sus
        municipios y ver su detalle en la tarjeta. Vuelve con <b>← México</b>. La tabla lateral
        agrupa los estados por rangos; cada estado se despliega en sus municipios.</p>
      </div>
      <div class="about-card">
        <h3>Fuentes</h3>
        <p>Sucursales geolocalizadas del <b>DENUE</b> (INEGI), asignadas a su municipio por
        cruce espacial. Población del <b>Censo de Población y Vivienda 2020</b> (ITER, INEGI).</p>
      </div>
    </div>
    <div class="about-stats">
      <div><span class="as-k">${n.branches.toLocaleString('es-MX')}</span><span class="as-l">sucursales</span></div>
      <div><span class="as-k">${n.states}</span><span class="as-l">estados</span></div>
      <div><span class="as-k">${n.munis_con_sucursal.toLocaleString('es-MX')}</span><span class="as-l">municipios con presencia</span></div>
      <div><span class="as-k">${n.index.toFixed(2)}</span><span class="as-l">índice nacional</span></div>
    </div>
    <a class="cta" href="#/mapa">Explorar el mapa →</a>
  </section>`;
}
