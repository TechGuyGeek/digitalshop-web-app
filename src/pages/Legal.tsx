import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import SeoHead from "@/components/SeoHead";
import { LOCALE_TO_PREFIX, buildLocalizedPath } from "@/lib/i18nRoutes";
import SiteFooter from "@/components/SiteFooter";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3 mb-8">
    <h2 className="font-heading text-xl text-foreground">{title}</h2>
    <div className="text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </section>
);

const Legal = () => {
  const { t, language } = useLanguage();
  const prefix = LOCALE_TO_PREFIX[language] ?? "";
  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col">
      <SeoHead page="legal" />
      <header className="px-6 pt-6 pb-2">
        <Link to={buildLocalizedPath(prefix, "")} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {t("Back") || "Back"}
        </Link>
      </header>
      <main className="px-6 pb-16 pt-4 max-w-prose mx-auto">
        <h1 className="font-heading text-3xl md:text-4xl tracking-tight text-foreground mb-2">
          {t("Legal_PageTitle")}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">{t("Legal_EffectiveDate")}</p>
        <p className="text-muted-foreground leading-relaxed mb-3">{t("Legal_Welcome")}</p>
        <p className="text-muted-foreground leading-relaxed mb-3">{t("Legal_Intro1")}</p>
        <p className="text-muted-foreground leading-relaxed mb-8">{t("Legal_Intro2")}</p>

        <Section title={t("Legal_S1_Title")}>
          <p>{t("Legal_S1_P1")}</p>
          <p>{t("Legal_S1_P2")}</p>
          <p>{t("Legal_S1_P3")}</p>
        </Section>

        <Section title={t("Legal_S2_Title")}>
          <p>{t("Legal_S2_P1")}</p>
          <p>{t("Legal_S2_P2")}</p>
          <p>{t("Legal_S2_P3")}</p>
          <p>{t("Legal_S2_P4")}</p>
        </Section>

        <Section title={t("Legal_S3_Title")}>
          <p>{t("Legal_S3_P1")}</p>
          <p>{t("Legal_S3_P2")}</p>
          <ul className="list-disc pl-6 space-y-1">
            {Array.from({ length: 10 }, (_, i) => <li key={i}>{t(`Legal_S3_B${i + 1}`)}</li>)}
          </ul>
          <p>{t("Legal_S3_P3")}</p>
        </Section>

        <Section title={t("Legal_S4_Title")}>
          <p>{t("Legal_S4_P1")}</p>
          <p>{t("Legal_S4_P2")}</p>
          <p>{t("Legal_S4_P3")}</p>
          <p>{t("Legal_S4_P4")}</p>
        </Section>

        <Section title={t("Legal_S5_Title")}>
          <p>{t("Legal_S5_P1")}</p>
          <p>{t("Legal_S5_P2")}</p>
          <ul className="list-disc pl-6 space-y-1">
            {Array.from({ length: 8 }, (_, i) => <li key={i}>{t(`Legal_S5_B${i + 1}`)}</li>)}
          </ul>
          <p>{t("Legal_S5_P3")}</p>
        </Section>

        <Section title={t("Legal_S6_Title")}>
          <p>{t("Legal_S6_P1")}</p>
          <ul className="list-disc pl-6 space-y-1">
            {Array.from({ length: 10 }, (_, i) => <li key={i}>{t(`Legal_S6_B${i + 1}`)}</li>)}
          </ul>
          <p>{t("Legal_S6_P2")}</p>
        </Section>

        <Section title={t("Legal_S7_Title")}>
          <p>{t("Legal_S7_P1")}</p>
          <ul className="list-disc pl-6 space-y-1">
            {Array.from({ length: 9 }, (_, i) => <li key={i}>{t(`Legal_S7_B${i + 1}`)}</li>)}
          </ul>
          <p>{t("Legal_S7_P2")}</p>
        </Section>

        <Section title={t("Legal_S8_Title")}>
          <p>{t("Legal_S8_P1")}</p>
          <p>{t("Legal_S8_P2")}</p>
        </Section>

        <Section title={t("Legal_S9_Title")}>
          <p>{t("Legal_S9_P1")}</p>
          <p>{t("Legal_S9_P2")}</p>
        </Section>

        <Section title={t("Legal_S10_Title")}>
          <p>{t("Legal_S10_P1")}</p>
          <p>{t("Legal_S10_P2")}</p>
          <p>{t("Legal_S10_P3")}</p>
        </Section>

        <Section title={t("Legal_S11_Title")}>
          <p>{t("Legal_S11_P1")}</p>
          <p>
            <a href="mailto:support@gpsshops.com" className="text-primary hover:underline">
              support@gpsshops.com
            </a>
          </p>
        </Section>

        <p className="text-muted-foreground leading-relaxed border-t border-border pt-6">
          {t("Legal_Footer")}
        </p>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Legal;
