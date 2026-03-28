import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WebcamCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (base64: string) => void;
  maxSize?: number;
}

const WebcamCapture = ({ open, onOpenChange, onCapture, maxSize = 800 }: WebcamCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setCaptured(null);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError("Could not access camera. Please allow camera permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setCaptured(null);
      setError(null);
    }
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    let w = video.videoWidth;
    let h = video.videoHeight;
    if (w > maxSize || h > maxSize) {
      if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
      else { w = Math.round(w * maxSize / h); h = maxSize; }
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    const base64 = dataUrl.split(",")[1];
    setCaptured(dataUrl);
    stopCamera();

    // Store base64 for confirm
    canvas.setAttribute("data-base64", base64);
  };

  const confirmPhoto = () => {
    if (!captured) return;
    const base64 = captured.split(",")[1];
    onCapture(base64);
    onOpenChange(false);
  };

  const retake = () => {
    setCaptured(null);
    startCamera();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera size={18} />
            Take a Photo
          </DialogTitle>
        </DialogHeader>

        <div className="relative w-full aspect-[4/3] bg-black">
          {error ? (
            <div className="w-full h-full flex items-center justify-center p-6 text-center">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          ) : captured ? (
            <img src={captured} alt="Captured" className="w-full h-full object-cover" />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
              style={{ transform: "scaleX(-1)" }}
            />
          )}
        </div>

        <div className="flex justify-center gap-3 p-4">
          {error ? (
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              <X size={14} className="mr-1.5" />
              Close
            </Button>
          ) : captured ? (
            <>
              <Button variant="secondary" className="rounded-full px-5" onClick={retake}>
                <RotateCcw size={14} className="mr-1.5" />
                Retake
              </Button>
              <Button className="rounded-full px-5" onClick={confirmPhoto}>
                <Camera size={14} className="mr-1.5" />
                Use Photo
              </Button>
            </>
          ) : (
            <Button
              className="rounded-full px-8 py-5"
              onClick={takePhoto}
            >
              <Camera size={18} className="mr-2" />
              Capture
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WebcamCapture;
