// Assinatura: o último ponto aceso da cidade (o imóvel) viaja até o centro e vira o Y.
// Os vetores do logo vêm sem alteração de src/components/ui/brand-assets.ts.
import { OUTRO } from "../../config.js";
import { range, ease, easeEditorial, lerp, clamp } from "../math.js";
import { drawText } from "./text.js";

let brand = null;
let paths = null;
let scratch = null;

export function setBrand(b) {
  brand = b;
  paths = { y: new Path2D(b.yMark.path), word: new Path2D(b.wordmark.path) };
}

function layout() {
  const yH = OUTRO.markHeight;
  const yW = (yH * brand.yMark.width) / brand.yMark.height;
  const wW = OUTRO.wordmarkWidth;
  const wH = (wW * brand.wordmark.height) / brand.wordmark.width;
  const gap1 = 54, gap2 = 62, sloganSize = 30;
  const total = yH + gap1 + wH + gap2 + sloganSize;
  const top = OUTRO.centerY - total / 2;
  return {
    y: { x: 540 - yW / 2, y: top, w: yW, h: yH },
    word: { x: 540 - wW / 2, y: top + yH + gap1, w: wW, h: wH },
    slogan: { y: top + yH + gap1 + wH + gap2 + sloganSize * 0.8, size: sloganSize },
  };
}

function fillPath(ctx, path, box, src) {
  ctx.save();
  ctx.translate(box.x, box.y);
  ctx.scale(box.w / src.width, box.h / src.height);
  ctx.fill(path, "evenodd");
  ctx.restore();
}

// Linhas centrais dos três traços do Y oficial (coordenadas do desenho, 581 × 838),
// todas partindo do cruzamento. Medidas sobre o contorno de brand-assets.ts.
const Y_CENTER = {
  stem: [[272, 330], [271, 450], [270, 580], [268, 700], [264, 822]],
  right: [[272, 330], [300, 290], [370, 200], [470, 112], [560, 42]],
  left: [[272, 330], [236, 285], [200, 240], [120, 122], [30, 46]],
};
const N = 72;

/** Reamostra uma polilinha em N pontos igualmente espaçados. */
function resample(pts, n = N) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[cum.length - 1] || 1;
  const out = [];
  let k = 1;
  for (let i = 0; i < n; i++) {
    const s = (i / (n - 1)) * L;
    while (k < pts.length - 1 && cum[k] < s) k++;
    const f = (s - cum[k - 1]) / (cum[k] - cum[k - 1] || 1);
    out.push([pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * f, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * f]);
  }
  return out;
}

