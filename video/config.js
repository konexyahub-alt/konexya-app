// Configuração central do vídeo. Tudo que se ajusta com frequência mora aqui.
// Unidades do mundo 3D: metros aproximados. Eixos: x = leste, y = altura, z = sul (câmera começa ao sul).
// Tempos em segundos (t = quadro / 30). Nada aqui depende de relógio ou aleatoriedade sem semente.

export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
  duration: 16,
  get frames() {
    return Math.round(this.fps * this.duration);
  },
  // Prévia: resolução reduzida e um a cada N quadros (os quadros pulados são repetidos no MP4).
  preview: { scale: 0.5, step: 2 },
  // Qualidade da codificação final (H.264). CRF menor = mais qualidade.
  crf: 16,
  ss: 1, // superamostragem da renderização final (2 = 4x mais pixels, bordas mais limpas, ~4x mais lento)
  seed: 20261121,
};

// Área segura do Reels (px em 1080x1920): a interface do Instagram cobre o topo e a base.
export const SAFE = { top: 250, bottom: 420, side: 90 };

// ---------------------------------------------------------------------------------------------
// Cidade
// ---------------------------------------------------------------------------------------------
export const CITY = {
  block: 40, // lado da quadra
  street: 12, // largura da rua
  gridX: [-11, 11], // quadras de oeste a leste (inclusive)
  gridZ: [-17, 6], // quadras de norte a sul (inclusive)
  downtown: { gx: 1.5, gz: -6.5, radius: 6.5 }, // centro comercial (prédios altos)
  heights: {
    residentialMin: 10,
    residentialMax: 46,
    towerMax: 190,
    towerChance: 0.22, // chance de torre perto do centro
  },
  heightScale: 1.0, // escala global das alturas
  windowLitRatio: 0.12, // fração de janelas acesas
  windowIntensity: 0.95,
  emptyLotChance: 0.06, // praças e lotes vazios
};

// Pitch da malha: centro da rua i+0.5 em unidades de grade.
export const GRID_PITCH = CITY.block + CITY.street;

// ---------------------------------------------------------------------------------------------
// Pontos de interesse e rotas (em unidades de grade: inteiro = centro da quadra, x.5 = rua)
// ---------------------------------------------------------------------------------------------
export const POIS = {
  home: { at: [0, -0.5], building: [0, 0], label: "Apartamento", detail: "2 quartos" },
  gym: { at: [-0.5, -2], building: [-1, -2], label: "Academia", detail: "5 min" },
  work: { at: [1, -3.5], building: [1, -4], label: "Trabalho", detail: "12 min" },
};

export const ROUTES = {
  gym: {
    points: [[0, -0.5], [-0.5, -0.5], [-0.5, -2]],
    draw: [5.6, 7.2], // início e fim do desenho (s)
  },
  work: {
    points: [[0, -0.5], [0.5, -0.5], [0.5, -1.5], [1.5, -1.5], [1.5, -3.5], [1, -3.5]],
    draw: [4.1, 6.9],
  },
  width: 2.6,
  xray: 0.32, // intensidade da rota quando passa atrás de prédios
  cornerRadius: 9,
  glow: 2.4,
  // Pulsos que percorrem as rotas no Mapa Vivo (o "trajeto do dia" acontecendo).
  pulses: { start: 7.6, speed: 0.22, count: 2 },
};

// Quando cada pino aparece (s) e quando a etiqueta se abre.
export const PINS = {
  home: { pin: 3.7, label: 7.7, side: -1 }, // side: 1 = etiqueta à direita do pino, -1 = à esquerda
  gym: { pin: 7.1, label: 8.5, side: -1 },
  work: { pin: 6.8, label: 9.3, side: 1 },
  labelsOut: [12.2, 12.8],
  label: { size: 31, height: 70, pad: 28, gap: 18, refDistance: 520 },
  labelHeight: 34, // altura da âncora da etiqueta acima do chão (m)
};

