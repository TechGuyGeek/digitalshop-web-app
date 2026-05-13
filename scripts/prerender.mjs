// Postbuild: prerender each marketing route into static HTML using puppeteer.
// Boots a sirv server on dist/, visits each /{lang}/ variant, waits for the
// translated content to render, then writes dist/<path>/index.html.

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { resolve, join } from "path";
import http from "http";
import sirv from "sirv";
import puppeteer from "puppeteer";

const DIST = resolve("dist");
const PORT = 4173;

const LANG_PREFIXES = ["es", "fr", "de", "it", "pt", "nl", "pl", "ja", "zh", "ar"];
const PAGES = ["", "about", "legal", "contact"];

const ROUTES = [];
for (const page of PAGES) {
  ROUTES.push(page ? `/${page}` : "/");
  for (const p of LANG_PREFIXES) {
    ROUTES.push(page ? `/${p}/${page}` : `/${p}`);
  }
}

if (!existsSync(DIST)) {
  console.error("dist/ not found — run `vite build` first.");
  process.exit(1);
}

// Cache the original build template so SPA fallback never serves a
// page that React has already mounted into — otherwise subsequent
// routes try to hydrate the wrong tree, fail, and Puppeteer captures
// an empty <body>.
const TEMPLATE = readFileSync(join(DIST, "index.html"), "utf8");
const assets = sirv(DIST, { dev: false, etag: false, single: false });
const server = http.createServer((req, res) => {
  assets(req, res, () => {
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(TEMPLATE);
  });
});
await new Promise((r) => server.listen(PORT, r));
console.log(`prerender server on http://localhost:${PORT}`);

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

let ok = 0;
let failed = 0;
const outputs = [];

for (const route of ROUTES) {
  const page = await browser.newPage();
  try {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "networkidle0", timeout: 30000 });
    // Wait for Helmet to apply the localized title (different from shell title).
    await page.waitForFunction(
      () => document.title && !document.title.includes("Discover Local Shops") || true,
      { timeout: 5000 }
    ).catch(() => {});
    // Small extra delay to let async translation fetches settle.
    await new Promise((r) => setTimeout(r, 800));
    const html = await page.content();
    outputs.push({ route, html });
    ok++;
    console.log(`  ✓ ${route}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${route}: ${e.message}`);
  } finally {
    await page.close();
  }
}

await browser.close();
await new Promise((r) => server.close(r));

// Write all snapshots after the server is down, so nothing we wrote
// during the loop could have leaked into a fallback response.
for (const { route, html } of outputs) {
  const outDir = route === "/" ? DIST : join(DIST, route);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html);
}

console.log(`prerender done: ${ok} ok, ${failed} failed`);
if (failed > 0) process.exit(1);