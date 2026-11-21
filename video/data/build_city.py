"""Converte o cache do OpenStreetMap (data/osm) em data/city.json, pronto para o three.js.

- Projeta lat/lon em metros locais (x = leste, z = sul), centro em CENTER.
- Prédios: contorno + altura (height > building:levels × 3,2 m > 4 m).
- Ruas: eixos com classe e largura; grafo para rotas (respeita mão única).
- Orla: linha de costa → polígono de terra; praias e parques.
- Rotas reais: casa → trabalho e casa → academia (Dijkstra pelo grafo de ruas).

Dados © colaboradores do OpenStreetMap (ODbL).
"""
import glob
import heapq
import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OSM = os.path.join(HERE, "osm")

CENTER = (-3.7300, -38.4930)  # Meireles/Aldeota
# Pontos de referência (lat, lon) para escolher os lugares da história.
PLACES = {
    "home": {"near": (-3.7262, -38.4958), "radius": 260, "min_levels": 14},  # Meireles, perto da Beira-Mar
}
WORK_DISTANCE = (420, 700)  # trabalho: torre comercial/alta a sudeste da casa (rumo à Aldeota)
GYM_DISTANCE = (350, 800)  # academia real do OSM a esta distância da casa (m, em linha reta)

ROAD_WIDTH = {
    "trunk": 22, "primary": 20, "secondary": 16, "tertiary": 13, "residential": 9, "unclassified": 9,
    "living_street": 7, "service": 5, "primary_link": 10, "secondary_link": 9, "tertiary_link": 8,
}
CAR_ROADS = set(ROAD_WIDTH) - {"service"}

lat0, lon0 = CENTER
KX = 111320 * math.cos(math.radians(lat0))
KZ = 110540


def proj(p):
    return (round((p["lon"] - lon0) * KX, 1), round(-(p["lat"] - lat0) * KZ, 1))


def proj_ll(lat, lon):
    return ((lon - lon0) * KX, -(lat - lat0) * KZ)


def parse_m(v):
    try:
        return float(str(v).replace("m", "").replace(",", ".").strip().split(";")[0])
    except ValueError:
        return None


def poly_area(pts):
    a = 0
    for i in range(len(pts)):
        x1, z1 = pts[i]
        x2, z2 = pts[(i + 1) % len(pts)]
        a += x1 * z2 - x2 * z1
    return a / 2


def centroid(pts):
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))


# ---------------------------------------------------------------------------------------------
# Prédios
# ---------------------------------------------------------------------------------------------
seen = set()
buildings = []
for f in sorted(glob.glob(os.path.join(OSM, "b_*.json"))):
    for e in json.load(open(f))["elements"]:
        if e["id"] in seen:
            continue
        seen.add(e["id"])
        t = e.get("tags", {})
        rings = []
        if e["type"] == "way" and "geometry" in e:
            rings = [e["geometry"]]
        elif e["type"] == "relation":
            rings = [m["geometry"] for m in e.get("members", []) if m.get("role") == "outer" and "geometry" in m]
        h = parse_m(t.get("height"))
        lv = parse_m(t.get("building:levels"))
        if h is None:
            h = lv * 3.2 + 1.5 if lv else 4.0
        lv = lv or max(1, round(h / 3.2))
        mh = parse_m(t.get("min_height")) or 0
        for g in rings:
            pts = [proj(p) for p in g]
            if len(pts) > 3 and pts[0] == pts[-1]:
                pts = pts[:-1]
            if len(pts) < 3:
                continue
            a = poly_area(pts)
            if abs(a) < 12:
                continue
            if a > 0:  # sentido anti-horário visto de cima (x leste, z sul)
                pts.reverse()
            buildings.append({"id": e["id"], "h": round(h, 1), "mh": round(mh, 1), "lv": int(lv), "kind": t.get("building", "yes"), "pts": pts, "area": abs(a)})

