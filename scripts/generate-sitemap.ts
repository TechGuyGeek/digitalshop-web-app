// Runs before `vite build` (prebuild hook); writes public/sitemap.xml
// with hreflang alternates linking the English page to all language variants.

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://gpsshops.com";

const LANG_PREFIXES: Record<string, string> = {
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  it: "it-IT",
  pt: "pt-PT",
  nl: "nl-NL",
  pl: "pl-PL",
  ja: "ja-JP",
  zh: "zh-CN",
  ar: "ar-AE",
};

const PAGES = [
  { path: "", changefreq: "weekly", priority: "1.0" },
  { path: "about", changefreq: "monthly", priority: "0.8" },
  { path: "contact", changefreq: "monthly", priority: "0.7" },
  { path: "legal", changefreq: "yearly", priority: "0.5" },
];

function loc(prefix: string, page: string) {
  if (!prefix) return page ? `${BASE_URL}/${page}` : `${BASE_URL}/`;
  return page ? `${BASE_URL}/${prefix}/${page}` : `${BASE_URL}/${prefix}`;
}

function alternatesFor(page: string): string[] {
  const out: string[] = [];
  out.push(`    <xhtml:link rel="alternate" hreflang="en" href="${loc("", page)}" />`);
  out.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${loc("", page)}" />`);
  for (const [prefix, locale] of Object.entries(LANG_PREFIXES)) {
    out.push(`    <xhtml:link rel="alternate" hreflang="${prefix}" href="${loc(prefix, page)}" />`);
    out.push(`    <xhtml:link rel="alternate" hreflang="${locale.toLowerCase()}" href="${loc(prefix, page)}" />`);
  }
  return out;
}

const urls: string[] = [];
for (const page of PAGES) {
  // English root
  urls.push(
    [
      `  <url>`,
      `    <loc>${loc("", page.path)}</loc>`,
      `    <changefreq>${page.changefreq}</changefreq>`,
      `    <priority>${page.priority}</priority>`,
      ...alternatesFor(page.path),
      `  </url>`,
    ].join("\n")
  );
  for (const prefix of Object.keys(LANG_PREFIXES)) {
    urls.push(
      [
        `  <url>`,
        `    <loc>${loc(prefix, page.path)}</loc>`,
        `    <changefreq>${page.changefreq}</changefreq>`,
        `    <priority>${page.priority}</priority>`,
        ...alternatesFor(page.path),
        `  </url>`,
      ].join("\n")
    );
  }
}

const xml = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
  ...urls,
  `</urlset>`,
].join("\n");

writeFileSync(resolve("public/sitemap.xml"), xml);
console.log(`sitemap.xml written (${urls.length} URLs)`);