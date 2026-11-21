// Renderização quadro a quadro no Chromium sem tela + montagem do MP4 com FFmpeg.
//
//   node render/render.js --frame 150            → out/frame_0150.png (1080x1920)
//   node render/render.js --frame 150,210,330    → vários quadros soltos
//   node render/render.js --range 210-360        → regrava só esse trecho em out/frames e remonta o MP4
//   node render/render.js --preview              → 540x960, 1 a cada 2 quadros → out/preview.mp4
//   node render/render.js --final                → 1080x1920, 480 quadros → konexya_final.mp4
//   node render/render.js --encode               → só remonta o MP4 final a partir de out/frames
// Opções: --workers N (navegadores em paralelo), --ss N (superamostragem), --scale S
import { spawnSync, execSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "./server.js";
import { VIDEO } from "../config.js";

// Playwright já vem instalado globalmente no ambiente; usa o local se existir.
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  const globalRoot = execSync("npm root -g").toString().trim();
  ({ chromium } = createRequire(path.join(globalRoot, "noop.js"))("playwright"));
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");
const AUDIO = path.join(OUT, "audio.wav");

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = args[i + 1];
  return v === undefined || v.startsWith("--") ? true : v;
};

const mode = opt("preview") ? "preview" : opt("final") ? "final" : opt("encode") ? "encode" : opt("range") ? "range" : opt("frame") ? "frame" : null;
if (!mode) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 10).join("\n"));
  process.exit(1);
}

const isPreview = mode === "preview";
const scale = Number(opt("scale", isPreview ? VIDEO.preview.scale : 1));
const ss = Number(opt("ss", isPreview ? 1 : VIDEO.ss ?? 1));
const workers = Number(opt("workers", 2));
const W = Math.round(VIDEO.width * scale), H = Math.round(VIDEO.height * scale);
const pad = (n) => String(n).padStart(4, "0");

function framesFor() {
  const all = VIDEO.frames;
  if (mode === "frame") return String(opt("frame")).split(",").map(Number);
  if (mode === "range") {
    const [a, b] = String(opt("range")).split("-").map(Number);
    return Array.from({ length: b - a + 1 }, (_, i) => a + i);
  }
  if (isPreview) {
    let list = Array.from({ length: Math.ceil(all / VIDEO.preview.step) }, (_, i) => i * VIDEO.preview.step);
    // --preview --range a-b: refaz só esse trecho da prévia e remonta o vídeo.
    if (opt("range")) {
      const [a, b] = String(opt("range")).split("-").map(Number);
      list = list.filter((f) => f >= a && f <= b);
    }
    return list;
  }
  return Array.from({ length: all }, (_, i) => i);
}

const dirFor = () => (isPreview ? path.join(OUT, "preview") : path.join(OUT, "frames"));
const fileFor = (n) => (mode === "frame" ? path.join(OUT, `frame_${pad(n)}.png`) : path.join(dirFor(), `${pad(n)}.png`));

async function renderFrames(frames) {
  fs.mkdirSync(dirFor(), { recursive: true });
  const server = await startServer();
  const url = `http://127.0.0.1:${server.address().port}/?scale=${scale}&ss=${ss}`;
  const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const t0 = Date.now(); // só para relatório de progresso; não influencia a imagem
  let done = 0;
  const queue = [...frames];
  const n = Math.min(workers, frames.length);
  await Promise.all(
    Array.from({ length: n }, async () => {
      const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: ss });
      page.on("pageerror", (e) => console.error("[página]", e.message));
      page.on("console", (m) => m.type() === "error" && console.error("[console]", m.text()));
      await page.goto(url);
      await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
      while (queue.length) {
        const f = queue.shift();
        await page.evaluate((k) => window.renderFrame(k), f);
        await page.screenshot({ path: fileFor(f), type: "png", clip: { x: 0, y: 0, width: W, height: H } });
        done++;
        const el = (Date.now() - t0) / 1000;
        if (done === frames.length || done % Math.max(1, Math.round(frames.length / 20)) === 0)
          console.log(`  ${done}/${frames.length} · ${(el / done).toFixed(2)} s/quadro · faltam ~${Math.round((el / done) * (frames.length - done))} s`);
      }
      await page.close();
    }),
  );
  await browser.close();
  server.close();
}

function encode({ preview }) {
  const dir = preview ? path.join(OUT, "preview") : path.join(OUT, "frames");
  const out = preview ? path.join(OUT, "preview.mp4") : path.join(ROOT, "konexya_final.mp4");
  const step = preview ? VIDEO.preview.step : 1;
  const ow = preview ? Math.round(VIDEO.width * VIDEO.preview.scale) : VIDEO.width;
  const oh = preview ? Math.round(VIDEO.height * VIDEO.preview.scale) : VIDEO.height;
  const a = [
    "-y", "-loglevel", "error",
    "-framerate", String(VIDEO.fps / step), "-start_number", "0",
    "-i", path.join(dir, "%04d.png"),
  ];
  // Prévia: quadros com passo 2 recebem o número real; o filtro fps duplica para 30 fps.
  if (step > 1) {
    // Renomeia em uma lista temporária contínua.
    const tmp = path.join(OUT, "preview_seq");
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp);
    let i = 0;
    for (let f = 0; f < VIDEO.frames; f += step) fs.copyFileSync(path.join(dir, `${pad(f)}.png`), path.join(tmp, `${pad(i++)}.png`));
    a[a.indexOf(path.join(dir, "%04d.png"))] = path.join(tmp, "%04d.png");
  }
  const hasAudio = fs.existsSync(AUDIO);
  if (hasAudio) a.push("-i", AUDIO);
  a.push(
    "-vf", `fps=${VIDEO.fps},scale=${ow}:${oh}:flags=lanczos,format=yuv420p`,
    "-frames:v", String(VIDEO.frames),
    "-c:v", "libx264", "-preset", preview ? "medium" : "slow", "-crf", String(preview ? 20 : VIDEO.crf),
    "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  );
  if (hasAudio) a.push("-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-t", String(VIDEO.duration));
  a.push(out);
  const r = spawnSync("ffmpeg", a, { stdio: "inherit" });
  if (r.status !== 0) throw new Error("FFmpeg falhou");
  console.log(`  → ${path.relative(process.cwd(), out)}${hasAudio ? " (com áudio)" : " (sem áudio: rode npm run audio)"}`);
}

const frames = mode === "encode" ? [] : framesFor();
if (frames.length) {
  console.log(`Renderizando ${frames.length} quadro(s) em ${W}x${H} (superamostragem ${ss}x, ${workers} processos)`);
  await renderFrames(frames);
}
if (mode === "preview") encode({ preview: true });
if (mode === "final" || mode === "encode" || mode === "range") {
  const missing = Array.from({ length: VIDEO.frames }, (_, i) => i).filter((f) => !fs.existsSync(path.join(OUT, "frames", `${pad(f)}.png`)));
  if (missing.length) console.log(`  ${missing.length} quadros ainda não renderizados; o MP4 final não foi montado.`);
  else encode({ preview: false });
}
if (mode === "frame") frames.forEach((f) => console.log(`  → out/frame_${pad(f)}.png`));
