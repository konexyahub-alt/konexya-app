// Linha do tempo global: todos os "botões" de cena (revelação, mapa, destaque, apagar das luzes)
// calculados a partir de t. Uma função pura: mesmo t, mesmo estado.
import { LIGHT, OUTRO, PINS } from "../config.js";
import { range, ease, lerp, smoothstep } from "./math.js";

export function timeline(t) {
  // Abertura: a cidade acende do escuro.
  const reveal = ease.inOutSine(range(t, LIGHT.reveal[0], LIGHT.reveal[1]));
  // Contraluz do horizonte forte no início, some quando a câmera sobe.
  const rim = lerp(1, 0.15, smoothstep(2.0, 5.5, t));
  const skyGlow = LIGHT.horizonGlow * (0.25 + 0.75 * reveal) * lerp(1, 0.35, smoothstep(2.5, 6, t));
  // Malha do mapa desenhada a partir do imóvel (raio em metros).
  const map = lerp(0, 1500, ease.inOutCubic(range(t, 3.4, 7.8)));
  // Destaque dos prédios de cada ponto.
  const tagHome = ease.outCubic(range(t, PINS.home.pin, PINS.home.pin + 1.2));
  const tagGym = ease.outCubic(range(t, PINS.gym.pin, PINS.gym.pin + 1));
  const tagWork = ease.outCubic(range(t, PINS.work.pin, PINS.work.pin + 1));
  // Encerramento: luzes se apagam de fora para dentro em volta do imóvel.
  const out = ease.inCubic(range(t, OUTRO.cityFade[0], OUTRO.cityFade[1]));
  const fadeRadius = lerp(1800, 40, out);
  // Fade final da imagem 3D (a marca entra por cima, no overlay).
  const fade = ease.inOutCubic(range(t, 12.75, 13.55));
  const routesGain = 1 - ease.inOutCubic(range(t, 12.5, 13.4));
  // Exposição: começa no escuro e respira levemente no Mapa Vivo.
  const exposure = lerp(0.45, 1, ease.inOutSine(range(t, 0, 1.4))) * (1 + 0.08 * smoothstep(7, 8.5, t) * (1 - smoothstep(11, 12.5, t)));
  const bloomGain = 1 + 0.25 * smoothstep(6.8, 7.6, t) * (1 - smoothstep(11.5, 12.8, t));
  return {
    reveal, rim, skyGlow, map, fadeRadius, fade, routesGain, exposure, bloomGain,
    tags: [tagHome * (1 - out * 0.6), tagGym * (1 - out), tagWork * (1 - out)],
    moon: lerp(0.55, 1, reveal),
    ambient: lerp(0.4, 1, reveal),
  };
}
