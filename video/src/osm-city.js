// Cidade real (Meireles/Aldeota, Fortaleza) a partir de data/city.json (OpenStreetMap, ODbL).
// Tudo é construído uma vez; o que muda por quadro (carros, mar, mapa, luzes) é função de t.
import * as THREE from "three";
import { CITY } from "../config.js";
import { hash2 } from "./math.js";

export const cityUniforms = {
  uT: { value: 0 },
  uReveal: { value: 1 },
  uMap: { value: 0 }, // raio (m) da malha viária acesa a partir da casa
  uHome: { value: new THREE.Vector2() },
  uFadeCenter: { value: new THREE.Vector2() },
  uFadeRadius: { value: 1e5 },
  uTagGlow: { value: new THREE.Vector3() },
  uWindowGain: { value: CITY.windowIntensity },
  uLitRatio: { value: CITY.windowLitRatio },
  uMoonDir: { value: new THREE.Vector3(0.12, 0.32, 0.94).normalize() }, // lua ao sul: reflexo no mar visto do mar
};

const COMMON = /* glsl */ `
  uniform float uT, uReveal, uMap, uFadeRadius, uWindowGain, uLitRatio;
  uniform vec2 uHome, uFadeCenter;
  uniform vec3 uTagGlow, uMoonDir;
  float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
  float fadeMask(vec2 xz){ return 1.0 - smoothstep(uFadeRadius - 90.0, uFadeRadius, distance(xz, uFadeCenter)); }
`;

let patchId = 0;
function patch(mat, { vertexHead = "", vertexBody = "", fragHead = "", color = "", emissive = "" }) {
  // Chave própria: o three.js reaproveita programas com o mesmo onBeforeCompile.toString().
  const key = `konexya-${patchId++}`;
  mat.customProgramCacheKey = () => key;
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, cityUniforms);
    s.vertexShader = s.vertexShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vW;\n${vertexHead}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n${vertexBody}`)
      .replace("#include <worldpos_vertex>", `#include <worldpos_vertex>\n vW = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", `#include <common>\n${COMMON}\nvarying vec3 vW;\n${fragHead}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${color}`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n${emissive}`);
  };
  return mat;
}

const pairs = (flat) => {
  const out = [];
  for (let i = 0; i < flat.length; i += 2) out.push([flat[i], flat[i + 1]]);
  return out;
};

