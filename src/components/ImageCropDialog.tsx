import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ImageCropDialogProps {
  open: boolean;
  file: File | null;
  onCancel: () => void;
  /** Base64 JPEG data WITHOUT the data: prefix, normalised to 1200x400. */
  onCropped: (base64: string, previewDataUrl: string) => void;
}

const OUT_W = 1200;
const OUT_H = 400;
const STAGE_H = 300;

const ImageCropDialog = ({ open, file, onCancel, onCropped }: ImageCropDialogProps) => {
  const { t } = useLanguage();
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [stageW, setStageW] = useState(600);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Load the selected file
  useEffect(() => {
    if (!open || !file) return;
    setError(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setImgEl(null);
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      imgRef.current = image;
      setImgEl(image);
    };
    image.onerror = () => setError(t("GroupImageLoadFailed"));
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [open, file, t]);

  // Track stage width
  useEffect(() => {
    if (!open) return;
    const measure = () => setStageW(stageRef.current?.clientWidth || 600);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, imgEl]);

  const cropW = stageW;
  const cropH = stageW / 3;
  const baseScale = imgEl ? Math.max(cropW / imgEl.naturalWidth, cropH / imgEl.naturalHeight) : 1;
  const scale = baseScale * zoom;
  const dw = imgEl ? imgEl.naturalWidth * scale : 0;
  const dh = imgEl ? imgEl.naturalHeight * scale : 0;

  const clamp = useCallback(
    (x: number, y: number) => {
      const maxX = Math.max(0, (dw - cropW) / 2);
      const maxY = Math.max(0, (dh - cropH) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, x)),
        y: Math.min(maxY, Math.max(-maxY, y)),
      };
    },
    [dw, dh, cropW, cropH]
  );

  useEffect(() => {
    setOffset((o) => clamp(o.x, o.y));
  }, [clamp]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, tx: offset.x, ty: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setOffset(clamp(d.tx + (e.clientX - d.x), d.ty + (e.clientY - d.y)));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const handleDone = () => {
    const image = imgRef.current;
    if (!image) return;
    setBusy(true);
    try {
      const imgLeft = stageW / 2 + offset.x - dw / 2;
      const imgTop = STAGE_H / 2 + offset.y - dh / 2;
      const winLeft = 0;
      const winTop = (STAGE_H - cropH) / 2;
      const sx = (winLeft - imgLeft) / scale;
      const sy = (winTop - imgTop) / scale;
      const sw = cropW / scale;
      const sh = cropH / scale;

      const canvas = document.createElement("canvas");
      canvas.width = OUT_W;
      canvas.height = OUT_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas context");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, OUT_W, OUT_H);
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, OUT_W, OUT_H);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const base64 = dataUrl.split(",")[1];
      if (!base64) throw new Error("empty encode");
      onCropped(base64, dataUrl);
    } catch {
      setError(t("GroupImageCropFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center">{t("GroupImageCropTitle")}</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-center text-muted-foreground">{t("GroupImageCropHint")}</p>

        <div
          ref={stageRef}
          className="relative w-full overflow-hidden rounded-lg bg-black touch-none select-none cursor-grab active:cursor-grabbing"
          style={{ height: STAGE_H }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {imgEl && (
            <img
              src={imgEl.src}
              alt=""
              draggable={false}
              className="absolute pointer-events-none max-w-none"
              style={{
                width: dw,
                height: dh,
                left: stageW / 2 + offset.x - dw / 2,
                top: STAGE_H / 2 + offset.y - dh / 2,
              }}
            />
          )}
          {/* dim mask outside the 3:1 saved area */}
          <div className="absolute inset-x-0 top-0 bg-black/60 pointer-events-none" style={{ height: (STAGE_H - cropH) / 2 }} />
          <div className="absolute inset-x-0 bottom-0 bg-black/60 pointer-events-none" style={{ height: (STAGE_H - cropH) / 2 }} />
          <div
            className="absolute inset-x-0 border-2 border-white pointer-events-none"
            style={{ top: (STAGE_H - cropH) / 2, height: cropH }}
          />
          {!imgEl && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="animate-spin text-white" size={28} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <ZoomOut size={16} className="text-muted-foreground" />
          <Slider value={[zoom]} min={1} max={4} step={0.01} onValueChange={(v) => setZoom(v[0])} className="flex-1" />
          <ZoomIn size={16} className="text-muted-foreground" />
        </div>

        {error && <p className="text-sm text-destructive text-center">{error}</p>}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleDone} disabled={!imgEl || busy}>
            {busy ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
            {t("GroupImageUsePhoto")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropDialog;