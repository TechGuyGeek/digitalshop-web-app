import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { LOCALE_TO_PREFIX, buildLocalizedPath } from "@/lib/i18nRoutes";

const SiteFooter = () => {
  const year = new Date().getFullYear();
  const { language, t } = useLanguage();
  const prefix = LOCALE_TO_PREFIX[language] ?? "";
  return (
    <footer className="border-t border-border/60 bg-background/80 px-6 py-6 mt-8">
      <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
        <Link to={buildLocalizedPath(prefix, "about")} className="text-muted-foreground hover:text-foreground transition-colors">
          {t("About")}
        </Link>
        <Link to={buildLocalizedPath(prefix, "contact")} className="text-muted-foreground hover:text-foreground transition-colors">
          {t("Contact")}
        </Link>
        <Link to={buildLocalizedPath(prefix, "legal")} className="text-muted-foreground hover:text-foreground transition-colors">
          {t("Legal")}
        </Link>
      </nav>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        &copy; {year} GPS Shops. Your shop — anywhere.
      </p>
    </footer>
  );
};

export default SiteFooter;