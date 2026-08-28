import { useRef, useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, QrCode, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import AdvertSlot from "@/components/adverts/AdvertSlot";
import ProfileHelpAssistant from "@/components/ProfileHelpAssistant";
import { resolveOrderPaymentQr } from "@/lib/orderPaymentQr";
import { orderQrTokenFromPayload } from "@/lib/v1Api";

interface DetectedBarcode { rawValue?: string | null; }
interface BrowserBarcodeDetector { detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>; }
interface BrowserBarcodeDetectorConstructor { new (options: { formats: string[] }): BrowserBarcodeDetector; }
type BarcodeDetectorWindow = Window & { BarcodeDetector?: BrowserBarcodeDetectorConstructor };

const QRScanner = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { t } = useLanguage();
  const orderMode = params.get("mode") === "order";
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const processedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [processed, setProcessed] = useState(false);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setScanning(false);
  }, []);

  const handleResult = useCallback((value: string) => {
    if (processedRef.current) return;
    if (orderMode) {
      const token = orderQrTokenFromPayload(value);
      if (!token) { toast.error(t("Therewasanerror")); return; }
      processedRef.current = true; setProcessed(true); stopCamera();
      void resolveOrderPaymentQr(token)
        .then((resolution) => navigate(`/company-orders?companyid=${encodeURIComponent(String(resolution.company_id))}&scan_reference=${encodeURIComponent(resolution.order_id)}`))
        .catch((error: unknown) => { processedRef.current = false; setProcessed(false); setError(error instanceof Error ? error.message : t("Therewasanerror")); });
      return;
    }
    const trimmed = value.trim();
    const scannedCompanyId = parseInt(trimmed, 10);
    if (isNaN(scannedCompanyId) || scannedCompanyId <= 0) { toast.error(t("Therewasanerror")); return; }
    processedRef.current = true; setProcessed(true); stopCamera();
    navigate(`/shop-profile?companyid=${scannedCompanyId}`);
  }, [orderMode, stopCamera, navigate, t]);

  const startScanning = useCallback(async (stream: MediaStream) => {
    const BarcodeDetector = (window as BarcodeDetectorWindow).BarcodeDetector;
    if (BarcodeDetector) {
      try {
        const detector = new BarcodeDetector({ formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39"] });
        scanIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const value = (await detector.detect(videoRef.current))[0]?.rawValue;
            if (value) handleResult(value);
          } catch {
            // A frame can be incomplete while the camera is warming up; keep scanning.
          }
        }, 300);
        setScanning(true); return;
      } catch {
        // Use the existing non-detector camera fallback below.
      }
    }
    setScanning(true);
    setTimeout(() => { if (!processed) { setError(t("PermissionsDenied")); stopCamera(); } }, 3000);
  }, [handleResult, processed, stopCamera, t]);

  const startCamera = useCallback(async () => {
    setError(null); setProcessed(false); processedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.onloadedmetadata = () => startScanning(stream); }
    } catch { setError(t("PermissionsDenied")); }
  }, [startScanning, t]);

  useEffect(() => { startCamera(); return () => stopCamera(); }, [startCamera, stopCamera]);

  const [manualId, setManualId] = useState("");
  const handleManualGo = () => {
    if (orderMode) { handleResult(manualId); return; }
    const id = parseInt(manualId.trim(), 10); if (isNaN(id) || id <= 0) { toast.error(t("Therewasanerror")); return; } navigate(`/shop-profile?companyid=${id}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-primary px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => { stopCamera(); navigate(orderMode ? "/company-orders" : "/view-shops"); }}><ArrowLeft size={20} /></Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">{orderMode ? t("ScanOrderQr") : t("Scan")}</h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6">
        <div className="w-full max-w-sm">
          <ProfileHelpAssistant translationKey="HELPBARCODE" />
        </div>
        <div className="relative w-full max-w-sm aspect-square bg-black rounded-2xl overflow-hidden border-2 border-border">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-4">
              <X size={40} className="text-destructive" /><p className="text-sm text-destructive">{error}</p>
              <Button size="sm" onClick={startCamera}>{t("Scan")}</Button>
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {scanning && !processed && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-8 left-8 w-12 h-12 border-t-3 border-l-3 border-primary rounded-tl-lg" />
                  <div className="absolute top-8 right-8 w-12 h-12 border-t-3 border-r-3 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-8 left-8 w-12 h-12 border-b-3 border-l-3 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-8 right-8 w-12 h-12 border-b-3 border-r-3 border-primary rounded-br-lg" />
                  <div className="absolute left-8 right-8 h-0.5 bg-primary/80 animate-scan-line" />
                </div>
              )}
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
        {scanning && !processed && !error && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><QrCode size={16} className="animate-pulse" /><span>{t("Pleasewait")}</span></div>
        )}
        <div className="w-full max-w-sm space-y-2 pt-4 border-t border-border">
          <div className="flex gap-2">
            <input type={orderMode ? "text" : "number"} inputMode={orderMode ? "url" : "numeric"} placeholder={orderMode ? "https://stage-web.gpsshops.com/…" : "e.g. 105"} value={manualId} onChange={(e) => setManualId(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleManualGo()} className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <Button onClick={handleManualGo} size="sm">{t("OK")}</Button>
          </div>
        </div>
        <AdvertSlot position="bottomBanner" className="w-full max-w-sm pt-4" />
      </div>
    </div>
  );
};

export default QRScanner;
