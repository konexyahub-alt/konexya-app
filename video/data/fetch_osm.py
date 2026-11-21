"""Baixa do OpenStreetMap (via Overpass) ruas, prédios, parques e orla de Meireles/Aldeota, Fortaleza.

Dados © colaboradores do OpenStreetMap, licença ODbL (https://www.openstreetmap.org/copyright).
Uso: python3 -I data/fetch_osm.py  → data/osm/*.json (cache; só baixa o que falta)
"""
import json, os, subprocess, sys, time, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "osm")
MIRRORS = ["https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://overpass-api.de/api/interpreter"]
# Área: Meireles, Aldeota e Mucuripe, com a orla da Beira-Mar.
S, W, N, E = -3.7480, -38.5100, -3.7160, -38.4740
TILES = 4

def fetch(query, out):
    if os.path.exists(out):
        return
    url_q = "data=" + urllib.parse.quote(query)
    for attempt in range(12):
        for m in MIRRORS:
            r = subprocess.run(["curl", "-s", "-m", "120", "-w", "\n%{http_code}", f"{m}?{url_q}"], capture_output=True, text=True)
            body, _, code = r.stdout.rpartition("\n")
            if code == "200" and body.lstrip().startswith("{"):
                json.loads(body)
                with open(out, "w") as f:
                    f.write(body)
                print(f"  ok {os.path.basename(out)} ({len(body)//1024} KB)")
                return
        time.sleep(4 + attempt * 2)
    sys.exit(f"falhou: {out}")

os.makedirs(CACHE, exist_ok=True)
dy, dx = (N - S) / TILES, (E - W) / TILES
for i in range(TILES):
    for j in range(TILES):
        b = f"({S + i*dy:.5f},{W + j*dx:.5f},{S + (i+1)*dy:.5f},{W + (j+1)*dx:.5f})"
        fetch(f'[out:json][timeout:60];(way["building"]{b};relation["building"]{b};);out geom tags;', os.path.join(CACHE, f"b_{i}{j}.json"))
fetch(f'[out:json][timeout:90];way["highway"]({S},{W},{N},{E});out geom tags;', os.path.join(CACHE, "highways.json"))
fetch(f'[out:json][timeout:90];(way["leisure"~"park|garden|pitch"]({S},{W},{N},{E});way["landuse"~"grass|recreation_ground"]({S},{W},{N},{E}););out geom tags;', os.path.join(CACHE, "parks.json"))
fetch(f'[out:json][timeout:90];(way["natural"~"coastline|beach|sand"]({S-0.01},{W-0.02},{N+0.02},{E+0.02}););out geom tags;', os.path.join(CACHE, "coast.json"))
fetch(f'[out:json][timeout:90];(node["leisure"="fitness_centre"]({S},{W},{N},{E});way["leisure"="fitness_centre"]({S},{W},{N},{E}););out center tags;', os.path.join(CACHE, "gyms.json"))
print("pronto")
