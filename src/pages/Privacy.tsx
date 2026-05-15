import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LOCALE_TO_PREFIX, buildLocalizedPath } from "@/lib/i18nRoutes";
import SiteFooter from "@/components/SiteFooter";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3 mb-8">
    <h2 className="font-heading text-xl text-foreground">{title}</h2>
    <div className="text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </section>
);

const SubSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <h3 className="font-heading text-base text-foreground">{title}</h3>
    <div className="text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </div>
);

const Privacy = () => {
  const { t, language } = useLanguage();
  const prefix = LOCALE_TO_PREFIX[language] ?? "";
  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col">
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
        <h1 className="font-heading text-3xl md:text-4xl tracking-tight text-foreground mb-2">
          GPS Shops – Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          <strong>Last updated:</strong> May 2026
        </p>
        <p className="text-muted-foreground leading-relaxed mb-3">
          This Privacy Policy applies to the GPS Shops mobile application
          (<strong>com.TechGuyGeek.GPSShops</strong>) developed and published by{" "}
          <strong>Jason Purkiss / TechGuyGeek</strong>.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-8">
          GPS Shops (“we”, “our”, “the app”) is committed to protecting your privacy. This Privacy
          Policy explains how we collect, use, store, and protect your information when you use the
          GPS Shops mobile application and related services.
        </p>

        <Section title="1. Information We Collect">
          <SubSection title="1.1 Information You Provide Directly">
            <ul className="list-disc pl-6 space-y-1">
              <li>Email address – used for login, account access, and account recovery.</li>
              <li>Password – stored securely using industry-standard hashing and encryption practices.</li>
              <li>Profile details – such as your name, company details, product groups, listings, and profile information that you choose to create within the app.</li>
            </ul>
          </SubSection>
          <SubSection title="1.2 Social Login Information">
            <p>If you choose to sign in using Google or Facebook:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>We may receive your name, email address, and basic public profile information.</li>
              <li>No additional social media data is collected without your permission.</li>
            </ul>
          </SubSection>
          <SubSection title="1.3 Automatically Collected Information">
            <p>GPS Shops may automatically collect limited technical information including:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Device type</li>
              <li>Operating system version</li>
              <li>App usage and diagnostic information</li>
              <li>Crash reports and performance data</li>
            </ul>
          </SubSection>
        </Section>

        <Section title="2. How We Use Your Data">
          <p>Your information is used to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Allow you to log in and use the app</li>
            <li>Store your company details, listings, product groups, and profile information</li>
            <li>Provide customer support when required</li>
            <li>Improve app stability, reliability, and performance</li>
            <li>Help protect against fraud, abuse, or unauthorised access</li>
          </ul>
          <p>We do not sell or rent your personal information to third parties.</p>
        </Section>

        <Section title="3. How Your Data Is Stored">
          <ul className="list-disc pl-6 space-y-1">
            <li>Passwords are stored using secure hashing methods.</li>
            <li>Data is stored on protected servers with reasonable technical and administrative safeguards.</li>
            <li>We take reasonable measures to protect your information against unauthorised access, loss, misuse, or disclosure.</li>
          </ul>
        </Section>

        <Section title="4. Sharing of Information">
          <p>GPS Shops does not sell your personal information.</p>
          <p>Information may only be shared when necessary to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Comply with legal obligations</li>
            <li>Protect the security and integrity of the app</li>
            <li>Prevent fraud, abuse, or security threats</li>
            <li>Protect the rights, property, or safety of users or the public</li>
          </ul>
        </Section>

        <Section title="5. Your Rights">
          <p>You may request to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Access the information we store about you</li>
            <li>Correct inaccurate information</li>
            <li>Delete your account and associated data</li>
          </ul>
          <p>Requests regarding your personal data can be made by contacting us using the information below.</p>
        </Section>

        <Section title="6. Account Deletion">
          <p>Users may request deletion of their account and associated data by contacting support or using any account deletion tools provided inside the app.</p>
        </Section>

        <Section title="7. Children’s Privacy">
          <p>GPS Shops is not directed toward children under the age of 13, and we do not knowingly collect personal information from children.</p>
        </Section>

        <Section title="8. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. Updates will be published on this page with a revised “Last updated” date.</p>
        </Section>

        <Section title="9. Contact Information">
          <p>If you have questions regarding this Privacy Policy or your data, please contact:</p>
          <p>
            <strong>GPS Shops / TechGuyGeek</strong>
            <br />
            Email:{" "}
            <a href="mailto:support@gpsshops.com" className="text-primary hover:underline">
              support@gpsshops.com
            </a>
            <br />
            Website:{" "}
            <a href="https://gpsshops.com" className="text-primary hover:underline">
              https://gpsshops.com
            </a>
          </p>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Privacy;