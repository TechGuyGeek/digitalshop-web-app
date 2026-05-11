import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSeo } from "@/hooks/useSeo";
import SiteFooter from "@/components/SiteFooter";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3 mb-8">
    <h2 className="font-heading text-xl text-foreground">{title}</h2>
    <div className="text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </section>
);

const Legal = () => {
  const { t } = useLanguage();
  useSeo({
    title: "Legal, Terms & Disclaimer — GPS Shops",
    description:
      "GPS Shops legal terms, disclaimer, and limitation of liability. Read the conditions for using our location-aware marketplace platform.",
    canonical: "https://gpsshops.com/legal",
  });
  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-6 pt-6 pb-2">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {t("Back") || "Back"}
        </Link>
      </header>
      <main className="px-6 pb-16 pt-4 max-w-prose mx-auto">
        <h1 className="font-heading text-3xl md:text-4xl tracking-tight text-foreground mb-2">
          Terms, Disclaimer & Limitation of Liability
        </h1>
        <p className="text-sm text-muted-foreground mb-6">Effective Date: 29 April 2026</p>
        <p className="text-muted-foreground leading-relaxed mb-3">Welcome to GPS Shops.</p>
        <p className="text-muted-foreground leading-relaxed mb-3">
          GPS Shops is a location-aware digital marketplace platform that allows businesses, sellers, and customers to connect through online storefronts, map-based discovery, and digital ordering services.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-8">
          By using this website, mobile app, or any related services operated by GPS Shops, you agree to the following terms and conditions.
        </p>

        <Section title="1. Platform Role">
          <p>GPS Shops provides a platform for independent businesses, sellers, and customers to connect.</p>
          <p>We are not the direct seller, supplier, manufacturer, or delivery provider for goods or services listed by third-party businesses unless explicitly stated otherwise.</p>
          <p>Transactions made through the platform are primarily agreements between the buyer and the individual seller or business.</p>
        </Section>

        <Section title="2. User Responsibility">
          <p>All users use GPS Shops at their own risk.</p>
          <p>Buyers are responsible for verifying the legitimacy, quality, suitability, and reliability of any seller, product, or service before making a purchase.</p>
          <p>Sellers are responsible for ensuring that all products, services, pricing, descriptions, and business information provided are accurate, lawful, and up to date.</p>
          <p>Users are responsible for maintaining the security of their own accounts, passwords, and login credentials.</p>
        </Section>

        <Section title="3. Payments and Disputes">
          <p>Payment transactions may be processed through third-party providers such as Stripe or other payment platforms.</p>
          <p>GPS Shops is not responsible for:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>payment failures</li>
            <li>chargebacks</li>
            <li>fraudulent transactions</li>
            <li>delayed payments</li>
            <li>banking issues</li>
            <li>refund disputes</li>
            <li>delivery disputes</li>
            <li>damaged goods</li>
            <li>missing products</li>
            <li>service quality disputes</li>
          </ul>
          <p>Any disputes relating to purchases, refunds, deliveries, or product quality must be resolved directly between the buyer and the seller unless otherwise required by law.</p>
        </Section>

        <Section title="4. Subscription Services">
          <p>Pro Mode subscriptions and premium services may provide additional features such as Global Shop visibility, reduced advertising, enhanced shop controls, and premium tools.</p>
          <p>Subscription fees are non-refundable unless required by law or explicitly stated otherwise.</p>
          <p>Users are responsible for managing cancellations through the appropriate payment provider or app store platform.</p>
          <p>Failure to cancel recurring subscriptions may result in continued billing according to the subscription terms.</p>
        </Section>

        <Section title="5. Platform Availability">
          <p>While we aim to provide reliable service, GPS Shops does not guarantee uninterrupted access, permanent uptime, or error-free operation.</p>
          <p>We are not liable for:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>website downtime</li>
            <li>app outages</li>
            <li>map service interruptions</li>
            <li>data loss</li>
            <li>delayed notifications</li>
            <li>failed uploads</li>
            <li>technical failures</li>
            <li>service interruptions caused by third-party providers</li>
          </ul>
          <p>Users should maintain their own backups of important business data where appropriate.</p>
        </Section>

        <Section title="6. Limitation of Liability">
          <p>To the maximum extent permitted by law, GPS Shops, its owners, operators, affiliates, employees, and partners shall not be liable for:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>direct or indirect financial loss</li>
            <li>lost profits</li>
            <li>reputational damage</li>
            <li>business interruption</li>
            <li>customer disputes</li>
            <li>legal disputes between users</li>
            <li>fraud by third parties</li>
            <li>accidental data loss</li>
            <li>security breaches caused by third-party services</li>
            <li>any consequential or incidental damages arising from use of the platform</li>
          </ul>
          <p>Use of the platform is entirely at your own risk.</p>
        </Section>

        <Section title="7. Acceptable Use">
          <p>Users must not use GPS Shops for:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>illegal goods or services</li>
            <li>fraudulent activity</li>
            <li>misleading advertising</li>
            <li>counterfeit products</li>
            <li>prohibited content</li>
            <li>abusive or harmful conduct</li>
            <li>spam, phishing, or scams</li>
            <li>unauthorised access attempts</li>
            <li>malicious attacks against the platform</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts without notice where misuse is suspected.</p>
        </Section>

        <Section title="8. Intellectual Property">
          <p>All branding, logos, platform design, software, content structure, and original materials relating to GPS Shops remain the intellectual property of GPS Shops unless otherwise stated.</p>
          <p>Users may not copy, reproduce, resell, or exploit platform materials without written permission.</p>
        </Section>

        <Section title="9. Privacy">
          <p>Use of the platform is also governed by our Privacy Policy.</p>
          <p>By using GPS Shops, users agree to the collection and processing of data necessary to operate the platform, including account details, location-based services, and transaction-related information where applicable.</p>
        </Section>

        <Section title="10. Changes to These Terms">
          <p>We reserve the right to update these terms at any time without prior notice.</p>
          <p>Continued use of the platform after updates are published constitutes acceptance of the revised terms.</p>
          <p>Users are encouraged to review this page periodically.</p>
        </Section>

        <Section title="11. Contact">
          <p>For legal enquiries, platform concerns, or general support, please contact:</p>
          <p>
            <a href="mailto:jason@techguygeek.com" className="text-primary hover:underline">
              jason@techguygeek.com
            </a>
          </p>
        </Section>

        <p className="text-muted-foreground leading-relaxed border-t border-border pt-6">
          By continuing to use GPS Shops, you confirm that you understand and accept these Terms, Disclaimer, and Limitation of Liability.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Legal;
