/// <reference types="google.maps" />
import { useEffect, useRef } from "react";

interface GoogleMapProps {
  className?: string;
  shops?: { name: string; icon: string; lat?: number; lng?: number }[];
}

const GoogleMap = ({ className = "", shops = [] }: GoogleMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const loadGoogleMaps = () => {
      if ((window as any).google?.maps) {
        initMap();
        return;
      }
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyC2FqDdFRLWpEeGLijR2zN8b2Ue-AeWgbo&callback=Function.prototype`;
      script.async = true;
      script.onload = () => initMap();
      document.head.appendChild(script);
    };

    const initMap = () => {
      if (!(window as any).google?.maps) {
        setTimeout(initMap, 200);
        return;
      }

      const center = { lat: 53.3498, lng: -6.2603 }; // Dublin default

      const map = new google.maps.Map(mapRef.current!, {
        center,
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
        ],
      });

      mapInstanceRef.current = map;

      // Add markers for shops that have coordinates
      shops.forEach((shop) => {
        if (shop.lat && shop.lng) {
          new google.maps.Marker({
            position: { lat: shop.lat, lng: shop.lng },
            map,
            title: shop.name,
            label: shop.icon,
          });
        }
      });
    };

    initMap();
  }, [shops]);

  return <div ref={mapRef} className={className} />;
};

export default GoogleMap;
