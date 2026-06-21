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

  const mapShops = shops.map((s) => ({ name: s.name, icon: s.icon, lat: s.lat, lng: s.lng, companyid: s.companyid }));

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
          interactive={false}
        />
      )}
    </div>
  );
};

export default BackgroundMap;