// ---------------------------------------------------------------------------------------------
// Prédios: paredes extrudadas dos contornos reais + telhado triangulado + casa de máquinas.
// ---------------------------------------------------------------------------------------------
export function createBuildings(data) {
  const P = [], N = [], U = [], INFO = [];
  const push = (x, y, z, nx, ny, nz, u, info) => {
    P.push(x, y, z); N.push(nx, ny, nz); U.push(u); INFO.push(...info);
  };
  const extra = [];
  data.buildings.forEach(([h, mh, lv, tag, flat], bi) => {
    const pts = pairs(flat);
    const seed = hash2(bi, 7, 3);
    const H = h * CITY.heightScale;
    const info = [seed, tag, H, Math.max(1, lv)];
    let u = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % pts.length];
      const len = Math.hypot(x2 - x1, z2 - z1);
      if (len < 0.01) continue;
      // Normal para fora (contorno anti-horário visto de cima → normal à direita do sentido).
      const nx = (z2 - z1) / len, nz = -(x2 - x1) / len;
      const a = [x1, mh, z1], b = [x2, mh, z2], c = [x2, H, z2], d = [x1, H, z1];
      push(...a, nx, 0, nz, u, info); push(...b, nx, 0, nz, u + len, info); push(...c, nx, 0, nz, u + len, info);
      push(...a, nx, 0, nz, u, info); push(...c, nx, 0, nz, u + len, info); push(...d, nx, 0, nz, u, info);
      u += len;
    }
    const tris = THREE.ShapeUtils.triangulateShape(pts.map(([x, z]) => new THREE.Vector2(x, z)), []);
    for (const t of tris) for (const k of [t[0], t[2], t[1]]) push(pts[k][0], H, pts[k][1], 0, 1, 0, 0, info);
    // Torres: casa de máquinas / caixa-d'água no topo (detalhe típico dos prédios de Fortaleza).
    if (H > 30) {
      let cx = 0, cz = 0;
      for (const [x, z] of pts) { cx += x; cz += z; }
      cx /= pts.length; cz /= pts.length;
      const s = Math.min(9, 0.12 * Math.sqrt(Math.abs(polyArea(pts))) + 3);
      extra.push([cx, cz, s, s * (0.7 + 0.3 * seed), H, H + 3.5 + 2 * seed]);
    }
  });
  for (const [cx, cz, w, d, y0, y1] of extra) {
    const box = [[cx - w / 2, cz + d / 2], [cx + w / 2, cz + d / 2], [cx + w / 2, cz - d / 2], [cx - w / 2, cz - d / 2]];
    const info = [0.5, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const [x1, z1] = box[i], [x2, z2] = box[(i + 1) % 4];
      const len = Math.hypot(x2 - x1, z2 - z1);
      const nx = (z2 - z1) / len, nz = -(x2 - x1) / len;
      push(x1, y0, z1, nx, 0, nz, 0, info); push(x2, y0, z2, nx, 0, nz, 0, info); push(x2, y1, z2, nx, 0, nz, 0, info);
      push(x1, y0, z1, nx, 0, nz, 0, info); push(x2, y1, z2, nx, 0, nz, 0, info); push(x1, y1, z1, nx, 0, nz, 0, info);
    }
    for (const k of [0, 2, 1, 0, 3, 2]) push(box[k][0], y1, box[k][1], 0, 1, 0, 0, info);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("aU", new THREE.Float32BufferAttribute(U, 1));
  g.setAttribute("aInfo", new THREE.Float32BufferAttribute(INFO, 4));

  const mat = patch(new THREE.MeshStandardMaterial({ color: 0x45484e, roughness: 0.68, metalness: 0.15 }), {
    vertexHead: "attribute float aU; attribute vec4 aInfo; varying float vU; varying vec4 vInfo; varying vec3 vNrm;",
    vertexBody: "vU = aU; vInfo = aInfo; vNrm = normal;",
    fragHead: `varying float vU; varying vec4 vInfo; varying vec3 vNrm;
      float boxAA(vec2 f, vec2 lo, vec2 hi){ vec2 w = fwidth(f) * 0.8; vec2 a = smoothstep(lo - w, lo + w, f) * (1.0 - smoothstep(hi - w, hi + w, f)); return a.x * a.y; }`,
    color: `
      // Base mais escura (assenta no chão) e topo levemente mais claro.
      diffuseColor.rgb *= mix(0.45, 1.0, smoothstep(0.0, 14.0, vW.y));
      if (vNrm.y > 0.5) diffuseColor.rgb *= 1.25;
      // Fachada: lajes/varandas em cada andar (linhas claras) e vidro escuro entre elas.
      if (vNrm.y < 0.5 && vInfo.w > 0.5) {
        float fh = max(2.8, vInfo.z / vInfo.w);
        float fy = fract(vW.y / fh);
        float slab = 1.0 - smoothstep(0.0, 0.12 + fwidth(vW.y / fh), fy);
        float tower = step(5.5, vInfo.w);
        diffuseColor.rgb *= mix(0.72, 1.0, slab * (0.6 + 0.4 * tower));
        diffuseColor.rgb += vec3(0.05) * slab * tower;
      }`,
    emissive: `
      float fade = fadeMask(vW.xz);
      int tag = int(vInfo.y + 0.5);
      float tg = tag == 1 ? uTagGlow.x : tag == 3 ? uTagGlow.z : 0.0;
      if (vNrm.y < 0.5 && vInfo.w > 0.5) {
        float fh = max(2.8, vInfo.z / vInfo.w);
        float tower = step(5.5, vInfo.w);
        float colW = mix(4.2, 2.6, tower);
        vec2 g = vec2(vU / colW, vW.y / fh);
        vec2 cell = floor(g), f = fract(g);
        float hs = h21(cell + vInfo.x * 113.0);
        float on = h21(cell * 1.37 + vInfo.x * 51.0);
        float ratio = uLitRatio * mix(0.45, 1.25, tower);
        float lit = step(hs, ratio) * step(on, uReveal);
        lit = max(lit, step(hs, 0.62) * step(0.5, tg)); // a casa e o trabalho acendem quase por inteiro
        lit *= step(1.0, g.y) * step(vW.y, vInfo.z - 1.0);
        float win = boxAA(f, vec2(0.16, 0.22), vec2(0.84, 0.8));
        float far = smoothstep(0.2, 0.5, max(fwidth(g.x), fwidth(g.y)));
        float shape = mix(win, 0.42, far);
        float warm = h21(cell * 2.3 + 5.0);
        vec3 wc = mix(vec3(1.0, 0.96, 0.9), vec3(0.88, 0.93, 1.0), step(0.6, warm));
        totalEmissiveRadiance += wc * lit * shape * (0.55 + 0.45 * h21(cell * 3.1)) * uWindowGain * fade * mix(1.0, 0.6, far) * (1.0 + tg * 0.25);
      }
      // Contorno suave do prédio destacado.
      if (tg > 0.0) {
        float top = 1.0 - smoothstep(0.0, 0.6 + fwidth(vW.y) * 2.0, abs(vW.y - vInfo.z));
        totalEmissiveRadiance += vec3(1.0) * top * tg * 1.2;
      }`,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

function polyArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % pts.length];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
}

// ---------------------------------------------------------------------------------------------
// Ruas: calçada + asfalto com faixas. Cada rua é uma fita com comprimento acumulado (aLen).
// ---------------------------------------------------------------------------------------------
function ribbon(pts, half, y, extra = () => []) {
  const P = [], L = [], S = [], X = [];
  let acc = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i) acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1];
    const l = Math.hypot(dx, dz) || 1;
    dx /= l; dz /= l;
    for (const s of [-1, 1]) {
      P.push(pts[i][0] - dz * half * s, y, pts[i][1] + dx * half * s);
      L.push(acc); S.push(s); X.push(...extra(i));
    }
  }
  const idx = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const q = i * 2;
    idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2);
  }
  return { P, L, S, X, idx, length: acc };
}

