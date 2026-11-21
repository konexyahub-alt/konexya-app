// Rotas luminosas (fita no chão que se desenha por comprimento de arco) e pinos dos pontos de interesse.
import * as THREE from "three";
import { ROUTES, POIS, PINS, GRID_PITCH } from "../config.js";
import { range, ease, clamp } from "./math.js";

const P = GRID_PITCH;
const Y = 0.35; // altura da fita acima do chão

/** Polilinha de grade → pontos densos com cantos arredondados (arcos). */
function roundedPath(gridPts, radius) {
  const pts = gridPts.map(([x, z]) => new THREE.Vector2(x * P, z * P));
  const out = [pts[0].clone()];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const d1 = b.clone().sub(a), d2 = c.clone().sub(b);
    const r = Math.min(radius, d1.length() / 2, d2.length() / 2);
    const p1 = b.clone().sub(d1.clone().normalize().multiplyScalar(r));
    const p2 = b.clone().add(d2.clone().normalize().multiplyScalar(r));
    out.push(p1);
    // Bézier quadrática com controle no canto ≈ arco suave.
    for (let s = 1; s < 12; s++) {
      const k = s / 12;
      out.push(new THREE.Vector2(
        (1 - k) ** 2 * p1.x + 2 * (1 - k) * k * b.x + k * k * p2.x,
        (1 - k) ** 2 * p1.y + 2 * (1 - k) * k * b.y + k * k * p2.y,
      ));
    }
    out.push(p2);
  }
  out.push(pts[pts.length - 1].clone());
  // Reamostra a cada ~1 m para a fita ficar uniforme.
  const dense = [out[0]];
  for (let i = 1; i < out.length; i++) {
    const a = out[i - 1], b = out[i];
    const n = Math.max(1, Math.ceil(a.distanceTo(b)));
    for (let s = 1; s <= n; s++) dense.push(a.clone().lerp(b, s / n));
  }
  return dense;
}

function ribbonGeometry(path, width) {
  const n = path.length;
  const pos = new Float32Array(n * 2 * 3);
  const prog = new Float32Array(n * 2);
  const side = new Float32Array(n * 2);
  const idx = [];
  let total = 0;
  const lens = [0];
  for (let i = 1; i < n; i++) lens.push((total += path[i].distanceTo(path[i - 1])));
  for (let i = 0; i < n; i++) {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(n - 1, i + 1)];
    const dir = b.clone().sub(a).normalize();
    const nx = -dir.y, nz = dir.x;
    for (const s of [-1, 1]) {
      const j = i * 2 + (s > 0 ? 1 : 0);
      pos.set([path[i].x + nx * width * s, Y, path[i].y + nz * width * s], j * 3);
      prog[j] = lens[i];
      side[j] = s;
    }
    if (i < n - 1) {
      const q = i * 2;
      idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aLen", new THREE.BufferAttribute(prog, 1));
  g.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
  g.setIndex(idx);
  return { geometry: g, length: total };
}

function routeMaterial(length) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uDraw: { value: 0 }, // metros desenhados
      uLength: { value: length },
      uGain: { value: 1 },
      uPulse: { value: new THREE.Vector4(-1, -1, -1, -1) }, // posições (m) dos pulsos
      uCore: { value: 0.3 }, // meia-largura relativa do núcleo
    },
    vertexShader: `
      attribute float aLen; attribute float aSide;
      varying float vLen; varying float vSide;
      void main(){ vLen = aLen; vSide = aSide; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uDraw, uLength, uGain, uCore; uniform vec4 uPulse;
      varying float vLen; varying float vSide;
      void main(){
        float s = abs(vSide);
        float fw = fwidth(s);
        float core = 1.0 - smoothstep(uCore - fw, uCore + fw, s);
        float halo = exp(-s * s * 6.0) * 0.22;
        float drawn = 1.0 - smoothstep(uDraw - 1.5, uDraw, vLen);
        // Cabeça mais brilhante na ponta que avança.
        float head = exp(-pow((uDraw - vLen) / 7.0, 2.0)) * step(uDraw, uLength - 0.5) * step(0.5, uDraw);
        float pulse = 0.0;
        for (int i = 0; i < 4; i++) {
          float p = uPulse[i];
          if (p >= 0.0) pulse += exp(-pow((vLen - p) / 9.0, 2.0));
        }
        float a = (core * 1.0 + halo) * drawn;
        vec3 col = vec3(0.92, 0.95, 1.0) * a * (0.95 + head * 2.2 + pulse * 1.5) * uGain;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// ---------------------------------------------------------------------------------------------
// Pinos: feixe vertical, núcleo luminoso e anéis que se expandem no chão.
// ---------------------------------------------------------------------------------------------
function pinGroup() {
  const g = new THREE.Group();
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uGrow: { value: 0 }, uGain: { value: 1 } },
    vertexShader: `varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uGrow, uGain; varying float vY;
      void main(){ float k = vY / ${PINS.labelHeight.toFixed(1)}; float a = step(k, uGrow) * (1.0 - k * 0.55);
        gl_FragColor = vec4(vec3(1.0) * a * 1.6 * uGain, 1.0); }`,
  });
  const beamGeo = new THREE.CylinderGeometry(0.28, 0.28, PINS.labelHeight, 8, 1, true);
  beamGeo.translate(0, PINS.labelHeight / 2, 0);
  const beam = new THREE.Mesh(beamGeo, beamMat);
  g.add(beam);

  const ringMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uGain: { value: 0 } },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uT, uGain; varying vec2 vP;
      void main(){
        float r = length(vP);
        float fw = fwidth(r);
        float acc = 0.0;
        for (int i = 0; i < 2; i++) {
          float ph = fract(uT * 0.45 + float(i) * 0.5);
          float R = 2.0 + ph * 16.0;
          acc += (1.0 - smoothstep(0.25, 0.25 + fw * 1.5, abs(r - R))) * (1.0 - ph);
        }
        float disc = (1.0 - smoothstep(2.2, 2.2 + fw * 1.5, r)) * 1.4;
        float soft = exp(-r * r / 30.0) * 0.6;
        gl_FragColor = vec4(vec3(1.0) * (acc * 0.9 + disc + soft) * uGain, 1.0);
      }`,
  });
  const ringGeo = new THREE.PlaneGeometry(40, 40);
  ringGeo.rotateX(-Math.PI / 2);
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.5;
  g.add(ring);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 24, 12),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.2), transparent: true }),
  );
  g.add(head);
  return { group: g, beamMat, ringMat, head };
}

