// Iluminação: luar com sombras, preenchimento ambiente e contraluz do horizonte.
// A sombra acompanha o ponto para onde a câmera olha (determinístico: depende só de t).
import * as THREE from "three";
import { LIGHT } from "../config.js";

export function createLights(scene) {
  const hemi = new THREE.HemisphereLight(0xc9d2de, 0x050506, LIGHT.ambient);
  scene.add(hemi);

  const moon = new THREE.DirectionalLight(0xe6ebf2, LIGHT.moon.intensity);
  moon.castShadow = true;
  moon.shadow.mapSize.set(LIGHT.moon.shadowMapSize, LIGHT.moon.shadowMapSize);
  moon.shadow.bias = -0.0004;
  moon.shadow.normalBias = 0.6;
  moon.shadow.radius = 3;
  const sc = moon.shadow.camera;
  sc.near = 10;
  sc.far = 2400;
  scene.add(moon, moon.target);

  // Contraluz: vem de trás do horizonte (norte), desenha a silhueta dos prédios na abertura.
  const rim = new THREE.DirectionalLight(LIGHT.rim.color, LIGHT.rim.intensity);
  rim.position.set(80, 60, -1000);
  rim.target.position.set(0, 0, 0);
  scene.add(rim, rim.target);

  return { hemi, moon, rim };
}

/**
 * @param focus alvo da câmera (Vector3) — centro da caixa de sombra
 * @param span  meia-largura da caixa de sombra (m), maior quando a câmera está longe
 */
export function updateLights(lights, { focus, span, rim, ambient, moon }) {
  const d = new THREE.Vector3(...LIGHT.moon.dir).normalize();
  // Encaixa o centro da caixa de sombra na grade de texels do mapa de sombra:
  // sem isso as bordas das sombras "nadam" quando a câmera anda.
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), d).normalize();
  const up = new THREE.Vector3().crossVectors(d, right).normalize();
  const texel = (2 * span) / LIGHT.moon.shadowMapSize;
  const snap = (v) => Math.round(v / texel) * texel;
  const fr = snap(focus.dot(right)), fu = snap(focus.dot(up)), fd = focus.dot(d);
  focus = new THREE.Vector3().addScaledVector(right, fr).addScaledVector(up, fu).addScaledVector(d, fd);
  lights.moon.position.copy(focus).addScaledVector(d, 1200);
  lights.moon.target.position.copy(focus);
  lights.moon.target.updateMatrixWorld();
  const sc = lights.moon.shadow.camera;
  sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span;
  sc.updateProjectionMatrix();
  lights.moon.intensity = LIGHT.moon.intensity * moon;
  lights.rim.intensity = LIGHT.rim.intensity * rim;
  lights.hemi.intensity = LIGHT.ambient * ambient;
}
