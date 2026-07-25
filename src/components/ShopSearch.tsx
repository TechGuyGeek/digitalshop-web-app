import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { NearbyShop } from "@/lib/nearbyShops";
import { useLanguage } from "@/contexts/LanguageContext";
import { getMarkerIconUrl, DEFAULT_MARKER_ICON } from "@/lib/mapMarkerIcons";

interface ShopSearchProps {
  shops: NearbyShop[];
  onSelect: (shop: NearbyShop) => void;
  className?: string;
}

/**
 * Overlay search box that filters the already-loaded shops by name, description
 * and category. Does not fetch any extra data. Keyboard + screen-reader friendly.
 */
const ShopSearch = ({ shops, onSelect, className = "" }: ShopSearchProps) => {
  const { t } = useLanguage();
  const [raw, setRaw] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce input slightly so filtering doesn't churn on every keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => setQuery(raw.trim().toLowerCase()), 120);
    return () => window.clearTimeout(id);
  }, [raw]);

  const results = useMemo(() => {
    if (!query) return [];
    return shops
      .filter((s) => {
        const hay = `${s.name} ${s.description ?? ""} ${s.categoryLabel}`.toLowerCase();
        return hay.includes(query);
      })
      .slice(0, 25);
  }, [shops, query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const choose = (shop: NearbyShop) => {
    onSelect(shop);
    setOpen(false);
    inputRef.current?.blur();
  };

  const clear = () => {
    setRaw("");
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); return; }
    if (!results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => (h + 1) % results.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => (h - 1 + results.length) % results.length); }
    else if (e.key === "Enter") { e.preventDefault(); choose(results[highlight] ?? results[0]); }
  };

  const placeholder = t("SearchShopsOrLocations");
  const noResultsLabel = t("NoShopsFound");
  const clearLabel = t("ClearSearch");
  const resultsLabel = t("SearchResults");

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open && !!raw}
          aria-controls="shop-search-results"
          aria-autocomplete="list"
          aria-label={placeholder}
          value={raw}
          onChange={(e) => { setRaw(e.target.value); setOpen(true); setHighlight(0); }}
          onFocus={() => raw && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full h-10 pl-9 pr-9 rounded-md bg-background/95 backdrop-blur border border-border text-sm text-foreground placeholder:text-muted-foreground shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {raw && (
          <button
            type="button"
            onClick={clear}
            aria-label={clearLabel}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && raw && (
        <div
          id="shop-search-results"
          role="listbox"
          aria-label={resultsLabel}
          className="absolute left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-lg z-[1001]"
        >
          {results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">{noResultsLabel}</div>
          ) : (
            results.map((shop, i) => (
              <button
                key={shop.companyid}
                role="option"
                aria-selected={i === highlight}
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => choose(shop)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${i === highlight ? "bg-accent" : "hover:bg-accent/60"}`}
              >
                <img
                  src={getMarkerIconUrl({ categoryCode: shop.categoryCode, emoji: shop.icon })}
                  alt=""
                  className="w-6 h-6 object-contain flex-shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_MARKER_ICON; }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{shop.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {shop.categoryLabel}
                    {shop.description ? ` · ${shop.description}` : ""}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ShopSearch;