// Ferramenta de ajuste: imprime onde cada pino cai na tela (px de 1080x1920) ao longo do tempo.
// Uso: node render/probe.js [t1,t2,...]
import * as THREE from "three";
import { applyCamera, createCamera } from "../src/camera.js";
import fs from "node:fs";
import { labelAnchor, setRouteData } from "../src/routes.js";
setRouteData(JSON.parse(fs.readFileSync(new URL("../data/city.json", import.meta.url))));
const cam = createCamera();
const ts = (process.argv[2] || "3,5,7,8,9,10,11,12,13").split(",").map(Number);
for (const t of ts) {
  applyCamera(cam, t);
  const row = ["home", "gym", "work"].map((k) => {
    const v = labelAnchor(k).project(cam);
    return `${k} ${Math.round((v.x * 0.5 + 0.5) * 1080)},${Math.round((-v.y * 0.5 + 0.5) * 1920)}`;
  });
  console.log(`t=${t}`.padEnd(7), row.join("   "));
}
