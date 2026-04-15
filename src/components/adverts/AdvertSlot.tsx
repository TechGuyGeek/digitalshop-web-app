/**
 * AdvertSlot — Drop-in slot component for any page.
 *
 * Usage:
 *   <AdvertSlot position="topBanner" />
 *   <AdvertSlot position="bottomBanner" className="my-4" />
 *
 * Automatically resolves the correct advert for the current
 * page and slot position via useAdverts + advertConfig.
 *
 * Renders nothing if no advert is assigned or user is paid.
 */

import { useAdverts } from "@/hooks/useAdverts";
import ImageAdvert from "./ImageAdvert";
import type { AdvertSlotPosition } from "@/lib/advertConfig";

interface AdvertSlotProps {
  position: AdvertSlotPosition;
  className?: string;
}

const AdvertSlot = ({ position, className = "" }: AdvertSlotProps) => {
  const { getSlotAdvert } = useAdverts();
  const advert = getSlotAdvert(position);

  if (!advert) return null;

  return <ImageAdvert advert={advert} className={className} />;
};

export default AdvertSlot;
