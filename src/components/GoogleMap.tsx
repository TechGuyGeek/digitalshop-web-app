/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";

interface GoogleMapProps {
  className?: string;
  shops?: { name: string; icon: string; lat?: number; lng?: number; companyid?: number }[];
  onShopClick?: (shop: { name: string; icon: string; companyid?: number }) => void;
}

const MAPS_KEY = "AIzaSyAN76Tb-dL_5pvp-w1iFhxWqI52sDnoz5c";

const GoogleMap = ({ className = "", shops = [], onShopClick }: GoogleMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
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
        zoom: 14,
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
      }

      // Shop markers – emoji only, no red pin
      shops.forEach((shop) => {
        if (shop.lat && shop.lng) {
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
          new google.maps.Marker({
            position: { lat: shop.lat, lng: shop.lng },
            map,
            title: shop.name,
            icon: {
              url: canvas.toDataURL(),
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 20),
            },
          });
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
