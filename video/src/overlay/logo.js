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

/** @param homeScreen posição em px de design do ponto do imóvel em t ({x,y}) */
export function drawLogo(ctx, t, homeScreen) {
  if (!brand || t < OUTRO.dotToMark[0]) return;
  const L = layout();
  const [d0, d1] = OUTRO.dotToMark;
  const drift = 1 + OUTRO.drift * ease.inOutSine(range(t, d1, 16));
  ctx.save();
  ctx.translate(540, OUTRO.centerY);
  ctx.scale(drift, drift);
  ctx.translate(-540, -OUTRO.centerY);

  // 1. Ponto de luz: sai do imóvel e sobe até o cruzamento do Y.
  const target = { x: 540, y: L.y.y + L.y.h * 0.43 };
  const km = ease.inOutCubic(range(t, d0, d1 - 0.15));
  const dotA = clamp(range(t, d0, d0 + 0.2)) * (1 - ease.inCubic(range(t, d1 - 0.25, d1 + 0.05)));
  if (dotA > 0) {
    const x = lerp(homeScreen.x, target.x, km), y = lerp(homeScreen.y, target.y, km);
    const r = lerp(5, 9, km);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 7);
    g.addColorStop(0, `rgba(255,255,255,${0.55 * dotA})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 7, y - r * 7, r * 14, r * 14);
    ctx.fillStyle = `rgba(255,255,255,${dotA})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. O Y nasce do ponto: escala, foco e máscara que sobe da base às hastes.
  const ky = easeEditorial(range(t, d1 - 0.35, d1 + 0.55));
  if (ky > 0) {
    ctx.save();
    const sc = lerp(0.86, 1, ky);
    ctx.translate(target.x, target.y);
    ctx.scale(sc, sc);
    ctx.translate(-target.x, -target.y);
    ctx.globalAlpha = clamp(ky * 1.6);
    const blur = (1 - ky) * 10;
    if (blur > 0.05) ctx.filter = `blur(${blur.toFixed(2)}px)`;
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