function mergeRibbons(list, y, halfFn, extraSize = 0, extraFn) {
  const P = [], L = [], S = [], X = [], I = [];
  for (const r of list) {
    const pts = pairs(r[2]);
    if (pts.length < 2) continue;
    const rb = ribbon(pts, halfFn(r), y, extraFn ? (i) => extraFn(r, i) : undefined);
    const base = P.length / 3;
    P.push(...rb.P); L.push(...rb.L); S.push(...rb.S); X.push(...rb.X);
    I.push(...rb.idx.map((k) => k + base));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("aLen", new THREE.Float32BufferAttribute(L, 1));
  g.setAttribute("aSide", new THREE.Float32BufferAttribute(S, 1));
  if (extraSize) g.setAttribute("aRoad", new THREE.Float32BufferAttribute(X, extraSize));
  g.setIndex(I);
  g.computeVertexNormals();
  return g;
}

const CLASS_RANK = { trunk: 3, primary: 3, secondary: 2, tertiary: 1.5, residential: 1, unclassified: 1, living_street: 0.6, service: 0.3 };

export function createRoads(data) {
  const group = new THREE.Group();
  const roads = data.roads.filter((r) => r[0] !== "service" || r[1] >= 5);
  // Calçadas (um pouco mais largas e claras que o asfalto).
  const sw = mergeRibbons(roads.filter((r) => r[0] !== "service"), 0.12, (r) => r[1] / 2 + 3.2);
  const swMat = patch(new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.9 }), {
    vertexHead: "attribute float aLen; attribute float aSide; varying float vSide;",
    vertexBody: "vSide = aSide;",
    fragHead: "varying float vSide;",
    color: "diffuseColor.rgb *= mix(1.0, 1.25, smoothstep(0.85, 0.95, abs(vSide)));",
  });
  const swMesh = new THREE.Mesh(sw, swMat);
  swMesh.receiveShadow = true;
  group.add(swMesh);

  const asphalt = mergeRibbons(roads, 0.25, (r) => r[1] / 2, 2, (r) => [CLASS_RANK[r[0]] ?? 1, r[1]]);
  const roadMat = patch(new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.55, metalness: 0.1 }), {
    vertexHead: "attribute float aLen; attribute float aSide; attribute vec2 aRoad; varying float vLen; varying float vSide; varying vec2 vRoad;",
    vertexBody: "vLen = aLen; vSide = aSide; vRoad = aRoad;",
    fragHead: `varying float vLen; varying float vSide; varying vec2 vRoad;
      float lineAA(float d, float w){ float fw = fwidth(d); return 1.0 - smoothstep(w - fw, w + fw, d); }`,
    color: "",
    emissive: `
      float fade = fadeMask(vW.xz);
      float halfW = vRoad.y * 0.5;
      float across = vSide * halfW; // metros a partir do eixo
      float atten = 1.0 - smoothstep(0.4, 1.4, fwidth(across));
      // Faixa central tracejada e bordas contínuas (avenidas).
      float dash = step(fract(vLen / 9.0), 0.5);
      float center = lineAA(abs(across), 0.12) * dash * step(0.9, vRoad.x);
      float edge = lineAA(abs(abs(across) - (halfW - 0.6)), 0.1) * step(1.9, vRoad.x);
      float paint = (center * 0.55 + edge * 0.35) * atten;
      // Malha viária que acende a partir da casa ("o mapa ganha detalhes").
      float d = distance(vW.xz, uHome);
      float front = smoothstep(uMap, uMap - 260.0, d);
      float scan = smoothstep(uMap - 140.0, uMap, d) * front;
      float mapLine = lineAA(abs(abs(across) - halfW * 0.9), 0.18) * atten;
      totalEmissiveRadiance += vec3(0.85, 0.88, 0.92) * (paint * 0.5 + mapLine * (front * 0.22 + scan * 1.1) * (0.6 + 0.4 * vRoad.x / 3.0)) * fade * uReveal;`,
  });
  const roadMesh = new THREE.Mesh(asphalt, roadMat);
  roadMesh.receiveShadow = true;
  group.add(roadMesh);
  group.userData.roads = roads;
  return group;
}

