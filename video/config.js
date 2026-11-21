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
  preview: { scale: 0.5, step: 1 }, // step 1 = todos os 30 quadros por segundo (prévia fluida)
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
  // Malha real: data/city.json (gerado por data/build_city.py a partir do OpenStreetMap).
  heightScale: 1.0, // escala global das alturas reais
  windowLitRatio: 0.2, // fração de janelas acesas
  windowIntensity: 1.5,
};

export const TRAFFIC = { cars: 1100 }; // faróis circulando nas avenidas

// ---------------------------------------------------------------------------------------------
// Pontos de interesse (lugares escolhidos em data/build_city.py) e rotas reais pelas ruas
// ---------------------------------------------------------------------------------------------
export const POIS = {
  home: { label: "Apartamento", detail: "2 quartos" },
  work: { label: "Trabalho", detail: "12 min" },
  gym: { label: "Academia", detail: "5 min" },
};

export const ROUTES = {
  work: { draw: [7.5, 9.1] }, // início e fim do desenho (s)
  gym: { draw: [9.8, 10.9] },
  width: 3.0,
  cornerRadius: 10,
  // Pulsos que percorrem as rotas depois de desenhadas (o "trajeto do dia" acontecendo).
  pulses: { start: 11.0, speed: 0.35, count: 2 },
};

// Quando cada pino aparece (s) e quando a etiqueta se abre.
export const PINS = {
  home: { pin: 4.0, label: 4.7, side: 1 }, // side: 1 = etiqueta à direita do pino, -1 = à esquerda
  work: { pin: 8.7, label: 9.0, side: 1 },
  gym: { pin: 10.5, label: 11.0, side: -1 },
  labelsOut: [12.2, 12.8],
  label: { size: 31, height: 70, pad: 28, gap: 18, refDistance: 520 },
  labelHeight: 30, // altura da âncora da etiqueta acima do topo do prédio (m)
};

// ---------------------------------------------------------------------------------------------
// Câmera: quadros-chave interpolados por spline cúbica (velocidade contínua, sem paradas).
// pos e target em metros; fov vertical em graus.
// ---------------------------------------------------------------------------------------------
export const CAMERA = {
  keys: [
    { t: 0.0, pos: [-330, 28, -1180], target: [-240, 75, -350], fov: 34 }, // sobre o mar, olhando a orla
    { t: 2.8, pos: [-460, 200, -980], target: [-170, 50, -260], fov: 35 }, // sobe em direção à Beira-Mar
    { t: 5.4, pos: [-577, 542, -497], target: [12, 0, -85], fov: 36 }, // a torre da casa em foco
    { t: 7.6, pos: [-760, 900, -420], target: [150, 0, -60], fov: 40 },
    { t: 9.3, pos: [-1008, 1506, -335], target: [275, 0, -46], fov: 44 }, // casa → trabalho
    { t: 11.6, pos: [-1000, 3400, 150], target: [40, 0, -132], fov: 44 }, // o mapa do dia inteiro
    { t: 16.0, pos: [-900, 4600, 50], target: [-208, 0, -234], fov: 44 },
  ],
  roll: [ // inclinação lateral sutil (graus)
    { t: 0, v: -1.2 }, { t: 5, v: 0.8 }, { t: 10, v: -0.4 }, { t: 16, v: 0 },
  ],
  near: 8,
  far: 9000,
};

// ---------------------------------------------------------------------------------------------
// Luz, atmosfera e acabamento
// ---------------------------------------------------------------------------------------------
export const LIGHT = {
  exposure: 1.0,
  moon: { intensity: 3.0, dir: [-0.55, 0.62, -0.56], shadowMapSize: 4096, shadowSpan: 520 },
  ambient: 0.45,
  rim: { intensity: 2.2, color: 0xdfe5ee }, // contraluz do horizonte na abertura
  horizonGlow: 0.22,
  fogDensity: 0.00032,
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
  credit: "Mapa: Fortaleza · © colaboradores do OpenStreetMap",
  markHeight: 170, // altura do Y em px
  wordmarkWidth: 430,
  centerY: 900, // centro vertical da assinatura
  drift: 0.018, // leve aproximação contínua na assinatura
};
