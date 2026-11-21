// Cidade 3D: chão com malha de ruas, prédios instanciados com janelas procedurais e céu.
// Toda a geometria nasce de um gerador com semente fixa: a cidade é sempre a mesma.
import * as THREE from "three";
import { CITY, GRID_PITCH, POIS, VIDEO } from "../config.js";
import { mulberry32, hash2 } from "./math.js";

const P = GRID_PITCH;
export const gridToWorld = ([gx, gz], y = 0) => new THREE.Vector3(gx * P, y, gz * P);

// Uniforms compartilhados, atualizados a cada quadro pelas transições (função de t).
export const cityUniforms = {
  uReveal: { value: 1 }, // janelas acendendo na abertura
  uMap: { value: 0 }, // raio (m) da malha do mapa desenhada a partir do imóvel
  uFadeCenter: { value: new THREE.Vector2(0, 0) },
  uFadeRadius: { value: 1e5 }, // luzes fora deste raio se apagam (encerramento)
  uTagGlow: { value: new THREE.Vector3(0, 0, 0) }, // destaque: imóvel, academia, trabalho
  uWindowGain: { value: CITY.windowIntensity },
  uLitRatio: { value: CITY.windowLitRatio },
  uEdge: { value: 0.05 }, // filete de luz nas arestas (acabamento de maquete)
};

const GLSL_COMMON = /* glsl */ `
  uniform float uReveal, uMap, uFadeRadius, uWindowGain, uLitRatio, uEdge;
  uniform vec2 uFadeCenter;
  uniform vec3 uTagGlow;
  float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
  float fadeMask(vec2 xz){
    float d = distance(xz, uFadeCenter);
    return 1.0 - smoothstep(uFadeRadius - 60.0, uFadeRadius, d);
  }
`;

// ---------------------------------------------------------------------------------------------
// Prédios
// ---------------------------------------------------------------------------------------------
function generateBuildings() {
  const rnd = mulberry32(VIDEO.seed);
  const list = [];
  const B = CITY.block;
  const tagOf = (gx, gz) => {
    const eq = (b) => b[0] === gx && b[1] === gz;
    if (eq(POIS.home.building)) return 1;
    if (eq(POIS.gym.building)) return 2;
    if (eq(POIS.work.building)) return 3;
    return 0;
  };
  const dt = CITY.downtown;
  for (let gz = CITY.gridZ[0]; gz <= CITY.gridZ[1]; gz++) {
    for (let gx = CITY.gridX[0]; gx <= CITY.gridX[1]; gx++) {
      const tag = tagOf(gx, gz);
      const r = () => rnd();
      if (!tag && r() < CITY.emptyLotChance) {
        r(); r();
        continue; // praça
      }
      const cx = gx * P, cz = gz * P;
      const dist = Math.hypot(gx - dt.gx, gz - dt.gz) / dt.radius;
      const urban = Math.max(0, 1 - dist); // 1 no centro, 0 longe
      // Subdivisão da quadra em lotes.
      const split = tag ? 1 : r() < 0.25 + urban * 0.35 ? 1 : r() < 0.5 ? 2 : 4;
      const lots = [];
      const m = 2.5; // recuo do lote
      if (split === 1) lots.push([cx, cz, B - m * 2, B - m * 2]);
      else if (split === 2) {
        const vertical = r() < 0.5;
        const w = (B - m * 3) / 2;
        for (const s of [-1, 1]) {
          if (vertical) lots.push([cx + s * (w / 2 + m / 2), cz, w, B - m * 2]);
          else lots.push([cx, cz + s * (w / 2 + m / 2), B - m * 2, w]);
        }
      } else {
        const w = (B - m * 3) / 2;
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) lots.push([cx + sx * (w / 2 + m / 2), cz + sz * (w / 2 + m / 2), w, w]);
      }
      for (const [x, z, w, d] of lots) {
        const H = CITY.heights;
        let h = H.residentialMin + (H.residentialMax - H.residentialMin) * Math.pow(r(), 1.6);
        const tower = r() < H.towerChance * urban * 2.2;
        if (tower) h = Math.max(h, 70 + (H.towerMax - 70) * Math.pow(r(), 0.8) * (0.55 + 0.45 * urban));
        if (tag === 1) h = 38; // imóvel: prédio residencial médio, legível de cima
        if (tag === 3) h = Math.max(h, 120);
        h *= CITY.heightScale;
        const ww = w * (0.8 + 0.2 * r()), dd = d * (0.8 + 0.2 * r());
        list.push({ x, z, w: ww, d: dd, h, seed: r(), tag });
        // Escalonamento (setback) em torres: volume menor no topo.
        if (h > 60 && r() < 0.65) {
          const k = 0.55 + 0.25 * r();
          const h2 = h * (0.18 + 0.22 * r());
          list.push({ x, z, w: ww * k, d: dd * k, h: h + h2, seed: r(), tag, base: h });
          if (r() < 0.45) list.push({ x, z, w: 0.7, d: 0.7, h: h + h2 + 10 + 18 * r(), seed: 0, tag: 0, base: h + h2, antenna: 1 });
        }
      }
    }
  }
  return list;
}

