// Servidor estático local para a página de renderização. /brand.json lê o logo oficial do app.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRAND_TS = path.resolve(ROOT, "../src/components/ui/brand-assets.ts");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2" };

export function brandJson() {
  const src = fs.readFileSync(BRAND_TS, "utf8");
  const grab = (name) => {
    const m = src.match(new RegExp(`export const ${name} = \\{([\\s\\S]*?)\\}`));
    if (!m) throw new Error(`Logo ${name} não encontrado em brand-assets.ts`);
    const body = m[1];
    return {
      path: body.match(/path:\s*"([^"]+)"/)[1],
      width: Number(body.match(/width:\s*([\d.]+)/)[1]),
      height: Number(body.match(/height:\s*([\d.]+)/)[1]),
    };
  };
  return { wordmark: grab("WORDMARK"), yMark: grab("Y_MARK") };
}

export function startServer(port = 0) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    if (url.pathname === "/brand.json") {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(brandJson()));
    }
    const file = path.join(ROOT, url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = await startServer(Number(process.env.PORT || 5178));
  console.log(`http://127.0.0.1:${s.address().port}/`);
}
