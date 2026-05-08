import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSiteNavExtras } from "@/contexts/SiteNavExtras";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
}

interface SiteNavProps {
  items?: NavItem[];
  className?: string;
}

const SiteNav = ({ items, className }: SiteNavProps) => {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { actions } = useSiteNavExtras();

  const links: NavItem[] =
    items ?? [
      { to: "/", label: t("Home") || "Home" },
      { to: "/about", label: t("About") || "About" },
      { to: "/legal", label: t("Legal") || "Legal" },
    ];

  return (
    <nav aria-label="Primary" className={cn("absolute top-3 right-3 z-50", className)}>
      {/* SEO/crawler-visible links (hidden visually, real <a> tags) */}
      <ul className="sr-only">
        {links.map((l) => (
          <li key={l.to}>
            <a href={l.to}>{l.label}</a>
          </li>
        ))}
      </ul>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          aria-label="Open menu"
          className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-background/70 backdrop-blur border border-border text-foreground hover:bg-background transition-colors shadow-md"
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle className="font-heading text-xl">GPSSHOPS</SheetTitle>
          </SheetHeader>
          <ul className="flex flex-col py-4">
            {links.map((l) => {
              const active = pathname === l.to;
              return (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block px-6 py-3 text-base font-heading tracking-wide transition-colors",
                      active
                        ? "bg-primary/15 text-primary border-l-2 border-primary"
                        : "text-foreground hover:bg-secondary",
                    )}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          {actions.length > 0 && (
            <>
              <div className="border-t border-border my-2" />
              <ul className="flex flex-col pb-4">
                {actions.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      disabled={a.disabled}
                      onClick={() => {
                        setOpen(false);
                        a.onClick();
                      }}
                      className={cn(
                        "w-full text-left block px-6 py-3 text-base font-heading tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                        a.variant === "destructive"
                          ? "text-destructive hover:bg-destructive/10"
                          : "text-foreground hover:bg-secondary",
                      )}
                    >
                      {a.label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </SheetContent>
      </Sheet>
    </nav>
  );
};

export default SiteNav;