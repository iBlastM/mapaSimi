# -*- coding: utf-8 -*-
"""
build_data.py — Prepara los datos de MapaSimi.

1. Lee las sucursales de Farmacias Similares (con lat/lon).
2. Spatial join contra los municipios (municipalities_simple.geojson) para
   asignar cada sucursal a un municipio (CVEGEO = CVE_ENT+CVE_MUN).
3. Cruza con la poblacion municipal del Censo INEGI (ITER).
4. Calcula el indice = sucursales por cada 10 000 habitantes.
5. Emite:
     data/metrics.json           -> metricas por estado y municipio
     geojsons/estados.geojson     -> 32 estados (coords redondeadas)
     geojsons/muni/NN.geojson     -> municipios de cada estado (ligeros)

Uso:
    python build_data.py
"""
import csv
import json
import os
import sys
from collections import defaultdict

from shapely.geometry import shape, Point
from shapely.strtree import STRtree

csv.field_size_limit(10 ** 7)

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "data")
GEO = os.path.join(BASE, "geojsons")
MUNI_OUT = os.path.join(GEO, "muni")

FARMACIAS = os.path.join(DATA, "farmacias_similares.csv")
ITER = os.path.join(DATA, "conjunto_de_datos_iter_00CSV20.csv")
MUNI_GEOJSON = os.path.join(GEO, "municipalities_simple.geojson")
STATES_GEOJSON = os.path.join(GEO, "states_simple.geojson")

COORD_DECIMALS = 4  # ~11 m de resolucion; suficiente para el mapa


def log(msg):
    print(msg, flush=True)


# ------------------------------------------------------------------
# 1) Cargar municipios y construir indice espacial
# ------------------------------------------------------------------
def load_municipios():
    log("Cargando municipios...")
    with open(MUNI_GEOJSON, encoding="utf-8") as f:
        gj = json.load(f)
    feats = gj["features"]
    geoms = []
    meta = []
    for ft in feats:
        g = shape(ft["geometry"])
        geoms.append(g)
        p = ft["properties"]
        meta.append({
            "cvegeo": p["CVEGEO"],
            "cve_ent": p["CVE_ENT"],
            "cve_mun": p["CVE_MUN"],
            "nom_mun": p.get("NOMMUN") or p.get("NOMGEO"),
        })
    tree = STRtree(geoms)
    log(f"  {len(geoms)} municipios indexados")
    return feats, geoms, meta, tree


