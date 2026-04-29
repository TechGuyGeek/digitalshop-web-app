import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const About = () => {
  const { t } = useLanguage();

  return (
    <div className="relative min-h-screen bg-background text-foreground">

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
          people with the shops, services, and experiences around them — wherever
          they are in the world.
        </p>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          We combine the power of local discovery with the convenience of online
          shopping, helping businesses create beautiful digital storefronts that
          customers can find instantly through map-based search and global
          discovery.
        </p>

        <section className="space-y-4 mb-8">
          <h2 className="font-heading text-2xl text-foreground">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed">
            We believe local commerce should feel as effortless as scrolling a
            feed.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            From a single market stall to a growing retail chain, every business
            deserves the ability to be discovered, browsed, and supported online
            without needing expensive websites, complex systems, or large
            marketing budgets.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Shop-a-Verse makes that possible.
          </p>
        </section>

        <section className="space-y-6 mb-8">
          <h2 className="font-heading text-2xl text-foreground">What You Can Do</h2>

          <div className="space-y-2">
            <h3 className="font-heading text-lg text-foreground">Discover Nearby Shops</h3>
            <p className="text-muted-foreground leading-relaxed">
              Use the interactive map to explore shops, services, and local
              businesses near your current location.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-heading text-lg text-foreground">Browse and Order</h3>
            <p className="text-muted-foreground leading-relaxed">
              View menus, products, and services, build your basket, and place
              orders quickly from your phone.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-heading text-lg text-foreground">Open Your Own Shop</h3>
            <p className="text-muted-foreground leading-relaxed">
              Create and manage your own digital storefront with a powerful
              mobile-first dashboard designed for speed and simplicity.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-heading text-lg text-foreground">Go Global</h3>
            <p className="text-muted-foreground leading-relaxed">
              Upgrade to Pro Mode to unlock Global Shop visibility, custom GPS
              location settings, reduced adverts, and premium features.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-heading text-lg text-foreground">Multi-Language and Multi-Theme</h3>
            <p className="text-muted-foreground leading-relaxed">
              Use the platform in your preferred language and theme for a fully
              personalised experience.
            </p>
          </div>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="font-heading text-2xl text-foreground">Why Shop-a-Verse?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Because the future of shopping is not just online.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            It is local, global, mobile, and immediate.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            It is your shop — anywhere.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="font-heading text-2xl text-foreground">Founder Vision</h2>
          <p className="text-muted-foreground leading-relaxed">
            Shop-a-Verse began as an idea to bridge the gap between physical
            shops and the digital world.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Long before modern AI tools and rapid app builders, the vision was
            simple:
          </p>
          <p className="text-muted-foreground leading-relaxed italic">
            Make it possible for any business, anywhere, to create a digital
            shop that customers could discover instantly through location and
            mobile technology.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            This original founder video shares the early concept behind what is
            now Shop-a-Verse.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            While the platform has evolved significantly since then, the
            mission remains the same:
          </p>
          <p className="text-foreground font-heading text-lg">
            Your shop — anywhere.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Watch the original concept video below.
          </p>
          <div className="relative w-full overflow-hidden rounded-lg border border-border bg-muted" style={{ paddingBottom: "56.25%" }}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src="https://www.youtube.com/embed/fT_XSVrbfqM?start=4"
              title="Shop-a-Verse founder concept video"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-heading text-2xl text-foreground">Get In Touch</h2>
          <p className="text-muted-foreground leading-relaxed">
            Questions, feedback, partnerships, or want to list your shop?
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Contact us at:{" "}
            <a
              href="mailto:jason@techguygeek.com"
              className="text-primary hover:underline"
            >
              jason@techguygeek.com
            </a>
          </p>
        </section>
      </main>
    </div>
  );
};

export default About;