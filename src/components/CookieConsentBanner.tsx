import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { setConsent, trackPageview, type ConsentState } from "@/lib/analytics";

const STORAGE_KEY = "gpsshops.cookieConsent.v1";

type StoredConsent = {
  analytics: boolean;
  ads: boolean;
  decidedAt: string;
};

function applyConsent(c: { analytics: boolean; ads: boolean }) {
  const state: ConsentState = {
    analytics_storage: c.analytics ? "granted" : "denied",
    ad_storage: c.ads ? "granted" : "denied",
    ad_user_data: c.ads ? "granted" : "denied",
    ad_personalization: c.ads ? "granted" : "denied",
  };
  setConsent(state);
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [ads, setAds] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setVisible(true);
        return;
      }
      const stored = JSON.parse(raw) as StoredConsent;
      applyConsent(stored);
    } catch {
      setVisible(true);
    }
  }, []);

  const persist = (c: { analytics: boolean; ads: boolean }) => {
    const stored: StoredConsent = { ...c, decidedAt: new Date().toISOString() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      /* ignore */
    }
    applyConsent(c);
  };

  const handleAccept = () => {
    persist({ analytics: true, ads: true });
    setVisible(false);
    setManageOpen(false);
    // Fire a fresh page_view now that analytics_storage is granted.
    trackPageview(window.location.pathname + window.location.search);
  };

  const handleReject = () => {
    persist({ analytics: false, ads: false });
    setVisible(false);
    setManageOpen(false);
  };

  const handleSave = () => {
    persist({ analytics, ads });
    setVisible(false);
    setManageOpen(false);
    if (analytics) {
      trackPageview(window.location.pathname + window.location.search);
    }
  };

  if (!visible) return null;

  return (
    <>
      <div
        role="dialog"
        aria-live="polite"
        aria-label="Cookie consent"
        className="fixed bottom-0 left-1/2 z-[100] w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-background/95 p-4 shadow-2xl backdrop-blur"
      >
        <p className="mb-3 text-xs text-foreground/90">
          We use cookies for essential features and, with your consent, for
          analytics and ads to improve GPS Shops. See our{" "}
          <a href="/privacy" className="underline">
            privacy policy
          </a>
          .
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleAccept} className="flex-1 min-w-[90px]">
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReject}
            className="flex-1 min-w-[90px]"
          >
            Reject
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setManageOpen(true)}
            className="flex-1 min-w-[90px]"
          >
            Manage
          </Button>
        </div>
      </div>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Cookie preferences</DialogTitle>
            <DialogDescription>
              Choose which categories of cookies to allow. Essential cookies
              are always on.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Essential</p>
                <p className="text-xs text-muted-foreground">
                  Required for the site to work.
                </p>
              </div>
              <Switch checked disabled />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Analytics</p>
                <p className="text-xs text-muted-foreground">
                  Helps us understand usage (GA4).
                </p>
              </div>
              <Switch checked={analytics} onCheckedChange={setAnalytics} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Advertising</p>
                <p className="text-xs text-muted-foreground">
                  Personalised ads and measurement.
                </p>
              </div>
              <Switch checked={ads} onCheckedChange={setAds} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleReject}>
              Reject all
            </Button>
            <Button onClick={handleSave}>Save choices</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}