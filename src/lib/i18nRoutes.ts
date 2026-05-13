// Maps short URL prefixes to full locale codes used by the translation files.
// English is served at the root (no prefix).
export const URL_LANG_MAP: Record<string, string> = {
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

export const URL_LANG_PREFIXES = Object.keys(URL_LANG_MAP);

// Locale code → URL prefix (reverse lookup)
export const LOCALE_TO_PREFIX: Record<string, string> = Object.fromEntries(
  Object.entries(URL_LANG_MAP).map(([prefix, locale]) => [locale, prefix])
);

// Public marketing pages that have language variants.
// Path is the suffix after the optional /:lang prefix; "" = home.
export const LOCALIZED_PAGES = ["", "about", "legal", "contact"] as const;
export type LocalizedPage = (typeof LOCALIZED_PAGES)[number];

/** Strip a leading `/{lang}` prefix from a pathname, if present. */
export function stripLangPrefix(pathname: string): { lang: string | null; rest: string } {
  const m = pathname.match(/^\/([a-z]{2})(?=\/|$)/i);
  if (m && URL_LANG_PREFIXES.includes(m[1].toLowerCase())) {
    const lang = m[1].toLowerCase();
    const rest = pathname.slice(lang.length + 1) || "/";
    return { lang, rest };
  }
  return { lang: null, rest: pathname };
}

/** Build a path under a language prefix. `prefix` "" means English (no prefix). */
export function buildLocalizedPath(prefix: string, page: LocalizedPage): string {
  const suffix = page ? `/${page}` : "/";
  if (!prefix) return suffix;
  return `/${prefix}${page ? `/${page}` : ""}` || `/${prefix}`;
}

/** Returns the absolute path for a given locale + page. */
export function localeHref(locale: string | "en", page: LocalizedPage): string {
  if (locale === "en") return buildLocalizedPath("", page);
  const prefix = LOCALE_TO_PREFIX[locale];
  if (!prefix) return buildLocalizedPath("", page);
  return buildLocalizedPath(prefix, page);
}

/** All hreflang alternates for a given page. */
export function getAlternates(page: LocalizedPage): { hreflang: string; href: string }[] {
  const alternates: { hreflang: string; href: string }[] = [
    { hreflang: "en", href: buildLocalizedPath("", page) },
    { hreflang: "x-default", href: buildLocalizedPath("", page) },
  ];
  for (const [prefix, locale] of Object.entries(URL_LANG_MAP)) {
    alternates.push({ hreflang: prefix, href: buildLocalizedPath(prefix, page) });
    // Also publish the full BCP-47 form for crawlers that prefer it.
    alternates.push({ hreflang: locale.toLowerCase(), href: buildLocalizedPath(prefix, page) });
  }
  return alternates;
}

export const PAGE_SEO_KEYS: Record<LocalizedPage, { title: string; description: string }> = {
  "": { title: "SeoTitle_Home", description: "SeoDesc_Home" },
  about: { title: "SeoTitle_About", description: "SeoDesc_About" },
  legal: { title: "SeoTitle_Legal", description: "SeoDesc_Legal" },
  contact: { title: "SeoTitle_Contact", description: "SeoDesc_Contact" },
};