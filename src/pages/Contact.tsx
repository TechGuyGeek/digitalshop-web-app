import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Globe, MapPin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import SeoHead from "@/components/SeoHead";
import { LOCALE_TO_PREFIX, buildLocalizedPath } from "@/lib/i18nRoutes";
import SiteFooter from "@/components/SiteFooter";

const Contact = () => {
  const { t, language } = useLanguage();
  const prefix = LOCALE_TO_PREFIX[language] ?? "";

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col">
      <SeoHead page="contact" />
      <header className="px-6 pt-6 pb-2">
        <Link
          to={buildLocalizedPath(prefix, "")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("Back") || "Back"}
        </Link>
      </header>

      <main className="px-6 pb-12 pt-4 max-w-prose mx-auto flex-1">
        <h1 className="font-heading text-3xl md:text-4xl tracking-tight text-foreground mb-4">
          {t("ContactPageHeading")}
        </h1>
        <p className="text-muted-foreground leading-relaxed mb-8">
          {t("ContactPageIntro")}
        </p>

        <section className="space-y-5 mb-10" aria-labelledby="reach-us">
          <h2 id="reach-us" className="font-heading text-2xl text-foreground">{t("ContactWaysToReachUs")}</h2>

          <div className="rounded-xl border border-border/60 bg-card p-5">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-heading text-base text-foreground">{t("ContactEmailLabel")}</h3>
                <p className="text-sm text-muted-foreground mb-1">
                  {t("ContactEmailDesc")}
                </p>
                <a
                  href="mailto:support@gpsshops.com"
                  className="text-primary hover:underline break-all"
                >
                  support@gpsshops.com
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5">
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-heading text-base text-foreground">{t("ContactWebsiteLabel")}</h3>
                <p className="text-sm text-muted-foreground mb-1">
                  {t("ContactWebsiteDesc")}
                </p>
                <a
                  href="https://gpsshops.com"
                  className="text-primary hover:underline"
                >
                  gpsshops.com
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-heading text-base text-foreground">{t("ContactListShopLabel")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("ContactListShopDesc")}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3" aria-labelledby="response">
          <h2 id="response" className="font-heading text-2xl text-foreground">{t("ContactResponseTimesLabel")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("ContactResponseTimesDesc")}
          </p>
        </section>
      </main>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: "Contact GPS Shops",
            url: "https://gpsshops.com/contact",
            mainEntity: {
              "@type": "Organization",
              name: "GPS Shops",
              email: "support@gpsshops.com",
              url: "https://gpsshops.com",
              contactPoint: [
                {
                  "@type": "ContactPoint",
                  contactType: "customer support",
                  email: "support@gpsshops.com",
                  availableLanguage: ["English"],
                },
              ],
            },
          }),
        }}
      />
    </div>
  );
};

export default Contact;