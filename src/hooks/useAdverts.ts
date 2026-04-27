/**
 * ============================================================
 * useAdverts — Central advert hook
 * ============================================================
 *
 * Handles:
 * - PaidUser logic (PaidUser == "2" → no adverts)
 * - Global enable/disable checks
 * - Slot resolution for the current page
 * - Video trigger dispatching
 *
 * PAID USER LOGIC is handled HERE — advert components
 * simply call `shouldShow` and render nothing if false.
 * ============================================================
 */

import { useCallback, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ADVERT_SETTINGS,
  ADVERT_LIBRARY,
  PAGE_ADVERT_MAP,
  VIDEO_TRIGGERS,
  type AdvertSlotPosition,
  type AdvertDefinition,
} from "@/lib/advertConfig";

/** Check if the current user is a paid user (PaidUser == "2") */
const isPaidUser = (): boolean => {
  try {
    const stored = localStorage.getItem("digitalUser");
    if (!stored) return false;
    const user = JSON.parse(stored);
    // Backend returns either "PaidUser" or "Paiduser" depending on endpoint
    const paid = user?.PaidUser ?? user?.Paiduser;
    return String(paid) === "2";
  } catch {
    return false;
  }
};

export const useAdverts = () => {
  const location = useLocation();
  const [videoAdvert, setVideoAdvert] = useState<AdvertDefinition | null>(null);
  const [videoVisible, setVideoVisible] = useState(false);

  /** Master check: should ANY advert render? */
  const shouldShow = useMemo(() => {
    if (!ADVERT_SETTINGS.enabled) return false;
    if (isPaidUser()) return false;
    return true;
  }, []);

  /** Can image adverts render? */
  const canShowImage = shouldShow && ADVERT_SETTINGS.imageAdsEnabled;

  /** Can video adverts render? */
  const canShowVideo = shouldShow && ADVERT_SETTINGS.videoAdsEnabled;

  /** Current page key (e.g. "profile", "basket") */
  const pageKey = useMemo(() => {
    return location.pathname.replace(/^\//, "") || "index";
  }, [location.pathname]);

  /** Get the advert definition for a given slot on the current page */
  const getSlotAdvert = useCallback(
    (slot: AdvertSlotPosition): AdvertDefinition | null => {
      if (!canShowImage) return null;
      const pageSlots = PAGE_ADVERT_MAP[pageKey];
      if (!pageSlots) return null;
      const advertId = pageSlots[slot];
      if (!advertId) return null;
      return ADVERT_LIBRARY[advertId] ?? null;
    },
    [canShowImage, pageKey]
  );

  /**
   * Trigger a video advert by event name.
   * Usage: showVideoAd("pageEnter")
   */
  const showVideoAd = useCallback(
    (triggerName: string) => {
      if (!canShowVideo) return;
      const advertId = VIDEO_TRIGGERS[triggerName];
      if (!advertId) return;
      const ad = ADVERT_LIBRARY[advertId];
      if (!ad || ad.type !== "video") return;
      setVideoAdvert(ad);
      setVideoVisible(true);
    },
    [canShowVideo]
  );

  /** Dismiss the current video advert */
  const dismissVideoAd = useCallback(() => {
    setVideoVisible(false);
    setVideoAdvert(null);
  }, []);

  return {
    shouldShow,
    canShowImage,
    canShowVideo,
    getSlotAdvert,
    showVideoAd,
    dismissVideoAd,
    videoAdvert,
    videoVisible,
  };
};
