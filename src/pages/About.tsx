import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import { useLanguage } from "@/contexts/LanguageContext";

const About = () => {
  const { t } = useLanguage();

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <SiteNav />

      <header className="px-6 pt-6 pb-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("Back") || "Back"}
        </Link>
      </header>

      <main className="px-6 pb-16 pt-4 max-w-prose mx-auto">
        <h1 className="font-heading text-3xl md:text-4xl tracking-tight text-foreground mb-4">
          About Shop-a-Verse
        </h1>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Shop-a-Verse is a global, location-aware marketplace that connects
          people with the shops, services and experiences around them — wherever
          they are in the world.
        </p>

        <section className="space-y-4 mb-8">
          <h2 className="font-heading text-xl text-foreground">Our mission</h2>
          <p className="text-muted-foreground leading-relaxed">
            We believe local commerce should feel as effortless as scrolling a
            feed. Shop-a-Verse gives every shop — from a single market stall to a
            growing chain — a beautiful digital storefront that customers can
            discover, browse and order from in seconds.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="font-heading text-xl text-foreground">What you can do</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground leading-relaxed">
            <li>Discover nearby shops on an interactive map.</li>
            <li>Browse menus, build a basket and place orders in one tap.</li>
            <li>Open and manage your own shop with a powerful, mobile-first dashboard.</li>
            <li>Use the app in your language, with the theme that suits you.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="font-heading text-xl text-foreground">Get in touch</h2>
          <p className="text-muted-foreground leading-relaxed">
            Questions, feedback or want to list your shop? Reach out at{" "}
            <a
              href="mailto:hello@techguygeek.co.uk"
              className="text-primary hover:underline"
            >
              hello@techguygeek.co.uk
            </a>
            .
          </p>
        </section>
      </main>
    </div>
  );
};

export default About;