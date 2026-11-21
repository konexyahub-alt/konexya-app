// Câmera: posição, alvo, FOV e rolagem calculados só a partir de t (spline cúbica por quadros-chave).
import * as THREE from "three";
import { CAMERA, VIDEO } from "../config.js";
import { sampleKeys } from "./math.js";

export function createCamera() {
  const cam = new THREE.PerspectiveCamera(CAMERA.keys[0].fov, VIDEO.width / VIDEO.height, CAMERA.near, CAMERA.far);
  return cam;
}

/** Estado da câmera em t (puro, sem efeitos colaterais). */
export function cameraState(t) {
  const pos = sampleKeys(CAMERA.keys, t, (k) => k.pos);
  const target = sampleKeys(CAMERA.keys, t, (k) => k.target);
  const [fov] = sampleKeys(CAMERA.keys, t, (k) => [k.fov]);
  const [roll] = sampleKeys(CAMERA.roll, t, (k) => [k.v]);
  return { pos, target, fov, roll };
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
