import { Link } from "react-router-dom";

const SiteFooter = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border/60 bg-background/80 px-6 py-6 mt-8">
      <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
        <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
          About
        </Link>
        <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
          Contact
        </Link>
        <Link to="/legal" className="text-muted-foreground hover:text-foreground transition-colors">
          Legal
        </Link>
      </nav>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        &copy; {year} GPS Shops. Your shop — anywhere.
      </p>
    </footer>
  );
};

export default SiteFooter;