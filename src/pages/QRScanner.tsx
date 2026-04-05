import { useRef, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, QrCode, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const QRScanner = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const processedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [processed, setProcessed] = useState(false);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleResult = useCallback(
    (value: string) => {
      // Use ref to guarantee duplicate scan prevention (no stale closure)
      if (processedRef.current) return;

      const trimmed = value.trim();
      console.log("[QRScanner] Raw scanned value:", JSON.stringify(trimmed));

      const scannedCompanyId = parseInt(trimmed, 10);
      console.log("[QRScanner] Parsed companyId:", scannedCompanyId);

      if (isNaN(scannedCompanyId) || scannedCompanyId <= 0) {
        toast.error("Invalid QR code — expected a numeric company ID", {
          description: `Scanned: "${trimmed}"`,
        });
        return;
      }

      // Lock immediately via ref to prevent any duplicate navigation
      processedRef.current = true;
      setProcessed(true);
      stopCamera();

      const navUrl = `/shop-profile?companyid=${scannedCompanyId}`;
      console.log("[QRScanner] Navigating to:", navUrl, "companyId:", scannedCompanyId);
      toast.success(`Opening shop #${scannedCompanyId}…`);
      navigate(navUrl);
    },
    [stopCamera, navigate]
  );

  const startScanning = useCallback(
    async (stream: MediaStream) => {
      // Check for native BarcodeDetector
      if ("BarcodeDetector" in window) {
        try {
          const detector = new (window as any).BarcodeDetector({
            formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39"],
          });
          scanIntervalRef.current = window.setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                handleResult(barcodes[0].rawValue);
              }
            } catch {
              // frame not ready
            }
          }, 300);
          setScanning(true);
          return;
        } catch {
          // BarcodeDetector not supported for these formats
        }
      }

      // Fallback: canvas-based frame capture with manual check prompt
      setScanning(true);
      scanIntervalRef.current = window.setInterval(() => {
        // Without BarcodeDetector we can't decode on-device
        // Show manual entry fallback after a few seconds
      }, 5000);

      // Show fallback message after 3 seconds
      setTimeout(() => {
        if (!processed) {
          setError(
            "Your browser doesn't support automatic QR scanning. Please use a QR scanner app and enter the company ID manually."
          );
          stopCamera();
        }
      }, 3000);
    },
    [handleResult, processed, stopCamera]
  );

  const startCamera = useCallback(async () => {
    setError(null);
    setProcessed(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          startScanning(stream);
        };
      }
    } catch {
      setError("Could not access camera. Please allow camera permissions and try again.");
    }
  }, [startScanning]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Manual ID entry fallback
  const [manualId, setManualId] = useState("");
  const handleManualGo = () => {
    const id = parseInt(manualId.trim(), 10);
    if (isNaN(id) || id <= 0) {
      toast.error("Please enter a valid numeric company ID");
      return;
    }
    navigate(`/shop-profile?companyid=${id}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary/80"
          onClick={() => {
            stopCamera();
            navigate("/view-shops");
          }}
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-primary-foreground font-heading">
          QR Code Scanner
        </h1>
      </div>

      {/* Scanner area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6">
        <div className="relative w-full max-w-sm aspect-square bg-black rounded-2xl overflow-hidden border-2 border-border">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-4">
              <X size={40} className="text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
              <Button size="sm" onClick={startCamera}>
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Scanning overlay */}
              {scanning && !processed && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Corner brackets */}
                  <div className="absolute top-8 left-8 w-12 h-12 border-t-3 border-l-3 border-primary rounded-tl-lg" />
                  <div className="absolute top-8 right-8 w-12 h-12 border-t-3 border-r-3 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-8 left-8 w-12 h-12 border-b-3 border-l-3 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-8 right-8 w-12 h-12 border-b-3 border-r-3 border-primary rounded-br-lg" />
                  {/* Scanning line animation */}
                  <div className="absolute left-8 right-8 h-0.5 bg-primary/80 animate-scan-line" />
                </div>
              )}
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {scanning && !processed && !error && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <QrCode size={16} className="animate-pulse" />
            <span>Point your camera at a QR code…</span>
          </div>
        )}

        {/* Manual entry fallback */}
        <div className="w-full max-w-sm space-y-2 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Or enter a company ID manually:
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="numeric"
              placeholder="e.g. 105"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualGo()}
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button onClick={handleManualGo} size="sm">
              Go
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
