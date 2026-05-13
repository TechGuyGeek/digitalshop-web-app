import { useRef, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface QRCodeGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number | string;
  companyName: string;
}

const QRCodeGenerator = ({ open, onOpenChange, companyId, companyName }: QRCodeGeneratorProps) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const handleSave = useCallback(() => {
    const canvas = canvasContainerRef.current?.querySelector("canvas");
    if (!canvas) {
      console.error("[QRCodeGenerator] No canvas found");
      return;
    }

    const link = document.createElement("a");
    link.download = `${companyName.replace(/[^a-zA-Z0-9]/g, "_")}_QRCode.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [companyId, companyName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-heading">
            {companyName}
          </DialogTitle>
          <DialogDescription className="text-center">
            QR Code Generator
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          <div ref={canvasContainerRef} className="bg-white p-4 rounded-lg">
            <QRCodeCanvas
              value={String(companyId)}
              size={220}
              level="M"
              includeMargin={false}
            />
          </div>

          <p className="text-sm text-muted-foreground text-center">
            {companyName} is using the Digital Shop App
          </p>

          <Button className="w-full" onClick={handleSave}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeGenerator;