# ---------------------------------------------------------------------------------------------
# Ruas e grafo
# ---------------------------------------------------------------------------------------------
roads = []
coords = {}
graph = {}
for e in json.load(open(os.path.join(OSM, "highways.json")))["elements"]:
    t = e.get("tags", {})
    hw = t.get("highway")
    if hw not in ROAD_WIDTH or "geometry" not in e:
        continue
    pts = [proj(p) for p in e["geometry"]]
    lanes = parse_m(t.get("lanes"))
    w = ROAD_WIDTH[hw]
    if lanes:
        w = max(w * 0.6, min(w * 1.3, lanes * 3.4))
    roads.append({"cls": hw, "w": round(w, 1), "pts": pts, "name": t.get("name", ""), "oneway": t.get("oneway") == "yes"})
    if hw in CAR_ROADS:
        # Sem ids de nó na saída "geom": nós iguais têm a mesma coordenada, que vira o id.
        ids = pts
        for nid, p in zip(ids, pts):
            coords[nid] = p
        ow = t.get("oneway")
        for a, b in zip(ids, ids[1:]):
            d = math.dist(coords[a], coords[b])
            # Avenidas um pouco mais "baratas": rotas reais preferem vias principais.
            cost = d * (0.8 if hw in ("trunk", "primary", "secondary") else 1.0)
            if ow != "-1":
                graph.setdefault(a, []).append((b, cost))
            if ow not in ("yes", "-1"):
                graph.setdefault(b, []).append((a, cost))
            if ow == "-1":
                graph.setdefault(b, []).append((a, cost))


def nearest_node(p, maxd=300):
    best, bd = None, 1e18
    for nid, q in coords.items():
        if nid not in graph:
            continue
        d = math.dist(p, q)
        if d < bd:
            best, bd = nid, d
    return best if bd < maxd else None


def dijkstra(a, b):
    dist = {a: 0}
    prev = {}
    pq = [(0, a)]
    while pq:
        d, u = heapq.heappop(pq)
        if u == b:
            break
        if d > dist.get(u, 1e18):
            continue
        for v, w in graph.get(u, []):
            nd = d + w
            if nd < dist.get(v, 1e18):
                dist[v] = nd
                prev[v] = u
                heapq.heappush(pq, (nd, v))
    if b not in dist:
        return None
    path = [b]
    while path[-1] != a:
        path.append(prev[path[-1]])
    return [coords[n] for n in reversed(path)]


# ---------------------------------------------------------------------------------------------
# Lugares da história
# ---------------------------------------------------------------------------------------------
def pick_building(spec):
    c = proj_ll(*spec["near"])
    cands = [b for b in buildings if b["lv"] >= spec["min_levels"] and math.dist(centroid(b["pts"]), c) < spec["radius"]]
    if not cands:
        raise SystemExit(f"nenhum prédio perto de {spec['near']}")
    # O mais alto, desempate pelo mais próximo do ponto de referência.
    return max(cands, key=lambda b: (b["h"], -math.dist(centroid(b["pts"]), c)))


home = pick_building(PLACES["home"])
hc = centroid(home["pts"])
def toward_se(b):
    c = centroid(b["pts"])
    d = math.dist(c, hc)
    return WORK_DISTANCE[0] <= d <= WORK_DISTANCE[1] and c[0] > hc[0] - 100 and c[1] > hc[1] + 150
work = max([b for b in buildings if b["lv"] >= 12 and toward_se(b)], key=lambda b: b["h"])
gyms = []
for e in json.load(open(os.path.join(OSM, "gyms.json")))["elements"]:
    p = (e.get("lat"), e.get("lon")) if "lat" in e else (e["center"]["lat"], e["center"]["lon"])
    q = proj_ll(*p)
    d = math.dist(q, hc)
    if GYM_DISTANCE[0] <= d <= GYM_DISTANCE[1]:
        gyms.append((d, q))