// ---------------------------------------------------------------------------------------------
// Postes: ponto de luz + poça de luz no chão, ao longo das ruas, alternando os lados.
// ---------------------------------------------------------------------------------------------
export function createStreetLights(data) {
  const spots = [];
  for (const [cls, w, flat] of data.roads) {
    if (cls === "service") continue;
    const pts = pairs(flat);
    const spacing = cls === "residential" || cls === "living_street" ? 34 : 28;
    let carry = hash2(pts.length, Math.round(w * 10), 11) * spacing, side = 1;
    for (let i = 1; i < pts.length; i++) {
      const [x1, z1] = pts[i - 1], [x2, z2] = pts[i];
      const len = Math.hypot(x2 - x1, z2 - z1);
      const dx = (x2 - x1) / len, dz = (z2 - z1) / len;
      let s = carry;
      while (s < len) {
        const off = w / 2 + 1.6;
        spots.push([x1 + dx * s - dz * off * side, z1 + dz * s + dx * off * side]);
        side = -side;
        s += spacing;
      }
      carry = s - len;
    }
  }
  const n = spots.length;
  const quad = new THREE.PlaneGeometry(1, 1);
  quad.rotateX(-Math.PI / 2);
  const poolGeo = new THREE.InstancedBufferGeometry().copy(quad);
  const offs = new Float32Array(n * 3);
  spots.forEach(([x, z], i) => offs.set([x, z, hash2(i, 3, 5)], i * 3));
  poolGeo.setAttribute("aOff", new THREE.InstancedBufferAttribute(offs, 3));
  poolGeo.instanceCount = n;
  const poolMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: cityUniforms,
    vertexShader: `attribute vec3 aOff; varying vec2 vP; varying vec3 vO;
      void main(){ vP = position.xz; vO = aOff; vec3 p = vec3(position.x * 18.0 + aOff.x, 0.4, position.z * 18.0 + aOff.y);
      gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `${COMMON} varying vec2 vP; varying vec3 vO;
      void main(){ float r = length(vP) * 2.0; float a = exp(-r * r * 3.2) * (1.0 - smoothstep(0.9, 1.0, r));
        vec2 xz = vO.xy; float k = fadeMask(xz) * uReveal * (0.8 + 0.2 * vO.z);
        gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * a * 0.06 * k, 1.0); }`,
  });
  const pools = new THREE.Mesh(poolGeo, poolMat);
  pools.frustumCulled = false;
  pools.renderOrder = 1;

  const bulbGeo = new THREE.InstancedBufferGeometry().copy(new THREE.SphereGeometry(0.3, 8, 6));
  bulbGeo.setAttribute("aOff", new THREE.InstancedBufferAttribute(offs, 3));
  bulbGeo.instanceCount = n;
  const bulbMat = new THREE.ShaderMaterial({
    uniforms: cityUniforms,
    vertexShader: `attribute vec3 aOff; varying vec3 vO;
      void main(){ vO = aOff; vec3 p = position + vec3(aOff.x, 8.5, aOff.y); gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `${COMMON} varying vec3 vO; void main(){ float k = fadeMask(vO.xy) * uReveal; gl_FragColor = vec4(vec3(1.4, 1.35, 1.25) * k, 1.0); }`,
  });
  const bulbs = new THREE.Mesh(bulbGeo, bulbMat);
  bulbs.frustumCulled = false;
  const g = new THREE.Group();
  g.add(pools, bulbs);
  return g;
}

