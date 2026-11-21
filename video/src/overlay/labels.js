// Etiquetas dos pontos de interesse: presas ao topo do feixe 3D de cada pino (projeção da câmera),
// com escala leve pela distância — fazem parte do espaço, não ficam "coladas" na tela.
import { PINS, POIS, SAFE } from "../../config.js";
import { range, ease, easeEditorial, clamp } from "../math.js";
import { font } from "./text.js";

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** @param project (key) => {x, y, dist, visible} em px de design */
export function drawLabels(ctx, t, project) {
  const L = PINS.label;
  const out = 1 - ease.inOutCubic(range(t, PINS.labelsOut[0], PINS.labelsOut[1]));
  if (out <= 0) return;
  for (const key of Object.keys(POIS)) {
    const start = PINS[key].label;
    if (t < start) continue;
    const p = project(key);
    if (!p.visible) continue;
    const s = clamp(L.refDistance / p.dist, 0.82, 1.14);
    const kLine = ease.outCubic(range(t, start, start + 0.3));
    const kBox = easeEditorial(range(t, start + 0.18, start + 0.8));
    const kText = easeEditorial(range(t, start + 0.4, start + 1.0));

    const size = L.size * s, h = L.height * s, pad = L.pad * s, gap = L.gap * s;
    font(ctx, size, 600);
    const tMain = POIS[key].label;
    const wMain = ctx.measureText(tMain).width;
    font(ctx, size, 400);
    const tSep = "  ·  ";
    const wSep = ctx.measureText(tSep).width;
    const tDet = POIS[key].detail;
    const wDet = ctx.measureText(tDet).width;
    const dotR = 5 * s;
    const w = pad + dotR * 2 + 14 * s + wMain + wSep + wDet + pad;

    ctx.save();
    ctx.globalAlpha = out;
    // Filete vertical do topo do pino até a etiqueta (a etiqueta fica centrada acima).
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y - gap * kLine);
    ctx.stroke();

    if (kBox > 0) {
      // Mantém a cápsula dentro da área segura (desliza, sem cortar).
      const bx = clamp(p.x - w / 2, SAFE.side * 0.6, 1080 - SAFE.side * 0.6 - w);
      const by = p.y - gap - h;
      // Máscara que abre a cápsula do centro (onde está o pino) para os lados.
      ctx.save();
      const vw = w * kBox;
      const cx0 = clamp(p.x, bx, bx + w);
      ctx.beginPath();
      ctx.rect(cx0 - vw / 2 - 2 - Math.max(0, cx0 + vw / 2 - bx - w), by - 4, vw + 4, h + 8);
      ctx.clip();
      roundRect(ctx, bx, by, w, h, h / 2);
      ctx.fillStyle = "rgba(10,11,13,0.78)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.32)";
      ctx.lineWidth = 1.25 * s;
      ctx.stroke();
      // Conteúdo.
      const ta = clamp(kText * 1.3);
      const ty = by + h / 2 + size * 0.36 + (1 - kText) * 8 * s;
      let cx = bx + pad;
      ctx.globalAlpha = out * ta;
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "rgba(255,255,255,0.9)";
      ctx.shadowBlur = 8 * s;
      ctx.beginPath();
      ctx.arc(cx + dotR, by + h / 2, dotR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      cx += dotR * 2 + 14 * s;
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      font(ctx, size, 600);
      ctx.fillText(tMain, cx, ty);
      cx += wMain;
      font(ctx, size, 400);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText(tSep, cx, ty);
      cx += wSep;
      ctx.fillStyle = "rgba(255,255,255,0.86)";
      ctx.fillText(tDet, cx, ty);
      ctx.restore();
    }
    ctx.restore();
  }
}
