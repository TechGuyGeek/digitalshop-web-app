/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";

interface GoogleMapProps {
  className?: string;
  shops?: { name: string; icon: string; lat?: number; lng?: number; companyid?: number }[];
  onShopClick?: (shop: { name: string; icon: string; companyid?: number }) => void;
  defaultZoom?: number;
  rangeCircleMetres?: number;
}

const MAPS_KEY = "AIzaSyAN76Tb-dL_5pvp-w1iFhxWqI52sDnoz5c";

const GoogleMap = ({ className = "", shops = [], onShopClick, defaultZoom = 14, rangeCircleMetres }: GoogleMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(true);

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

  useEffect(() => {
    if (locating || !mapRef.current) return;

    const center = userPos || { lat: 53.3498, lng: -6.2603 };

    const initMap = () => {
      if (!(window as any).google?.maps) {
        setTimeout(initMap, 200);
        return;
      }

      const map = new google.maps.Map(mapRef.current!, {
        center,
        zoom: defaultZoom,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
        ],
      });

      mapInstanceRef.current = map;

      // User location marker
      if (userPos) {
        new google.maps.Marker({
          position: userPos,
          map,
          title: "You are here",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#4285F4",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        });

        // Range circle overlay
        if (rangeCircleMetres && rangeCircleMetres > 0) {
          if (circleRef.current) circleRef.current.setMap(null);
          circleRef.current = new google.maps.Circle({
            center: userPos,
            radius: rangeCircleMetres,
            map,
            fillColor: "#4285F4",
            fillOpacity: 0.06,
            strokeColor: "#4285F4",
            strokeOpacity: 0.3,
            strokeWeight: 1.5,
          });
        }
      }

      // Shop markers – emoji only, no red pin
      shops.forEach((shop) => {
        if (shop.lat && shop.lng) {
          const isDemo = shop.icon === "🔢";
          let iconConfig: google.maps.Icon;

          if (isDemo) {
            iconConfig = {
              url: `${import.meta.env.BASE_URL}demo-shop-icon.png`,
              scaledSize: new google.maps.Size(44, 44),
              anchor: new google.maps.Point(22, 22),
            };
          } else {
            const canvas = document.createElement("canvas");
            canvas.width = 48;
            canvas.height = 48;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.font = "36px serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(shop.icon, 24, 24);
            }
            iconConfig = {
              url: canvas.toDataURL(),
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 20),
            };
          }

          const marker = new google.maps.Marker({
            position: { lat: shop.lat, lng: shop.lng },
            map,
            title: shop.name,
            icon: iconConfig,
          });
          if (onShopClick) {
            marker.addListener("click", () => onShopClick(shop));
          }
        }
      });
    };

    if ((window as any).google?.maps) {
      initMap();
    } else {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&callback=Function.prototype`;
      script.async = true;
      script.onload = () => initMap();
      document.head.appendChild(script);
    }
  }, [locating, userPos, shops]);

  return (
    <div ref={mapRef} className={className}>
      {locating && (
        <div className="flex items-center justify-center h-full bg-muted text-muted-foreground text-sm">
          Finding your location…
        </div>
      )}
    </div>
  );
};

export default GoogleMap;
