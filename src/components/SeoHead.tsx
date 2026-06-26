import { Helmet } from "react-helmet-async";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  LOCALE_TO_PREFIX,
  PAGE_SEO_KEYS,
  buildLocalizedPath,
  getAlternates,
  type LocalizedPage,
} from "@/lib/i18nRoutes";

const SITE_URL = "https://gpsshops.com";

// Hardcoded English fallbacks used when translations haven't loaded yet,
// so the browser tab never shows raw keys like "SeoTitle_Home".
const SEO_FALLBACKS: Record<string, string> = {
  SeoTitle_Home: "GPS Shops — Discover Local Shops Near You",
  SeoTitle_About: "About GPS Shops — Your Shop, Anywhere",
  SeoTitle_Legal: "Legal, Terms & Disclaimer — GPS Shops",
  SeoTitle_Contact: "Contact GPS Shops — Get in Touch",
  SeoDesc_Home:
    "GPS Shops is a global, location-aware marketplace. Discover nearby shops on the map, browse menus, order in seconds, or open your own digital storefront.",
  SeoDesc_About:
    "Learn about GPS Shops — a global, location-aware marketplace connecting people with the shops and services around them.",
  SeoDesc_Legal: "Legal information, terms of service and disclaimer for GPS Shops.",
  SeoDesc_Contact: "Get in touch with the GPS Shops team.",
};

const resolve = (translated: string, key: string) =>
  translated && translated !== key ? translated : SEO_FALLBACKS[key] ?? translated;

interface SeoHeadProps {
  page: LocalizedPage;
}

const SeoHead = ({ page }: SeoHeadProps) => {
  const { t, language } = useLanguage();
  const seo = PAGE_SEO_KEYS[page];
  const title = resolve(t(seo.title), seo.title);
  const description = resolve(t(seo.description), seo.description);
  const prefix = LOCALE_TO_PREFIX[language] ?? "";
  const path = buildLocalizedPath(prefix, page);
  const canonical = `${SITE_URL}${path}`;
  const alternates = getAlternates(page);
  const htmlLang = prefix || "en";
  const dir = language.startsWith("ar") || language.startsWith("he") ? "rtl" : "ltr";

  return (
    <Helmet>
      <html lang={htmlLang} dir={dir} />
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content={language.replace("-", "_")} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {alternates.map((a) => (
        <link key={`${a.hreflang}-${a.href}`} rel="alternate" hrefLang={a.hreflang} href={`${SITE_URL}${a.href}`} />
      ))}
    </Helmet>
  );
};

export default SeoHead;