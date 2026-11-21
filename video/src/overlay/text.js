// Utilitários de desenho de texto no overlay 2D (espaço de design 1080x1920).
import { TYPE } from "../../config.js";

export function font(ctx, size, weight) {
  ctx.font = `${weight} ${size}px ${TYPE.family}`;
}

/** Desenha uma linha com tracking (em "em"), retorna a largura. */
export function drawText(ctx, text, x, y, { size, weight = 400, tracking = 0, color = "#fff", alpha = 1, align = "left" }) {
  font(ctx, size, weight);
  ctx.letterSpacing = `${(tracking * size).toFixed(2)}px`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  const w = ctx.measureText(text).width;
  ctx.globalAlpha = 1;
  ctx.letterSpacing = "0px";
  return w;
}
