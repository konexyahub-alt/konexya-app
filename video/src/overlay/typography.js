// Tipografia editorial: cada linha entra por uma máscara (desliza de baixo para dentro do recorte)
// e sai pelo mesmo recorte para cima. Tudo em função de t.
import { TYPE, TEXTS } from "../../config.js";
import { range, easeEditorial, ease, clamp } from "../math.js";
import { drawText } from "./text.js";

function lineState(t, block, i) {
  const a = block.in + i * TYPE.stagger;
  const kIn = easeEditorial(range(t, a, a + TYPE.revealDur));
  const b = block.out + i * TYPE.stagger * 0.6;
  const kOut = ease.inCubic(range(t, b, b + TYPE.exitDur));
  return { kIn, kOut, visible: t >= a && t <= b + TYPE.exitDur };
}

/** Linha mascarada: o texto só existe dentro da faixa [top, top+h]. */
function maskedLine(ctx, t, block, i, top, h, draw) {
  const { kIn, kOut, visible } = lineState(t, block, i);
  if (!visible) return;
  const dy = (1 - kIn) * h * 1.05 - kOut * h * 1.05;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top - h * 0.12, 1080, h * 1.3);
  ctx.clip();
  draw(dy, clamp(kIn * 1.4) * (1 - kOut * 0.6), kIn);
  ctx.restore();
}

/** Intensidade do véu escuro no topo (legibilidade) — máximo das entradas ativas. */
export function textPresence(t) {
  let v = 0;
  for (const b of TEXTS) {
    const k = ease.inOutSine(range(t, b.in - 0.3, b.in + 0.4)) * (1 - ease.inOutSine(range(t, b.out, b.out + 0.8)));
    v = Math.max(v, k);
  }
  return v;
}

export function drawTypography(ctx, t) {
  // Véu: gradiente preto no topo, só enquanto há texto.
  const p = textPresence(t);
  if (p > 0) {
    const g = ctx.createLinearGradient(0, 0, 0, 980);
    g.addColorStop(0, `rgba(0,0,0,${0.78 * p})`);
    g.addColorStop(0.55, `rgba(0,0,0,${0.42 * p})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1080, 980);
  }
  const x = TYPE.x;
  for (const block of TEXTS) {
    if (t < block.in - 0.1 || t > block.out + 2) continue;
    if (block.lines) {
      const s = TYPE.headline.size;
      const lh = s * TYPE.headline.lineHeight;
      block.lines.forEach((line, i) => {
        const top = TYPE.top + i * lh;
        maskedLine(ctx, t, block, i, top, lh, (dy, alpha, kIn) => {
          // Tracking fecha levemente durante a entrada (assentamento).
          const tr = TYPE.headline.tracking + (1 - kIn) * 0.03;
          drawText(ctx, line.text, x, top + s * 0.95 + dy, { size: s, weight: line.weight, tracking: tr, alpha });
        });
      });
    } else {
      // Bloco do Mapa Vivo: filete + sobretítulo, título e texto de apoio.
      const eb = TYPE.eyebrow;
      const { kIn: kLine, kOut } = lineState(t, block, 0);
      const lineW = 56 * kLine * (1 - kOut);
      if (lineW > 0.5) {
        ctx.fillStyle = `rgba(255,255,255,${0.9 * (1 - kOut)})`;
        ctx.fillRect(x, TYPE.top + 13, lineW, 2);
      }
      maskedLine(ctx, t, block, 0.6, TYPE.top, eb.size * 1.4, (dy, alpha) => {
        drawText(ctx, block.eyebrow, x + 76, TYPE.top + eb.size + dy, { size: eb.size, weight: 600, tracking: eb.tracking, alpha: alpha * 0.85 });
      });
      const ts = TYPE.title.size;
      const titleTop = TYPE.top + 54;
      maskedLine(ctx, t, block, 1.2, titleTop, ts * 1.12, (dy, alpha, kIn) => {
        drawText(ctx, block.title, x - 4, titleTop + ts * 0.92 + dy, { size: ts, weight: 600, tracking: TYPE.title.tracking + (1 - kIn) * 0.03, alpha });
      });
      const bs = TYPE.body.size;
      const blh = bs * TYPE.body.lineHeight;
      block.body.forEach((line, i) => {
        const top = titleTop + ts * 1.22 + i * blh;
        maskedLine(ctx, t, block, 2.2 + i, top, blh, (dy, alpha) => {
          drawText(ctx, line, x, top + bs * 0.98 + dy, { size: bs, weight: 300, tracking: TYPE.body.tracking, alpha: alpha * 0.82 });
        });
      });
    }
  }
}
