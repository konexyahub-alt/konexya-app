// Monta a cena uma vez e expõe window.renderFrame(n): cada quadro é calculado só a partir de n.
import * as THREE from "three";
import { VIDEO, LIGHT, POIS, GRID_PITCH } from "../config.js";
import { createBuildings, createGround, createSky, cityUniforms, skyUniforms, FOG_COLOR } from "./city.js";
import { createCamera, applyCamera } from "./camera.js";
import { createLights, updateLights } from "./lighting.js";
import { createRoutes, updateRoutes, labelAnchor } from "./routes.js";
import { createPost } from "./post.js";
import { timeline } from "./transitions.js";
import { drawTypography } from "./overlay/typography.js";
import { drawLabels } from "./overlay/labels.js";
import { drawLogo, setBrand } from "./overlay/logo.js";

const params = new URLSearchParams(location.search);
const scale = Number(params.get("scale") || 1); // 0.5 = prévia
const ss = Number(params.get("ss") || 1); // superamostragem
const W = Math.round(VIDEO.width * scale), H = Math.round(VIDEO.height * scale);

const glCanvas = document.getElementById("gl");
const ovCanvas = document.getElementById("overlay");
for (const c of [glCanvas, ovCanvas]) {
  c.style.width = `${W}px`;
  c.style.height = `${H}px`;
}
document.body.style.width = `${W}px`;
document.body.style.height = `${H}px`;

const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(ss);
renderer.setSize(W, H, false);
glCanvas.width = W * ss;
glCanvas.height = H * ss;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = true;

ovCanvas.width = W * ss;
ovCanvas.height = H * ss;
const ctx = ovCanvas.getContext("2d");

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(FOG_COLOR, LIGHT.fogDensity);
scene.background = null;
scene.add(createSky());
scene.add(createGround());
const buildings = createBuildings();
scene.add(buildings);
const camera = createCamera();
camera.aspect = W / H;
const lights = createLights(scene);
const routeSet = createRoutes(scene);
const post = createPost(renderer, W * ss, H * ss);

const v = new THREE.Vector3();
function toScreen(p) {
  v.copy(p).project(camera);
  const dist = camera.position.distanceTo(p);
  return { x: (v.x * 0.5 + 0.5) * 1080, y: (-v.y * 0.5 + 0.5) * 1920, dist, visible: v.z < 1 && v.z > -1 };
}

async function init() {
  const weights = [300, 400, 500, 600, 700];
  await Promise.all(weights.map((w) => document.fonts.load(`${w} 40px Montserrat`, "Você é ãç·")));
  const brand = await (await fetch("/brand.json")).json();
  setBrand(brand);
  // Compila shaders e cria os mapas de sombra antes do primeiro quadro.
  renderer.compile(scene, camera);
  window.__ready = true;
}

/** Renderiza o quadro n. Não guarda estado entre chamadas: a ordem dos quadros não importa. */
window.renderFrame = (n) => {
  const t = n / VIDEO.fps;
  const tl = timeline(t);
  const cam = applyCamera(camera, t);

  cityUniforms.uReveal.value = tl.reveal;
  cityUniforms.uMap.value = tl.map;
  cityUniforms.uFadeRadius.value = tl.fadeRadius;
  cityUniforms.uTagGlow.value.set(...tl.tags);
  skyUniforms.uGlow.value = tl.skyGlow;

  const focus = new THREE.Vector3(...cam.target);
  updateLights(lights, { focus, span: LIGHT.moon.shadowSpan, rim: tl.rim, ambient: tl.ambient, moon: tl.moon });
  updateRoutes(routeSet, t, tl.routesGain);

  const focusDist = camera.position.distanceTo(focus);
  post.render(scene, camera, { focus: focusDist, exposure: tl.exposure, fade: tl.fade, frame: n, bloomGain: tl.bloomGain });

  // Overlay 2D em espaço de design 1080x1920.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ovCanvas.width, ovCanvas.height);
  ctx.setTransform(ovCanvas.width / 1080, 0, 0, ovCanvas.height / 1920, 0, 0);
  drawTypography(ctx, t);
  drawLabels(ctx, t, (key) => toScreen(labelAnchor(key)));
  drawLogo(ctx, t, toScreen(labelAnchor("home")));
  // Garante que a GPU terminou antes da captura.
  renderer.getContext().finish();
  return { t };
};

window.debugInfo = () => ({ buildings: buildings.count, W, H, ss, POIS, GRID_PITCH });
init();
