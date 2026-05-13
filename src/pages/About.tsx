import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import SeoHead from "@/components/SeoHead";
import { LOCALE_TO_PREFIX, buildLocalizedPath } from "@/lib/i18nRoutes";
import SiteFooter from "@/components/SiteFooter";

const About = () => {
  const { t, language } = useLanguage();
  const prefix = LOCALE_TO_PREFIX[language] ?? "";

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col">
      <SeoHead page="about" />

      <header className="px-6 pt-6 pb-2">
        <Link
          to={buildLocalizedPath(prefix, "")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("Back") || "Back"}
        </Link>
      </header>

      <main className="px-6 pb-16 pt-4 max-w-prose mx-auto">
        <h1 className="font-heading text-3xl md:text-4xl tracking-tight text-foreground mb-4">
          {t("AboutPageHeading")}
        </h1>
        <p className="text-muted-foreground mb-6 leading-relaxed">{t("AboutIntro1")}</p>
        <p className="text-muted-foreground mb-8 leading-relaxed">{t("AboutIntro2")}</p>

        <section className="space-y-4 mb-8">
          <h2 className="font-heading text-2xl text-foreground">{t("OurMission")}</h2>
          <p className="text-muted-foreground leading-relaxed">{t("OurMissionP1")}</p>
          <p className="text-muted-foreground leading-relaxed">{t("OurMissionP2")}</p>
          <p className="text-muted-foreground leading-relaxed">{t("OurMissionP3")}</p>
        </section>

        <section className="space-y-6 mb-8">
          <h2 className="font-heading text-2xl text-foreground">{t("WhatYouCanDo")}</h2>

          <div className="space-y-2">
            <h3 className="font-heading text-lg text-foreground">{t("DiscoverNearbyShopsTitle")}</h3>
            <p className="text-muted-foreground leading-relaxed">{t("DiscoverNearbyShopsDesc")}</p>
          </div>

          <div className="space-y-2">
            <h3 className="font-heading text-lg text-foreground">{t("BrowseAndOrderTitle")}</h3>
            <p className="text-muted-foreground leading-relaxed">{t("BrowseAndOrderDesc")}</p>
          </div>

          <div className="space-y-2">
            <h3 className="font-heading text-lg text-foreground">{t("OpenYourOwnShopTitle")}</h3>
            <p className="text-muted-foreground leading-relaxed">{t("OpenYourOwnShopDesc")}</p>
          </div>

          <div className="space-y-2">
            <h3 className="font-heading text-lg text-foreground">{t("GoGlobalTitle")}</h3>
            <p className="text-muted-foreground leading-relaxed">{t("GoGlobalDesc")}</p>
          </div>

          <div className="space-y-2">
            <h3 className="font-heading text-lg text-foreground">{t("MultiLanguageThemeTitle")}</h3>
            <p className="text-muted-foreground leading-relaxed">{t("MultiLanguageThemeDesc")}</p>
          </div>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="font-heading text-2xl text-foreground">{t("WhyGPSShops")}</h2>
          <p className="text-muted-foreground leading-relaxed">{t("WhyGPSShopsP1")}</p>
          <p className="text-muted-foreground leading-relaxed">{t("WhyGPSShopsP2")}</p>
          <p className="text-muted-foreground leading-relaxed">{t("WhyGPSShopsP3")}</p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="font-heading text-2xl text-foreground">{t("FounderVision")}</h2>
          <p className="text-muted-foreground leading-relaxed">{t("FounderVisionP1")}</p>
          <p className="text-muted-foreground leading-relaxed">{t("FounderVisionP2")}</p>
          <p className="text-muted-foreground leading-relaxed italic">{t("FounderVisionP3")}</p>
          <p className="text-muted-foreground leading-relaxed">{t("FounderVisionP4")}</p>
          <p className="text-muted-foreground leading-relaxed">{t("FounderVisionP5")}</p>
          <p className="text-foreground font-heading text-lg">{t("YourShopAnywhere")}</p>
          <p className="text-muted-foreground leading-relaxed">{t("WatchOriginalConceptVideo")}</p>
          <div className="relative w-full overflow-hidden rounded-lg border border-border bg-muted" style={{ paddingBottom: "56.25%" }}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src="https://www.youtube.com/embed/fT_XSVrbfqM?start=4"
              title="GPS Shops founder concept video"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-heading text-2xl text-foreground">{t("GetInTouch")}</h2>
          <p className="text-muted-foreground leading-relaxed">{t("GetInTouchP1")}</p>
          <p className="text-muted-foreground leading-relaxed">
            {t("ContactUsAt")}{" "}
            <a
              href="mailto:support@gpsshops.com"
              className="text-primary hover:underline"
            >
              support@gpsshops.com
            </a>
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
};

export default About;