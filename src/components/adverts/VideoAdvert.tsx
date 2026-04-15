/**
 * VideoAdvert — Full-screen video advert overlay.
 *
 * Renders nothing if:
 * - not visible
 * - no advert provided
 *
 * PaidUser check is handled by useAdverts hook — this component
 * will never receive data for paid users.
 *
 * GOOGLE ADSENSE:
 * For video ads via AdSense, set type to "adsense" and provide
 * the adsenseCode. The component will render raw HTML.
 */

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdvertDefinition } from "@/lib/advertConfig";

interface VideoAdvertProps {
  advert: AdvertDefinition | null;
  visible: boolean;
  onDismiss: () => void;
}

const VideoAdvert = ({ advert, visible, onDismiss }: VideoAdvertProps) => {
  const adsenseRef = useRef<HTMLDivElement>(null);

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

  if (!visible || !advert) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center">
      <div className="relative w-full max-w-md mx-4">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -top-10 right-0 text-white hover:bg-white/20"
          onClick={onDismiss}
        >
          <X size={24} />
        </Button>

        {/* Label */}
        <span className="absolute top-2 left-2 bg-muted/80 text-muted-foreground text-[10px] px-1.5 py-0.5 rounded z-10">
          Test Video Advert
        </span>

        {/* ── AdSense video ────────────────────────────── */}
        {advert.type === "adsense" && advert.adsenseCode ? (
          <div
            ref={adsenseRef}
            // Replace with Google AdSense video code in advertConfig.ts
            dangerouslySetInnerHTML={{ __html: advert.adsenseCode }}
          />
        ) : (
          /* ── Test video ────────────────────────────── */
          <video
            src={advert.videoUrl}
            controls
            autoPlay
            className="w-full rounded-lg"
            onEnded={onDismiss}
          />
        )}
      </div>
    </div>
  );
};

export default VideoAdvert;