function strokePath(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

/**
 * @param branches ramos do trajeto já projetados na tela ({stem, work, gym}: [[x,y], ...]),
 *                 todos partindo do cruzamento; null fora da janela da transição.
 * @param workRight true se o trabalho é o braço direito do Y
 */
export function drawLogo(ctx, t, branches, workRight = true) {
  if (!brand || t < OUTRO.handoff[0]) return;
  const L = layout();
  const drift = 1 + OUTRO.drift * ease.inOutSine(range(t, OUTRO.fill[1], 16));
  ctx.save();
  ctx.translate(540, OUTRO.centerY);
  ctx.scale(drift, drift);
  ctx.translate(-540, -OUTRO.centerY);

  // 1. O trajeto vira o símbolo: cada ponto da rota desliza até a linha central do Y.
  const kIn = ease.inOutCubic(range(t, OUTRO.handoff[0], OUTRO.handoff[1]));
  const km = ease.inOutCubic(range(t, OUTRO.morph[0], OUTRO.morph[1]));
  const kOut = ease.inOutCubic(range(t, OUTRO.fill[0], OUTRO.fill[1]));
  if (branches && kIn > 0 && kOut < 1) {
    const sx = L.y.w / brand.yMark.width, sy = L.y.h / brand.yMark.height;
    const toLogo = (p) => [L.y.x + p[0] * sx, L.y.y + p[1] * sy];
    const pairs = [
      [branches.stem, Y_CENTER.stem],
      [workRight ? branches.work : branches.gym, Y_CENTER.right],
      [workRight ? branches.gym : branches.work, Y_CENTER.left],
    ];
    const width = lerp(3.2, 15 * sx * 1.0, km); // espessura média dos traços do Y
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = `rgba(255,255,255,${kIn * (1 - kOut)})`;
    ctx.shadowColor = "rgba(255,255,255,0.85)";
    ctx.shadowBlur = lerp(14, 4, km);
    for (const [route, target] of pairs) {
      const a = resample(route), b = resample(target.map(toLogo));
      const pts = a.map((p, i) => [lerp(p[0], b[i][0], km), lerp(p[1], b[i][1], km)]);
      // As pontas afinam como no pincel do símbolo: traço em segmentos de largura decrescente.
      for (let i = 1; i < pts.length; i++) {
        const taper = lerp(1, 1 - 0.55 * (i / pts.length), km);
        ctx.lineWidth = width * taper;
        ctx.beginPath();
        ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
        ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 2. O símbolo oficial assume (preenchido, sem alteração do desenho).
  if (kOut > 0) {
    ctx.save();
    ctx.globalAlpha = kOut;
    ctx.fillStyle = "#fff";
    fillPath(ctx, paths.y, L.y, brand.yMark);
    ctx.restore();
  }

  // 3. Wordmark: abre do centro para fora.
  const kw = easeEditorial(range(t, OUTRO.wordmark[0], OUTRO.wordmark[1]));
  if (kw > 0) {
    ctx.save();
    const half = (L.word.w / 2 + 8) * kw;
    ctx.beginPath();
    ctx.rect(540 - half, L.word.y - 20, half * 2, L.word.h + 40);
    ctx.clip();
    ctx.globalAlpha = clamp(kw * 1.5);
    ctx.fillStyle = "#fff";
    fillPath(ctx, paths.word, { ...L.word, y: L.word.y + (1 - kw) * 10 }, brand.wordmark);
    ctx.restore();
  }

  // 4. Slogan.
  const ks = easeEditorial(range(t, OUTRO.slogan[0], OUTRO.slogan[1]));
  if (ks > 0) {
    drawText(ctx, OUTRO.slogan_text, 540, L.slogan.y + (1 - ks) * 14, {
      size: L.slogan.size, weight: 400, tracking: 0.02, color: "#fff", alpha: ks * 0.72, align: "center",
    });
  }

  // Crédito obrigatório dos dados do mapa (licença ODbL do OpenStreetMap).
  const kc = ease.inOutSine(range(t, OUTRO.slogan[1], OUTRO.slogan[1] + 0.6));
  if (kc > 0) {
    drawText(ctx, OUTRO.credit, 540, 1440, { size: 19, weight: 400, tracking: 0.03, color: "#fff", alpha: 0.32 * kc, align: "center" });
  }

  // 5. Varredura de luz final sobre a marca (brilho que atravessa o Y e o wordmark).
  const kSweep = range(t, 14.9, 15.8);
  if (kSweep > 0 && kSweep < 1) {
    scratch ??= document.createElement("canvas");
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    if (scratch.width !== cw || scratch.height !== ch) { scratch.width = cw; scratch.height = ch; }
    const sx = scratch.getContext("2d");
    sx.setTransform(1, 0, 0, 1, 0, 0);
    sx.clearRect(0, 0, cw, ch);
    sx.setTransform(ctx.getTransform());
    sx.fillStyle = "#fff";
    fillPath(sx, paths.y, L.y, brand.yMark);
    fillPath(sx, paths.word, L.word, brand.wordmark);
    sx.globalCompositeOperation = "source-in";
    const e = ease.inOutSine(kSweep);
    const bx = lerp(L.word.x - 260, L.word.x + L.word.w + 260, e);
    const g = sx.createLinearGradient(bx - 120, L.y.y, bx + 120, L.word.y + L.word.h);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    sx.fillStyle = g;
    sx.fillRect(0, 0, 1080, 1920);
    sx.globalCompositeOperation = "source-over";
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    ctx.filter = "blur(9px)";
    ctx.drawImage(scratch, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}
