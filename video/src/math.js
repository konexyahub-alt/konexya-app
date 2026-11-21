// Funções puras de tempo, interpolação e ruído determinístico.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

/** Progresso 0..1 de t dentro de [a, b]. */
export const range = (t, a, b) => clamp((t - a) / (b - a));

export const smoothstep = (a, b, x) => {
  const k = clamp((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};
export const smootherstep = (k) => k * k * k * (k * (k * 6 - 15) + 10);

export const ease = {
  linear: (k) => k,
  inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  outCubic: (k) => 1 - Math.pow(1 - k, 3),
  inCubic: (k) => k * k * k,
  outQuart: (k) => 1 - Math.pow(1 - k, 4),
  outExpo: (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
  inOutSine: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
  // Curva Bézier cúbica (x1,y1,x2,y2) como em CSS, resolvida por Newton.
  bezier(x1, y1, x2, y2) {
    const bx = (s) => 3 * x1 * s * (1 - s) ** 2 + 3 * x2 * s * s * (1 - s) + s ** 3;
    const by = (s) => 3 * y1 * s * (1 - s) ** 2 + 3 * y2 * s * s * (1 - s) + s ** 3;
    const dx = (s) => 3 * x1 * (1 - s) ** 2 + 6 * (x2 - x1) * s * (1 - s) + 3 * (1 - x2) * s * s;
    return (k) => {
      if (k <= 0) return 0;
      if (k >= 1) return 1;
      let s = k;
      for (let i = 0; i < 8; i++) {
        const d = dx(s);
        if (Math.abs(d) < 1e-6) break;
        s = clamp(s - (bx(s) - k) / d);
      }
      return by(s);
    };
  },
};
// Curva editorial padrão para entradas de texto (rápida no início, assentamento longo).
export const easeEditorial = ease.bezier(0.16, 1, 0.3, 1);

/** Envelope de entrada e saída: 0 → 1 em [inA, inB], 1 → 0 em [outA, outB]. */
export function envelope(t, inA, inB, outA, outB, e = ease.inOutCubic) {
  return e(range(t, inA, inB)) * (1 - e(range(t, outA, outB)));
}

// ---------------------------------------------------------------------------------------------
// Ruído com semente fixa
// ---------------------------------------------------------------------------------------------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash 2D → [0,1), estável. */
export function hash2(x, y, seed = 0) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------------------------
// Spline cúbica de Hermite por quadros-chave (tangentes Catmull-Rom não uniformes).
// Garante velocidade contínua: a câmera nunca "para e arranca" entre quadros-chave.
// ---------------------------------------------------------------------------------------------
export function sampleKeys(keys, t, get) {
  const n = keys.length;
  if (t <= keys[0].t) return get(keys[0]);
  if (t >= keys[n - 1].t) return get(keys[n - 1]);
  let i = 0;
  while (i < n - 2 && t > keys[i + 1].t) i++;
  const k0 = keys[i], k1 = keys[i + 1];
  const v0 = get(k0), v1 = get(k1);
  const dt = k1.t - k0.t;
  const tangent = (j) => {
    // Pontas com velocidade zero (entrada e saída suaves).
    if (j === 0 || j === n - 1) return v0.map(() => 0);
    const a = keys[j - 1], b = keys[j + 1];
    const va = get(a), vb = get(b);
    return va.map((_, d) => (vb[d] - va[d]) / (b.t - a.t));
  };
  const m0 = tangent(i), m1 = tangent(i + 1);
  const s = (t - k0.t) / dt;
  const s2 = s * s, s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
  return v0.map((_, d) => h00 * v0[d] + h10 * dt * m0[d] + h01 * v1[d] + h11 * dt * m1[d]);
}
