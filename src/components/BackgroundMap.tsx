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
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const results = await fetchNearbyShops(pos.coords.latitude, pos.coords.longitude, "free");
          setShops(results);
        } catch { /* ignore */ }
        setHasGps(true);
        setReady(true);
      },
      () => setReady(true),
      { enableHighAccuracy: true, timeout: 10000 }
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
          rangeCircleMetres={0}
          worldViewFallback={!hasGps}
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