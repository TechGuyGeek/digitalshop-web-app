import { useEffect, useState } from "react";
import GoogleMap from "@/components/GoogleMap";
import { fetchNearbyShops, NearbyShop } from "@/lib/nearbyShops";

/**
 * Live map shown as the app background for the "main" theme.
 * Centers on user's GPS, plots nearby (free) shops, non-interactive.
 */
const BackgroundMap = () => {
  const [shops, setShops] = useState<NearbyShop[]>([]);
  const [ready, setReady] = useState(false);
  const [hasGps, setHasGps] = useState(false);
  const [forcedCenter, setForcedCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  // Safe default location used when GPS is denied/unavailable/times out.
  // Chosen as a well-known city so the cinematic zoom still looks meaningful.
  const FALLBACK_CENTER = { lat: 51.5074, lng: -0.1278 }; // London

  useEffect(() => {
    // If the active page (e.g. /build-shop) already obtained GPS and stashed
    // its coords, reuse them so the background map aligns with the inner map.
    let shared: { lat: number; lng: number } | null = null;
    try {
      const raw = sessionStorage.getItem("buildShopCoords");
      if (raw) shared = JSON.parse(raw);
    } catch { /* ignore */ }

    if (shared && Number.isFinite(shared.lat) && Number.isFinite(shared.lng)) {
      fetchNearbyShops(shared.lat, shared.lng, "free").then(setShops).catch(() => {});
      // Seed a fake geolocation so GoogleMap centers on the shared coords.
      setForcedCenter(shared);
      setHasGps(true);
      setReady(true);
      return;
    }

    if (!navigator.geolocation) { setReady(true); return; }
    if (!navigator.geolocation) {
      setForcedCenter(FALLBACK_CENTER);
      setUsedFallback(true);
      setHasGps(true);
      setReady(true);
      return;
    }

    let settled = false;
    const useFallback = () => {
      if (settled) return;
      settled = true;
      setForcedCenter(FALLBACK_CENTER);
      setUsedFallback(true);
      setHasGps(true); // enables cinematic zoom-in animation
      setReady(true);
    };

    // If the user doesn't answer the permission prompt within 8s,
    // start the fallback cinematic animation so the app isn't stuck.
    const promptTimer = window.setTimeout(useFallback, 8000);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(promptTimer);
        try {
          const results = await fetchNearbyShops(pos.coords.latitude, pos.coords.longitude, "free");
          setShops(results);
        } catch { /* ignore */ }
        setHasGps(true);
        setReady(true);
      },
      () => {
        window.clearTimeout(promptTimer);
        useFallback();
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const mapShops: { name: string; icon: string; lat?: number; lng?: number; companyid?: number }[] = [];

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    >
      {ready && (
        <GoogleMap
          className="h-full w-full"
          shops={mapShops}
          defaultZoom={hasGps ? 18 : 2}
          forcedCenter={forcedCenter}
          rangeCircleMetres={0}
          worldViewFallback={false}
          cinematicZoom={hasGps}
          showCinematicCounter={false}
          hideUserMarker
          interactive={false}
        />
      )}
    </div>
  );
};

export default BackgroundMap;