function buildingMaterial() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.78, metalness: 0.25 });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, cityUniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute vec4 aInfo; // seed, tag, height, antenna
        attribute vec3 aSize;
        varying vec3 vW; varying vec3 vN; varying vec3 vL; varying vec3 vSize; varying vec4 vInfo;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vL = position; vSize = aSize; vInfo = aInfo; vN = normal;
        vW = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        ${GLSL_COMMON}
        varying vec3 vW; varying vec3 vN; varying vec3 vL; varying vec3 vSize; varying vec4 vInfo;
        float aaBox(vec2 f, vec2 lo, vec2 hi){
          vec2 w = fwidth(f) * 0.75;
          vec2 a = smoothstep(lo - w, lo + w, f) * (1.0 - smoothstep(hi - w, hi + w, f));
          return a.x * a.y;
        }`
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        // Oclusão falsa na base: prédios "assentam" no chão.
        diffuseColor.rgb *= mix(0.35, 1.0, smoothstep(0.0, 22.0, vW.y));
        // Topos um pouco mais claros: leitura da volumetria vista de cima.
        if (vN.y > 0.5) diffuseColor.rgb *= 1.35;`
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float fade = fadeMask(vW.xz);
        vec3 n = vN;
        // Arestas: distância em metros até a borda da face.
        vec2 lc; vec2 sz;
        if (abs(n.x) > 0.5) { lc = vec2(vL.z + 0.5, vL.y); sz = vSize.zy; }
        else if (abs(n.z) > 0.5) { lc = vec2(vL.x + 0.5, vL.y); sz = vSize.xy; }
        else { lc = vec2(vL.x + 0.5, vL.z + 0.5); sz = vSize.xz; }
        vec2 dm = min(lc, 1.0 - lc) * sz;
        float e = min(dm.x, dm.y);
        float ew = fwidth(e);
        float edge = 1.0 - smoothstep(0.08, 0.08 + ew * 1.5 + 0.12, e);
        int tag = int(vInfo.y + 0.5);
        float tg = tag == 1 ? uTagGlow.x : tag == 2 ? uTagGlow.y : tag == 3 ? uTagGlow.z : 0.0;
        totalEmissiveRadiance += vec3(edge) * (uEdge * fade + tg * 0.22);
        totalEmissiveRadiance += vec3(0.85, 0.88, 0.92) * tg * 0.012;
        // Janelas: só em faces verticais e acima do térreo.
        if (abs(n.y) < 0.5 && vInfo.w < 0.5) {
          float u = abs(n.x) > 0.5 ? vW.z : vW.x;
          vec2 g = vec2(u / 3.1, (vW.y - 1.2) / 3.5);
          vec2 cell = floor(g);
          vec2 f = fract(g);
          float hsh = h21(cell + vInfo.x * 97.0 + n.xz * 13.0);
          float hon = h21(cell * 1.7 + vInfo.x * 31.0);
          float lit = step(hsh, uLitRatio) * step(hon, uReveal);
          lit *= step(4.5, vW.y) * step(vW.y, vInfo.z - 2.0);
          float win = aaBox(f, vec2(0.3, 0.36), vec2(0.7, 0.74));
          // Longe demais para resolver a janela: troca pelo brilho médio (evita cintilação).
          float far = smoothstep(0.18, 0.45, max(fwidth(g.x), fwidth(g.y)));
          float shape = mix(win, 0.17, far);
          float var = 0.55 + 0.45 * h21(cell * 3.1 + 7.0);
          totalEmissiveRadiance += vec3(1.0, 0.975, 0.94) * lit * shape * var * uWindowGain * fade * mix(1.0, 0.55, far);
        }
        if (vInfo.w > 0.5) {
          // Luz de topo da antena.
          totalEmissiveRadiance += vec3(1.0) * smoothstep(0.985, 0.995, vL.y) * 3.0 * fade * uReveal;
        }`
      );
  };
  return mat;
}

export function createBuildings() {
  const list = generateBuildings();
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(geo, buildingMaterial(), list.length);
  const info = new Float32Array(list.length * 4);
  const size = new Float32Array(list.length * 3);
  const m = new THREE.Matrix4();
  list.forEach((b, i) => {
    const base = b.base || 0;
    const hh = b.h - base;
    m.makeScale(b.w, hh, b.d).setPosition(b.x, base, b.z);
    mesh.setMatrixAt(i, m);
    info.set([b.seed, b.tag, b.h, b.antenna || 0], i * 4);
    size.set([b.w, hh, b.d], i * 3);
  });
  geo.setAttribute("aInfo", new THREE.InstancedBufferAttribute(info, 4));
  geo.setAttribute("aSize", new THREE.InstancedBufferAttribute(size, 3));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.userData.list = list;
  return mesh;
}

// ---------------------------------------------------------------------------------------------
// Chão: quadras, ruas, postes (pontos de luz) e a malha do mapa que se desenha a partir do imóvel.
// ---------------------------------------------------------------------------------------------
export function createGround() {
  const geo = new THREE.PlaneGeometry(6000, 6000, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.92, metalness: 0.0 });
  const half = CITY.block / 2;
  const minX = (CITY.gridX[0] - 0.5) * P, maxX = (CITY.gridX[1] + 0.5) * P;
  const minZ = (CITY.gridZ[0] - 0.5) * P, maxZ = (CITY.gridZ[1] + 0.5) * P;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, cityUniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vW;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvW = (modelMatrix * vec4(position,1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        ${GLSL_COMMON}
        varying vec3 vW;
        const float P = ${P.toFixed(2)};
        const float HALF = ${half.toFixed(2)};
        float lineAA(float d, float w){ float fw = fwidth(d); return 1.0 - smoothstep(w - fw, w + fw, d); }`
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        vec2 l = mod(vW.xz + P * 0.5, P) - P * 0.5;
        float inCity = step(${minX.toFixed(1)}, vW.x) * step(vW.x, ${maxX.toFixed(1)}) * step(${minZ.toFixed(1)}, vW.z) * step(vW.z, ${maxZ.toFixed(1)});
        float block = step(abs(l.x), HALF) * step(abs(l.y), HALF) * inCity;
        // Quadras levemente mais claras que o asfalto.
        diffuseColor.rgb *= mix(1.0, 1.45, block);
        // Fora da cidade o chão some no escuro.
        diffuseColor.rgb *= mix(0.18, 1.0, inCity);`
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float fade = fadeMask(vW.xz);
        // Distâncias até o eixo da rua (borda da célula) e até o meio-fio.
        vec2 dCenter = P * 0.5 - abs(l);
        float dStreet = min(dCenter.x, dCenter.y);
        float atten = 1.0 - smoothstep(0.25, 1.2, max(fwidth(vW.x), fwidth(vW.z)) / 1.5);
        // Postes: pontos ao longo dos meios-fios.
        vec2 curb = abs(abs(l) - (HALF + 1.5));
        float alongX = abs(mod(vW.x, 13.0) - 6.5);
        float alongZ = abs(mod(vW.z, 13.0) - 6.5);
        float lamp = max(
          lineAA(length(vec2(curb.y, alongX)), 0.45) * step(abs(l.x), HALF + 3.0),
          lineAA(length(vec2(curb.x, alongZ)), 0.45) * step(abs(l.y), HALF + 3.0));
        totalEmissiveRadiance += vec3(1.0, 0.97, 0.92) * lamp * 1.1 * inCity * fade * uReveal * mix(0.35, 1.0, atten);
        // Malha do mapa: eixos das ruas e contorno das quadras, desenhada do imóvel para fora.
        float dHome = length(vW.xz - vec2(0.0, ${(-0.5 * P).toFixed(2)}));
        float front = smoothstep(uMap, uMap - 140.0, dHome);
        float scan = smoothstep(uMap - 90.0, uMap, dHome) * front;
        float axis = lineAA(dStreet, 0.22);
        vec2 dBlock = abs(abs(l) - HALF);
        float outline = lineAA(min(dBlock.x, dBlock.y), 0.12) * step(min(abs(l.x), abs(l.y)), HALF + 0.3);
        float mapLines = (axis * 0.55 + outline * 0.22) * inCity * atten;
        totalEmissiveRadiance += vec3(0.82, 0.86, 0.92) * mapLines * (front * 0.55 + scan * 1.6) * fade;`
      );
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

// ---------------------------------------------------------------------------------------------
// Céu: gradiente com halo frio no horizonte (contraluz da abertura).
// ---------------------------------------------------------------------------------------------
export const skyUniforms = { uGlow: { value: 0.2 }, uGlowDir: { value: new THREE.Vector3(0.1, 0, -1).normalize() } };

export function createSky() {
  const geo = new THREE.SphereGeometry(3500, 48, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: skyUniforms,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uGlow; uniform vec3 uGlowDir; varying vec3 vD;
      void main(){
        float h = vD.y;
        vec3 col = mix(vec3(0.020, 0.021, 0.024), vec3(0.004), smoothstep(0.0, 0.45, h));
        float toward = max(dot(normalize(vec3(vD.x, 0.0, vD.z)), uGlowDir), 0.0);
        float band = exp(-abs(h) * 14.0) * (0.35 + 0.65 * pow(toward, 3.0));
        col += vec3(0.80, 0.84, 0.90) * band * uGlow;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  return mesh;
}

export const FOG_COLOR = new THREE.Color(0x050506);

/** Quadra alvo a partir de [gx, gz]. */
export const blockCenter = (b) => new THREE.Vector3(b[0] * P, 0, b[1] * P);

export { hash2 };
