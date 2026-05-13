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

interface SeoHeadProps {
  page: LocalizedPage;
}

const SeoHead = ({ page }: SeoHeadProps) => {
  const { t, language } = useLanguage();
  const seo = PAGE_SEO_KEYS[page];
  const title = t(seo.title);
  const description = t(seo.description);
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