# ------------------------------------------------------------------
# 2) Spatial join de sucursales -> municipio
# ------------------------------------------------------------------
def spatial_join(geoms, meta, tree):
    log("Asignando sucursales a municipios (spatial join)...")
    branches_mun = defaultdict(int)
    total = matched = 0
    with open(FARMACIAS, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            total += 1
            try:
                lon = float(row["longitud"]); lat = float(row["latitud"])
            except (ValueError, KeyError):
                continue
            pt = Point(lon, lat)
            # STRtree devuelve indices de candidatos por bounding-box
            for idx in tree.query(pt):
                if geoms[idx].contains(pt):
                    branches_mun[meta[idx]["cvegeo"]] += 1
                    matched += 1
                    break
    log(f"  {matched}/{total} sucursales asignadas a un municipio")
    return branches_mun


# ------------------------------------------------------------------
# 3) Poblacion municipal y estatal desde ITER
# ------------------------------------------------------------------
def load_poblacion():
    log("Cargando poblacion INEGI (ITER)...")
    pop_mun = {}
    pop_ent = {}
    nom_ent = {}
    with open(ITER, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            ent = row["ENTIDAD"].zfill(2)
            mun = row["MUN"].zfill(3)
            loc = row["LOC"]
            try:
                pob = int(row["POBTOT"])
            except ValueError:
                pob = 0
            if ent == "00":
                continue  # total nacional
            if mun == "000" and loc == "0000":
                pop_ent[ent] = pob
                nom_ent[ent] = row["NOM_ENT"]
            elif mun != "000" and loc == "0000":
                pop_mun[ent + mun] = pob
    log(f"  {len(pop_ent)} estados, {len(pop_mun)} municipios con poblacion")
    return pop_ent, pop_mun, nom_ent


# ------------------------------------------------------------------
# 4) Construir metricas
# ------------------------------------------------------------------
def index_per_10k(branches, pop):
    return round(branches / pop * 10000, 3) if pop else 0.0


def build_metrics(meta, branches_mun, pop_ent, pop_mun, nom_ent):
    log("Construyendo metricas...")
    # nombre de estado desde los municipios (fallback a ITER)
    ent_name = {}
    munis = {}
    branches_ent = defaultdict(int)

    for m in meta:
        cvegeo = m["cvegeo"]
        ent = m["cve_ent"]
        b = branches_mun.get(cvegeo, 0)
        pop = pop_mun.get(cvegeo, 0)
        branches_ent[ent] += b
        munis[cvegeo] = {
            "name": m["nom_mun"],
            "cve_ent": ent,
            "branches": b,
            "pop": pop,
            "index": index_per_10k(b, pop),
        }
        ent_name.setdefault(ent, nom_ent.get(ent, ent))

    states = {}
    for ent, name in sorted(ent_name.items()):
        b = branches_ent[ent]
        pop = pop_ent.get(ent, 0)
        muni_ids = sorted([c for c, mm in munis.items() if mm["cve_ent"] == ent])
        states[ent] = {
            "name": name,
            "branches": b,
            "pop": pop,
            "index": index_per_10k(b, pop),
            "munis": muni_ids,
        }
        # anadir nombre de estado a cada municipio
        for c in muni_ids:
            munis[c]["state_name"] = name

    total_b = sum(s["branches"] for s in states.values())
    total_pop = sum(s["pop"] for s in states.values())
    national = {
        "branches": total_b,
        "pop": total_pop,
        "index": index_per_10k(total_b, total_pop),
        "states": len(states),
        "munis": len(munis),
        "munis_con_sucursal": sum(1 for m in munis.values() if m["branches"] > 0),
    }
    return {"national": national, "states": states, "munis": munis}


# ------------------------------------------------------------------
# 5) Emitir geojsons ligeros
# ------------------------------------------------------------------
def round_coords(obj):
    if isinstance(obj, (int, float)):
        return round(obj, COORD_DECIMALS)
    if isinstance(obj, list):
        return [round_coords(x) for x in obj]
    return obj


def write_states_geojson():
    log("Escribiendo estados.geojson...")
    with open(STATES_GEOJSON, encoding="utf-8") as f:
        gj = json.load(f)
    out = {"type": "FeatureCollection", "features": []}
    for ft in gj["features"]:
        p = ft["properties"]
        out["features"].append({
            "type": "Feature",
            "properties": {"cve_ent": p["CVE_ENT"], "name": p["NOMGEO"]},
            "geometry": {
                "type": ft["geometry"]["type"],
                "coordinates": round_coords(ft["geometry"]["coordinates"]),
            },
        })
    with open(os.path.join(GEO, "estados.geojson"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))


def write_muni_geojsons(feats):
    log("Escribiendo geojsons de municipios por estado...")
    os.makedirs(MUNI_OUT, exist_ok=True)
    by_ent = defaultdict(lambda: {"type": "FeatureCollection", "features": []})
    for ft in feats:
        p = ft["properties"]
        ent = p["CVE_ENT"]
        by_ent[ent]["features"].append({
            "type": "Feature",
            "properties": {
                "cvegeo": p["CVEGEO"],
                "cve_ent": ent,
                "name": p.get("NOMMUN") or p.get("NOMGEO"),
            },
            "geometry": {
                "type": ft["geometry"]["type"],
                "coordinates": round_coords(ft["geometry"]["coordinates"]),
            },
        })
    for ent, fc in by_ent.items():
        with open(os.path.join(MUNI_OUT, f"{ent}.geojson"), "w", encoding="utf-8") as f:
            json.dump(fc, f, ensure_ascii=False, separators=(",", ":"))
    log(f"  {len(by_ent)} archivos de municipios escritos")


def main():
    for p in (FARMACIAS, ITER, MUNI_GEOJSON, STATES_GEOJSON):
        if not os.path.exists(p):
            log(f"ERROR: no existe {p}")
            sys.exit(1)

    feats, geoms, meta, tree = load_municipios()
    branches_mun = spatial_join(geoms, meta, tree)
    pop_ent, pop_mun, nom_ent = load_poblacion()
    metrics = build_metrics(meta, branches_mun, pop_ent, pop_mun, nom_ent)

    with open(os.path.join(DATA, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump(metrics, f, ensure_ascii=False, separators=(",", ":"))
    log(f"metrics.json escrito: {metrics['national']}")

    write_states_geojson()
    write_muni_geojsons(feats)
    log("Listo.")


if __name__ == "__main__":
    main()
