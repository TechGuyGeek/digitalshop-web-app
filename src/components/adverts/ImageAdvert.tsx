/**
 * ImageAdvert — Renders a single image advert or AdSense snippet.
 *
 * Renders nothing if:
 * - adverts are globally disabled
 * - user is paid (PaidUser == "2")
 * - no advert assigned for this slot
 *
 * GOOGLE ADSENSE:
 * When the advert type is "adsense", the component renders
 * the raw HTML from `adsenseCode` using dangerouslySetInnerHTML.
 * Replace test adverts with AdSense code in advertConfig.ts.
 */

import { useEffect, useRef } from "react";
import type { AdvertDefinition } from "@/lib/advertConfig";

interface ImageAdvertProps {
  advert: AdvertDefinition | null;
  className?: string;
}

const ImageAdvert = ({ advert, className = "" }: ImageAdvertProps) => {
  const adsenseRef = useRef<HTMLDivElement>(null);

  // For AdSense: execute injected scripts after mount
  useEffect(() => {
    if (advert?.type === "adsense" && adsenseRef.current) {
      const scripts = adsenseRef.current.querySelectorAll("script");
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");
        Array.from(oldScript.attributes).forEach((attr) =>
          newScript.setAttribute(attr.name, attr.value)
        );
        newScript.textContent = oldScript.textContent;
        oldScript.parentNode?.replaceChild(newScript, oldScript);
      });
    }
  }, [advert]);

  if (!advert) return null;

  // ── AdSense rendering ──────────────────────────────────
  if (advert.type === "adsense" && advert.adsenseCode) {
    return (
      <div
        className={`w-full flex justify-center ${className}`}
        ref={adsenseRef}
        // Replace test adverts with Google AdSense code in advertConfig.ts
        dangerouslySetInnerHTML={{ __html: advert.adsenseCode }}
      />
    );
  }

  // ── Test image advert ──────────────────────────────────
  if (advert.type === "image" && advert.imageUrl) {
    return (
      <div className={`w-full flex justify-center ${className}`}>
        <a
          href={advert.linkUrl || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full max-w-full"
        >
          <div className="relative w-full">
            <img
              src={advert.imageUrl}
              alt={advert.label}
              className="w-full h-auto rounded-md object-contain"
              loading="lazy"
            />
            <span className="absolute top-1 right-1 bg-muted/80 text-muted-foreground text-[10px] px-1.5 py-0.5 rounded">
              Test Advert
            </span>
          </div>
        </a>
      </div>
    );
  }

  return null;
};

export default ImageAdvert;