if not gyms:
    raise SystemExit("nenhuma academia na faixa de distância")
# Academia em outra direção que o trabalho (rotas que não se sobrepõem).
wc = centroid(work["pts"])
wdir = math.atan2(wc[1] - hc[1], wc[0] - hc[0])
def ang(q):
    a = math.atan2(q[1] - hc[1], q[0] - hc[0]) - wdir
    return abs((a + math.pi) % (2 * math.pi) - math.pi)
gyms.sort(key=lambda g: (-round(ang(g[1]) / 0.35), g[0]))
gym_pt = gyms[0][1]

places = {"home": hc, "work": centroid(work["pts"]), "gym": gym_pt}
nodes = {k: nearest_node(p) for k, p in places.items()}
print("nós:", {k: (v, round(math.dist(coords[v], places[k])) if v else None) for k, v in nodes.items()})
routes = {}
for k in ("work", "gym"):
    r = dijkstra(nodes["home"], nodes[k])
    if not r:
        raise SystemExit(f"sem rota casa → {k}")
    routes[k] = [[round(x, 1), round(z, 1)] for x, z in r]
for b in buildings:
    b["tag"] = 1 if b["id"] == home["id"] else 3 if b["id"] == work["id"] else 0

# ---------------------------------------------------------------------------------------------
# Orla: costa → polígono de terra (o mar fica ao norte).
# ---------------------------------------------------------------------------------------------
coast_ways, beaches = [], []
for e in json.load(open(os.path.join(OSM, "coast.json")))["elements"]:
    if "geometry" not in e:
        continue
    pts = [proj(p) for p in e["geometry"]]
    if e.get("tags", {}).get("natural") == "coastline":
        coast_ways.append(pts)
    else:
        beaches.append(pts)
# Encadeia trechos pelas pontas.
chains = [w[:] for w in coast_ways]
merged = True
while merged and len(chains) > 1:
    merged = False
    for i in range(len(chains)):
        for j in range(len(chains)):
            if i != j and chains[i][-1] == chains[j][0]:
                chains[i] = chains[i] + chains[j][1:]
                chains.pop(j)
                merged = True
                break
        if merged:
            break
coast = max(chains, key=len) if chains else []

parks = []
for e in json.load(open(os.path.join(OSM, "parks.json")))["elements"]:
    if "geometry" in e:
        pts = [proj(p) for p in e["geometry"]]
        if len(pts) > 3 and abs(poly_area(pts[:-1])) > 300:
            parks.append(pts[:-1])

out = {
    "center": CENTER,
    "attribution": "© colaboradores do OpenStreetMap",
    "buildings": [[b["h"], b["mh"], b["lv"], b["tag"], [c for p in b["pts"] for c in p]] for b in buildings],
    "roads": [[r["cls"], r["w"], [c for p in r["pts"] for c in p]] for r in roads],
    "coast": [c for p in coast for c in p],
    "beaches": [[c for p in b for c in p] for b in beaches],
    "parks": [[c for p in pk for c in p] for pk in parks],
    "places": {k: [round(v[0], 1), round(v[1], 1)] for k, v in places.items()},
    "placeHeights": {"home": home["h"], "work": work["h"]},
    "routes": routes,
}
with open(os.path.join(HERE, "city.json"), "w") as f:
    json.dump(out, f, separators=(",", ":"))
rl = {k: round(sum(math.dist(a, b) for a, b in zip(v, v[1:]))) for k, v in routes.items()}
print(f"{len(buildings)} prédios, {len(roads)} ruas, costa {len(coast)} pts, {len(parks)} parques, {len(beaches)} praias")
print(f"casa: {home['lv']} andares ({home['h']} m) em {places['home']}; trabalho: {work['lv']} andares em {places['work']}; academia em {places['gym']}")
print(f"rotas (m): {rl}")
print(f"arquivo: {os.path.getsize(os.path.join(HERE, 'city.json')) // 1024} KB")
