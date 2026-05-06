import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface GoogleMapProps {
  className?: string;
  shops?: { name: string; icon: string; lat?: number; lng?: number; companyid?: number }[];
  onShopClick?: (shop: { name: string; icon: string; companyid?: number }) => void;
  defaultZoom?: number;
  rangeCircleMetres?: number;
}

const TILE_URL = "https://maps.techguygeek.co.uk/tiles/osm/webmercator/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = "© OpenStreetMap contributors";

const GoogleMap = ({ className = "", shops = [], onShopClick, defaultZoom = 14, rangeCircleMetres }: GoogleMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const shopLayerRef = useRef<L.LayerGroup | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  // Get user GPS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocating(false);
        },
        () => setLocating(false),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocating(false);
    }
  }, []);

  // Initialise map once container is mounted
  useEffect(() => {
    if (locating || !mapRef.current || mapInstanceRef.current) return;

    const center = userPos || { lat: 53.3498, lng: -6.2603 };

    const map = L.map(mapRef.current, {
      center: [center.lat, center.lng],
      zoom: defaultZoom,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(TILE_URL, {
      maxZoom: 19,
      attribution: TILE_ATTRIBUTION,
    }).addTo(map);

    shopLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    setMapReady(true);

    // Ensure correct sizing once visible
    setTimeout(() => map.invalidateSize(), 50);

    // Recalculate map size when container resizes (e.g. expand/collapse)
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(() => map.invalidateSize(), 200);
    });
    resizeObserver.observe(map.getContainer());

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      shopLayerRef.current = null;
      circleRef.current = null;
      userMarkerRef.current = null;
      setMapReady(false);
    };
  }, [locating]);

  // User position marker + range circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userPos) return;

    map.setView([userPos.lat, userPos.lng], defaultZoom);

    if (userMarkerRef.current) userMarkerRef.current.remove();
    userMarkerRef.current = L.circleMarker([userPos.lat, userPos.lng], {
      radius: 8,
      fillColor: "#4285F4",
      fillOpacity: 1,
      color: "#ffffff",
      weight: 2,
    }).addTo(map);

    if (circleRef.current) {
      circleRef.current.remove();
      circleRef.current = null;
    }
    if (rangeCircleMetres && rangeCircleMetres > 0) {
      circleRef.current = L.circle([userPos.lat, userPos.lng], {
        radius: rangeCircleMetres,
        fillColor: "#4285F4",
        fillOpacity: 0.06,
        color: "#4285F4",
        opacity: 0.3,
        weight: 1.5,
      }).addTo(map);
    }
  }, [userPos, rangeCircleMetres, defaultZoom]);

  // Shop markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = shopLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    shops.forEach((shop) => {
      if (shop.lat == null || shop.lng == null) return;
      const isDemo = shop.icon === "🔢";
      const html = isDemo
        ? `<img src="${import.meta.env.BASE_URL}demo-shop-icon.png" style="width:44px;height:44px;display:block;" alt="" />`
        : `<div style="font-size:32px;line-height:1;text-align:center;">${shop.icon}</div>`;
      const size = isDemo ? 44 : 40;
      const divIcon = L.divIcon({
        html,
        className: "shopaverse-emoji-marker",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      const marker = L.marker([shop.lat, shop.lng], { icon: divIcon, title: shop.name }).addTo(layer);
      if (onShopClick) {
        marker.on("click", () => onShopClick(shop));
      }
    });
  }, [shops, onShopClick, mapReady]);

  return (
    <div className={className} style={{ position: "relative" }}>
      {locating ? (
        <div className="flex items-center justify-center h-full bg-muted text-muted-foreground text-sm">
          Finding your location…
        </div>
      ) : (
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      )}
    </div>
  );
};

export default GoogleMap;
