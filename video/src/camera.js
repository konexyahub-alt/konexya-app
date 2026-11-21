// Câmera: um único movimento contínuo, função só de t.
//
// Os quadros-chave (config.js) definem a FORMA do caminho (posição e alvo), não os tempos.
// O tempo é distribuído pelo "custo percebido" de cada trecho (deslocamento ÷ altura da câmera +
// giro do olhar), e percorrido com uma única curva de velocidade: acelera no início, velocidade
// constante no meio, desacelera no fim. Assim a velocidade não oscila entre um trecho e outro.
import * as THREE from "three";
import { CAMERA, VIDEO } from "../config.js";
import { clamp, sampleKeys } from "./math.js";

export function createCamera() {
  return new THREE.PerspectiveCamera(CAMERA.keys[0].fov, VIDEO.width / VIDEO.height, CAMERA.near, CAMERA.far);
}

const V = (a) => new THREE.Vector3(...a);
const posCurve = new THREE.CatmullRomCurve3(CAMERA.keys.map((k) => V(k.pos)), false, "centripetal");
const tgtCurve = new THREE.CatmullRomCurve3(CAMERA.keys.map((k) => V(k.target)), false, "centripetal");
const N = CAMERA.keys.length;

// Tabela de custo percebido ao longo do parâmetro u (amostragem fina).
const STEPS = 2000;
const cost = new Float64Array(STEPS + 1);
{
  let prevP = posCurve.getPoint(0), prevT = tgtCurve.getPoint(0);
  let prevDir = prevT.clone().sub(prevP).normalize();
  for (let i = 1; i <= STEPS; i++) {
    const u = i / STEPS;
    const p = posCurve.getPoint(u), tg = tgtCurve.getPoint(u);
    const dir = tg.clone().sub(p).normalize();
    const h = Math.max(40, (p.y + prevP.y) / 2);
    const c = p.distanceTo(prevP) / h + dir.angleTo(prevDir) * CAMERA.turnWeight;
    cost[i] = cost[i - 1] + c;
    prevP = p; prevDir = dir;
  }
  for (let i = 0; i <= STEPS; i++) cost[i] /= cost[STEPS];
}

/** Fração do custo total → parâmetro u da curva (busca binária na tabela). */
function uFromProgress(e) {
  let lo = 0, hi = STEPS;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (cost[m] < e) lo = m; else hi = m;
  }
  const span = cost[hi] - cost[lo] || 1;
  return (lo + (e - cost[lo]) / span) / STEPS;
}

/** Perfil de velocidade: rampa suave de `ramp` s nas pontas, constante no meio. */
function progress(t) {
  const T = CAMERA.travelEnd, r = CAMERA.ramp;
  const x = clamp(t, 0, T);
  // Velocidade v(t): sobe em seno de 0 a 1 em [0,r], 1 no meio, desce em [T-r,T]. Integral normalizada.
  const area = T - r; // integral de v em [0,T]
  const up = (s) => (s - (r / Math.PI) * Math.sin((Math.PI * s) / r)) / 2; // integral da rampa senoidal
  let a;
  if (x <= r) a = up(x);
  else if (x <= T - r) a = up(r) + (x - r);
  else a = up(r) + (T - 2 * r) + (up(r) - up(T - x));
  return clamp(a / area);
}

/** Estado da câmera em t (puro). */
export function cameraState(t) {
  const u = uFromProgress(progress(t));
  const p = posCurve.getPoint(u), tg = tgtCurve.getPoint(u);
  // Depois do percurso: aproximação lenta e contínua (o Y vira a marca).
  const d = CAMERA.drift;
  const k = clamp((t - CAMERA.travelEnd) / (VIDEO.duration - CAMERA.travelEnd));
  const kk = k * k * (3 - 2 * k);
  p.addScaledVector(V(d.pos), kk);
  tg.addScaledVector(V(d.target), kk);
  const fi = u * (N - 1);
  const [fov] = sampleKeys(CAMERA.keys.map((key, i) => ({ t: i, fov: key.fov })), fi, (key) => [key.fov]);
  const [roll] = sampleKeys(CAMERA.roll, t, (key) => [key.v]);
  return { pos: p.toArray(), target: tg.toArray(), fov, roll };
}

export function applyCamera(cam, t) {
  const s = cameraState(t);
  cam.position.set(...s.pos);
  cam.up.set(0, 1, 0);
  cam.lookAt(new THREE.Vector3(...s.target));
  cam.rotateZ(THREE.MathUtils.degToRad(s.roll));
  cam.fov = s.fov;
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
  return s;
}