// ---------------------------------------------------------------------------------------------
// Carros: pares de faróis (traços de luz) que percorrem as ruas. Posição = função de t.
// ---------------------------------------------------------------------------------------------
export function createTraffic(data, count) {
  const lanes = [];
  for (const [cls, w, flat] of data.roads) {
    if (!["trunk", "primary", "secondary", "tertiary"].includes(cls)) continue;
    const pts = pairs(flat);
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    if (cum[cum.length - 1] > 60) lanes.push({ pts, cum, len: cum[cum.length - 1], w });
  }
  const total = lanes.reduce((a, l) => a + l.len, 0);
  const cars = [];
  for (let i = 0; i < count; i++) {
    // Escolha determinística da via, proporcional ao comprimento.
    let r = hash2(i, 1, 99) * total, li = 0;
    while (r > lanes[li].len && li < lanes.length - 1) r -= lanes[li++].len;
    cars.push({ lane: lanes[li], s0: r, dir: hash2(i, 2, 99) < 0.5 ? 1 : -1, speed: 9 + 7 * hash2(i, 3, 99) });
  }
  const geo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
  const aPos = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
  aPos.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("aPos", aPos);
  geo.instanceCount = count;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: cityUniforms,
    vertexShader: `attribute vec4 aPos; varying vec2 vP; varying vec4 vC;
      void main(){ vP = position.xz; vC = aPos;
        float ang = aPos.z; vec2 d = vec2(cos(ang), sin(ang)); vec2 n = vec2(-d.y, d.x);
        vec2 q = d * position.z * 9.0 + n * position.x * 2.2;
        gl_Position = projectionMatrix * viewMatrix * vec4(aPos.x + q.x, 0.6, aPos.y + q.y, 1.0); }`,
    fragmentShader: `${COMMON} varying vec2 vP; varying vec4 vC;
      void main(){
        // Dois faróis lado a lado, com rastro para trás.
        float along = vP.y + 0.5; // 0 atrás, 1 na frente
        float across = abs(abs(vP.x) - 0.25);
        float beam = exp(-across * across * 300.0) * pow(along, 2.5);
        float k = fadeMask(vC.xy) * uReveal * vC.w;
        gl_FragColor = vec4(vec3(1.0, 0.97, 0.92) * beam * 1.6 * k, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  return {
    mesh,
    update(t, gain = 1) {
      const a = aPos.array;
      cars.forEach((c, i) => {
        const L = c.lane;
        let s = c.s0 + c.dir * c.speed * t;
        s = ((s % L.len) + L.len) % L.len;
        let k = 1;
        while (k < L.cum.length - 1 && L.cum[k] < s) k++;
        const [x1, z1] = L.pts[k - 1], [x2, z2] = L.pts[k];
        const seg = L.cum[k] - L.cum[k - 1] || 1;
        const f = (s - L.cum[k - 1]) / seg;
        let dx = (x2 - x1) / seg, dz = (z2 - z1) / seg;
        const off = L.w * 0.22 * c.dir; // mão de direção
        const x = x1 + (x2 - x1) * f - dz * off, z = z1 + (z2 - z1) * f + dx * off;
        if (c.dir < 0) { dx = -dx; dz = -dz; }
        a.set([x, z, Math.atan2(dz, dx), gain], i * 4);
      });
      aPos.needsUpdate = true;
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Terra, mar, praias e parques
// ---------------------------------------------------------------------------------------------
export function createLandAndSea(data) {
  const group = new THREE.Group();
  const coast = pairs(data.coast);
  // Terra: costa (oeste → leste) fechada bem ao sul. O mar ocupa o resto (norte).
  if (coast.length && coast[0][0] > coast[coast.length - 1][0]) coast.reverse();
  const far = 6000;
  const land = [[coast[0][0] - far, coast[0][1]], ...coast, [coast[coast.length - 1][0] + far, coast[coast.length - 1][1]], [coast[coast.length - 1][0] + far, far], [coast[0][0] - far, far]];
  const shape = new THREE.Shape(land.map(([x, z]) => new THREE.Vector2(x, -z)));
  const landGeo = new THREE.ShapeGeometry(shape);
  landGeo.rotateX(-Math.PI / 2);
  const landMat = patch(new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.95 }), {});
  const landMesh = new THREE.Mesh(landGeo, landMat);
  landMesh.receiveShadow = true;
  group.add(landMesh);

  const seaGeo = new THREE.PlaneGeometry(14000, 14000, 1, 1);
  seaGeo.rotateX(-Math.PI / 2);
  const seaMat = new THREE.ShaderMaterial({
    uniforms: { ...cityUniforms, cameraPos: { value: new THREE.Vector3() } },
    fog: false,
    vertexShader: `varying vec3 vW; void main(){ vW = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW,1.0); }`,
    fragmentShader: `${COMMON} uniform vec3 cameraPos; varying vec3 vW;
      vec2 waveN(vec2 p, float t){
        vec2 n = vec2(0.0);
        n += vec2(cos(p.x * 0.031 + t * 0.9), cos(p.y * 0.027 - t * 0.7)) * 0.35;
        n += vec2(cos(p.x * 0.083 - p.y * 0.05 + t * 1.6), cos(p.y * 0.091 + p.x * 0.04 + t * 1.3)) * 0.22;
        n += vec2(cos(p.x * 0.21 + p.y * 0.13 - t * 2.4), cos(p.y * 0.19 - p.x * 0.17 + t * 2.1)) * 0.22;
        return n;
      }
      void main(){
        vec3 V = normalize(cameraPos - vW);
        vec2 w = waveN(vW.xz, uT);
        vec3 N = normalize(vec3(w.x * 0.035, 1.0, w.y * 0.035));
        vec3 R = reflect(-V, N);
        float spec = pow(max(dot(R, uMoonDir), 0.0), 40.0) * 0.12;
        spec *= smoothstep(150.0, 600.0, length(vW.xz - cameraPos.xz)); // sem clarão logo abaixo da câmera
        // Reflexo das luzes da orla: faixa suave perto da costa.
        spec += 0.0;
        float fres = pow(1.0 - max(V.y, 0.0), 4.0);
        vec3 col = vec3(0.004, 0.005, 0.006) + vec3(0.018, 0.02, 0.024) * fres;
        col += vec3(0.95, 0.97, 1.0) * spec * uReveal;
        float fog = 1.0 - exp(-pow(length(vW - cameraPos) * 0.00055, 2.0));
        col = mix(col, vec3(0.008, 0.008, 0.01), fog);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.position.y = -0.6;
  sea.userData.mat = seaMat;
  group.add(sea);

  // Praias (areia mais clara, com faixa de espuma na beira).
  const sandMat = patch(new THREE.MeshStandardMaterial({ color: 0x4a4a4c, roughness: 1 }), {});
  for (const b of data.beaches) {
    const pts = pairs(b);
    if (pts.length < 3) continue;
    const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))));
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, sandMat);
    m.position.y = 0.05;
    m.receiveShadow = true;
    group.add(m);
  }

  // Parques: gramado escuro + árvores (copas baixas) em posições determinísticas.
  const parkMat = patch(new THREE.MeshStandardMaterial({ color: 0x18201b, roughness: 1 }), {});
  const trees = [];
  data.parks.forEach((pk, pi) => {
    const pts = pairs(pk);
    const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))));
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, parkMat);
    m.position.y = 0.06;
    m.receiveShadow = true;
    group.add(m);
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (const [x, z] of pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
    for (let x = minX; x < maxX; x += 9) for (let z = minZ; z < maxZ; z += 9) {
      const jx = x + (hash2(Math.round(x), Math.round(z), pi) - 0.5) * 6, jz = z + (hash2(Math.round(z), Math.round(x), pi + 1) - 0.5) * 6;
      if (hash2(Math.round(jx), Math.round(jz), 5) < 0.55 && insidePoly(jx, jz, pts)) trees.push([jx, jz, 2.5 + 2.5 * hash2(Math.round(jx), 1, Math.round(jz))]);
    }
  });
  if (trees.length) {
    const tg = new THREE.IcosahedronGeometry(1, 1);
    const tm = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ color: 0x0c0f0d, roughness: 1 }), trees.length);
    const m4 = new THREE.Matrix4();
    trees.forEach(([x, z, r], i) => tm.setMatrixAt(i, m4.makeScale(r, r * 0.85, r).setPosition(x, r * 0.9 + 1.5, z)));
    tm.castShadow = true;
    tm.receiveShadow = true;
    group.add(tm);
  }
  return group;
}

function insidePoly(x, z, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

// ---------------------------------------------------------------------------------------------
// Céu fixo: preto no alto, cinza-grafite muito sutil no horizonte. Não muda com o tempo.
// ---------------------------------------------------------------------------------------------
export function createSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vD; void main(){
      float h = max(vD.y, 0.0);
      vec3 col = mix(vec3(0.034, 0.036, 0.042), vec3(0.006, 0.006, 0.008), smoothstep(0.0, 0.32, h));
      gl_FragColor = vec4(col, 1.0); }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(7000, 48, 24), mat);
  m.frustumCulled = false;
  m.renderOrder = -1;
  return m;
}

export const FOG_COLOR = new THREE.Color(0x070708);