// ---------------------------------------------------------------------------------------------
// Câmera: quadros-chave interpolados por spline cúbica (velocidade contínua, sem paradas).
// pos e target em metros; fov vertical em graus.
// ---------------------------------------------------------------------------------------------
export const CAMERA = {
  keys: [
    { t: 0.0, pos: [-40, 62, 560], target: [20, 58, -420], fov: 30 },
    { t: 2.8, pos: [-55, 150, 440], target: [15, 22, -250], fov: 33 },
    { t: 5.2, pos: [-110, 360, 320], target: [16, 0, -130], fov: 37 },
    { t: 7.6, pos: [-46, 470, 190], target: [20, 0, -138], fov: 38 },
    { t: 10.6, pos: [-57, 420, 195], target: [20, 0, -146], fov: 38 },
    { t: 12.8, pos: [-20, 900, 330], target: [8, 0, -70], fov: 38 },
    { t: 16.0, pos: [0, 1500, 310], target: [0, 0, -26], fov: 38 },
  ],
  roll: [ // inclinação lateral sutil (graus)
    { t: 0, v: -1.2 }, { t: 5, v: 0.8 }, { t: 10, v: -0.4 }, { t: 16, v: 0 },
  ],
  near: 1,
  far: 4000,
};

// ---------------------------------------------------------------------------------------------
// Luz, atmosfera e acabamento
// ---------------------------------------------------------------------------------------------
export const LIGHT = {
  exposure: 1.0,
  moon: { intensity: 2.2, dir: [-0.55, 0.62, -0.56], shadowMapSize: 4096, shadowSpan: 520 },
  ambient: 0.16,
  rim: { intensity: 2.2, color: 0xdfe5ee }, // contraluz do horizonte na abertura
  horizonGlow: 0.22,
  fogDensity: 0.00125,
  // Revelação da cidade na abertura (0 = escuro, 1 = cheia).
  reveal: [0.0, 1.8],
};

export const POST = {
  bloom: { strength: 0.6, radius: 0.5, threshold: 0.78 },
  dof: { maxBlur: 7.0, focusRange: 0.42 }, // desfoque em px a 1080p, faixa de foco relativa
  grain: 0.035,
  vignette: 0.42,
  msaa: 4,
};

// ---------------------------------------------------------------------------------------------
// Tipografia (Montserrat). Tamanhos em px na resolução final.
// ---------------------------------------------------------------------------------------------
export const TYPE = {
  family: "Montserrat",
  x: 96, // margem esquerda do bloco de texto
  top: 330, // topo do bloco de texto
  headline: { size: 76, lineHeight: 1.12, tracking: -0.015 },
  title: { size: 118, tracking: -0.025 },
  body: { size: 40, lineHeight: 1.35, tracking: 0.0 },
  eyebrow: { size: 22, tracking: 0.32 },
  revealDur: 0.75, // duração da revelação de cada linha
  stagger: 0.12, // atraso entre linhas
  exitDur: 0.5,
};

export const TEXTS = [
  {
    id: "s1",
    in: 0.55,
    out: 2.75,
    lines: [
      { text: "Você não procura", weight: 300 },
      { text: "só um imóvel.", weight: 600 },
    ],
  },
  {
    id: "s2",
    in: 3.35,
    out: 6.7,
    lines: [
      { text: "Procura onde", weight: 300 },
      { text: "sua rotina cabe.", weight: 600 },
    ],
  },
  {
    id: "s3",
    in: 7.35,
    out: 12.0,
    eyebrow: "KONEXYA",
    title: "Mapa Vivo",
    body: ["O trajeto do seu dia,", "antes da primeira visita."],
  },
];

// ---------------------------------------------------------------------------------------------
// Encerramento e marca
// ---------------------------------------------------------------------------------------------
export const OUTRO = {
  cityFade: [11.9, 13.3], // as luzes da cidade se apagam de fora para dentro
  dotToMark: [13.0, 13.9], // o ponto do imóvel viaja até o centro e vira o Y
  wordmark: [13.75, 14.6],
  slogan: [14.35, 15.0],
  slogan_text: "Você conversa. A Konexya encontra.",
  markHeight: 170, // altura do Y em px
  wordmarkWidth: 430,
  centerY: 900, // centro vertical da assinatura
  drift: 0.018, // leve aproximação contínua na assinatura
};
