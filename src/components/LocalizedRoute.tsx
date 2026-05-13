import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { URL_LANG_MAP } from "@/lib/i18nRoutes";
import { useLanguage } from "@/contexts/LanguageContext";
import NotFound from "@/pages/NotFound";

/**
 * Wraps a marketing page route at /:lang/... — validates the prefix and
 * syncs the active translation language to match the URL.
 */
const LocalizedRoute = ({ children }: { children: React.ReactNode }) => {
  const { lang } = useParams<{ lang: string }>();
  const { setLanguageFromUrl } = useLanguage();
  const locale = lang ? URL_LANG_MAP[lang.toLowerCase()] : undefined;

  useEffect(() => {
    if (locale) setLanguageFromUrl(locale);
  }, [locale, setLanguageFromUrl]);

  if (!locale) return <NotFound />;
  return <>{children}</>;
};

export default LocalizedRoute;