export function createRoutes(scene) {
  const routes = {};
  for (const key of ["work", "gym"]) {
    const path = roundedPath(ROUTES[key].points, ROUTES.cornerRadius);
    const { geometry, length } = ribbonGeometry(path, ROUTES.width * 1.7);
    const mat = routeMaterial(length);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.renderOrder = 2;
    mesh.frustumCulled = false;
    scene.add(mesh);
    // Trecho escondido atrás dos prédios: desenhado atenuado por cima (leitura de mapa).
    const xmat = mat.clone();
    xmat.uniforms = mat.uniforms; // mesmos valores, mesmo t
    xmat.depthFunc = THREE.GreaterDepth;
    const xray = new THREE.Mesh(geometry, xmat);
    xray.renderOrder = 2;
    xray.frustumCulled = false;
    xray.onBeforeRender = () => { mat.uniforms.uGain.value *= ROUTES.xray; };
    xray.onAfterRender = () => { mat.uniforms.uGain.value /= ROUTES.xray; };
    scene.add(xray);
    routes[key] = { mesh, mat, length };
  }
  const pins = {};
  for (const key of Object.keys(POIS)) {
    const p = pinGroup();
    const [gx, gz] = POIS[key].at;
    p.group.position.set(gx * P, 0, gz * P);
    p.group.renderOrder = 3;
    scene.add(p.group);
    pins[key] = p;
  }
  return { routes, pins };
}

/** Atualiza rotas e pinos em t. `gain` apaga tudo no encerramento. */
export function updateRoutes({ routes, pins }, t, gain = 1) {
  for (const key of ["work", "gym"]) {
    const r = routes[key];
    const [a, b] = ROUTES[key].draw;
    r.mat.uniforms.uDraw.value = ease.inOutCubic(range(t, a, b)) * (r.length + 2);
    r.mat.uniforms.uGain.value = gain;
    // Pulsos: posição = função de t (fração do comprimento), só depois do desenho completo.
    const pl = ROUTES.pulses;
    const v = [-1, -1, -1, -1];
    if (t > pl.start) {
      for (let i = 0; i < pl.count; i++) {
        const ph = (t - pl.start) * pl.speed * (key === "gym" ? 1.9 : 1) + i / pl.count;
        v[i] = (ph - Math.floor(ph)) * r.length;
      }
    }
    r.mat.uniforms.uPulse.value.set(...v);
  }
  for (const key of Object.keys(pins)) {
    const p = pins[key];
    const start = PINS[key].pin;
    const k = range(t, start, start + 0.9);
    const grow = ease.outCubic(range(t, start + 0.15, start + 1.0));
    p.beamMat.uniforms.uGrow.value = grow;
    p.beamMat.uniforms.uGain.value = gain * (key === "home" ? 1.0 : 0.75);
    p.ringMat.uniforms.uT.value = Math.max(0, t - start);
    p.ringMat.uniforms.uGain.value = ease.outCubic(k) * gain * (key === "home" ? 1.0 : 0.7);
    p.head.position.y = PINS.labelHeight * grow;
    p.head.material.opacity = clamp(grow * 3) * gain;
    p.head.visible = grow > 0.001;
  }
}

/** Ponto 3D de ancoragem da etiqueta de cada pino. */
export function labelAnchor(key) {
  const [gx, gz] = POIS[key].at;
  return new THREE.Vector3(gx * P, PINS.labelHeight, gz * P);
}
