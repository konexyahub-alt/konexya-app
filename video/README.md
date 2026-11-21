# Vídeo Konexya — Reels (1080×1920, 30 fps, 16 s, 480 quadros)

Animação 3D programática: cada quadro é uma função pura do número do quadro (`t = n / 30`).
Sem relógio, sem `Math.random`, sem física: o quadro 150 sai sempre igual, em qualquer ordem.

## Comandos (dentro de `video/`)

| Comando | O que faz |
|---|---|
| `npm install` | instala three.js e Montserrat (Playwright e FFmpeg já vêm no ambiente) |
| `npm run audio` | gera a trilha `out/audio.wav` (−14 LUFS) a partir dos tempos do `config.js` |
| `npm run preview` | prévia 540×960, 1 a cada 2 quadros → `out/preview.mp4` (~2 min) |
| `node render/render.js --preview --range 210-360` | refaz só esse trecho da prévia |
| `npm run frame -- 150` | um quadro em 1080×1920 → `out/frame_0150.png` |
| `node render/render.js --frame 90,150,300 --scale 0.5` | vários quadros soltos, em meia resolução |
| `npm run final` | 480 quadros em 1080×1920 → `konexya_final.mp4` (H.264, yuv420p, com áudio) |
| `node render/render.js --range 210-360` | refaz só um trecho do final e remonta o MP4 |
| `node render/render.js --encode` | só remonta o MP4 a partir de `out/frames` |
| `node render/probe.js 7,9,11` | mostra onde cada pino cai na tela (para ajustar a câmera) |

Opções: `--workers N` (navegadores em paralelo), `--ss 2` (superamostragem: bordas mais limpas, ~4× mais lento).

## Onde mexer

- **`config.js`** — tudo que se ajusta: quadros-chave da câmera, tempos de cada texto, pinos, rotas,
  alturas da cidade, luz, bloom, desfoque, grão, tamanhos de fonte, encerramento.
- `src/city.js` — cidade (prédios instanciados, janelas procedurais, malha do mapa, céu)
- `src/camera.js` — câmera por spline cúbica (velocidade contínua entre quadros-chave)
- `src/lighting.js` — luar com sombra que acompanha o alvo, contraluz
- `src/routes.js` — rotas luminosas e pinos
- `src/transitions.js` — linha do tempo global (revelação, mapa, apagar das luzes, fade)
- `src/post.js` — profundidade de campo, bloom, grade final (ACES, vinheta, grão)
- `src/overlay/typography.js`, `labels.js`, `logo.js` — textos, etiquetas e assinatura
- `audio/sound.py` — trilha sintetizada (camadas e volumes em `MIX`)

O logo vem sem alteração de `src/components/ui/brand-assets.ts` (o mesmo do app).
