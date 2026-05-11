import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Globe, MapPin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSeo } from "@/hooks/useSeo";
import SiteFooter from "@/components/SiteFooter";

const Contact = () => {
  const { t } = useLanguage();
  useSeo({
    title: "Contact GPS Shops — Get in Touch",
    description:
      "Contact GPS Shops for support, partnerships, listing your business, or general questions. Email jason@techguygeek.com.",
    canonical: "https://gpsshops.com/contact",
  });

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-6 pt-6 pb-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("Back") || "Back"}
        </Link>
      </header>

      <main className="px-6 pb-12 pt-4 max-w-prose mx-auto flex-1">
        <h1 className="font-heading text-3xl md:text-4xl tracking-tight text-foreground mb-4">
          Contact GPS Shops
        </h1>
        <p className="text-muted-foreground leading-relaxed mb-8">
          We&rsquo;d love to hear from you. Whether you have a question about the platform,
          want to list your shop, need support with an order, or are exploring partnerships,
          our team is here to help.
        </p>

        <section className="space-y-5 mb-10" aria-labelledby="reach-us">
          <h2 id="reach-us" className="font-heading text-2xl text-foreground">Ways to Reach Us</h2>

          <div className="rounded-xl border border-border/60 bg-card p-5">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-heading text-base text-foreground">Email</h3>
                <p className="text-sm text-muted-foreground mb-1">
                  Best for support, partnerships, and general enquiries.
                </p>
                <a
                  href="mailto:jason@techguygeek.com"
                  className="text-primary hover:underline break-all"
                >
                  jason@techguygeek.com
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5">
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-heading text-base text-foreground">Website</h3>
                <p className="text-sm text-muted-foreground mb-1">
                  Visit our homepage to explore the platform.
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
                <h3 className="font-heading text-base text-foreground">List Your Shop</h3>
                <p className="text-sm text-muted-foreground">
                  Open your own digital storefront from inside the app &mdash; sign in,
                  then choose <em>Build Shop</em> from the menu.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3" aria-labelledby="response">
          <h2 id="response" className="font-heading text-2xl text-foreground">Response Times</h2>
          <p className="text-muted-foreground leading-relaxed">
            We aim to respond to all enquiries within 1&ndash;2 business days. For urgent
            order issues, please include your order reference in the subject line.
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
              email: "jason@techguygeek.com",
              url: "https://gpsshops.com",
              contactPoint: [
                {
                  "@type": "ContactPoint",
                  contactType: "customer support",
                  email: "jason@techguygeek.com",
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