// Exporta os tempos da animação para o gerador de áudio (fonte única: config.js).
import { VIDEO, TEXTS, PINS, ROUTES, OUTRO } from "../config.js";
console.log(JSON.stringify({
  duration: VIDEO.duration,
  texts: TEXTS.map((b) => ({ in: b.in, out: b.out })),
  pins: Object.fromEntries(Object.entries(PINS).filter(([, v]) => v && v.pin !== undefined).map(([k, v]) => [k, v])),
  routes: { work: ROUTES.work.draw, gym: ROUTES.gym.draw, pulses: ROUTES.pulses.start },
  outro: OUTRO,
}));
