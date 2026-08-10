import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Grid2X2, ImagePlus, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import MenuGroupBanner from "@/components/MenuGroupBanner";
import ImageCropDialog from "@/components/ImageCropDialog";
import {
  MENU_GROUP_PRESETS,
  MenuGroupImage,
  PresetKey,
  presetSrc,
  resolveMenuGroupImageUrl,
  saveMenuGroupImage,
  SaveGroupImageAuth,
  SaveGroupImagePayload,
} from "@/lib/menuGroupImages";

interface MenuGroupImagePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string | number;
  groupId: string | number;
  groupName: string;
  current?: MenuGroupImage | null;
  auth: SaveGroupImageAuth | null;
  onSaved: (meta: MenuGroupImage) => void;
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const MenuGroupImagePicker = ({
  open, onOpenChange, companyId, groupId, groupName, current, auth, onSaved,
}: MenuGroupImagePickerProps) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [retryPayload, setRetryPayload] = useState<SaveGroupImagePayload | null>(null);

  const previewUrl = localPreview ?? resolveMenuGroupImageUrl(current);

  const persist = async (payload: SaveGroupImagePayload) => {
    if (!auth || !auth.userId) {
      toast.error(t("Therewasanerror"));
      return;
    }
    setSaving(true);
    const result = await saveMenuGroupImage(auth, companyId, groupId, payload);
    setSaving(false);

    if (!result.success) {
      setRetryPayload(payload);
      toast.error(t("GroupImageSaveFailed"));
      return;
    }

    setRetryPayload(null);
    const stamp = new Date().toISOString();
    if (payload.imageSource === "preset") {
      onSaved({ groupId: String(groupId), imageSource: "preset", presetKey: payload.presetKey, updatedAt: stamp });
    } else if (payload.imageSource === "none") {
      onSaved({ groupId: String(groupId), imageSource: "none", updatedAt: stamp });
    } else {
      // keep the freshly cropped local preview until the next metadata refresh
      onSaved({ groupId: String(groupId), imageSource: "custom", customImagePath: null, updatedAt: stamp });
    }
    toast.success(t("SaveSuccessful"));
    setShowPresets(false);
    onOpenChange(false);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("GroupImageInvalidFile"));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(t("GroupImageTooLarge"));
      return;
    }
    setCropFile(file);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">{t("GroupImageTitle")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-center text-sm font-semibold text-foreground">{groupName}</p>

            {previewUrl ? (
              <MenuGroupBanner src={previewUrl} alt={groupName} />
            ) : (
              <div className="w-full aspect-[3/1] rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground">
                {t("GroupImageNone")}
              </div>
            )}

            {retryPayload && (
              <div className="rounded-md border border-destructive/50 p-3 space-y-2">
                <p className="text-sm text-destructive">{t("GroupImageSaveFailedRetry")}</p>
                <Button size="sm" variant="outline" disabled={saving} onClick={() => persist(retryPayload)}>
                  {saving ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
                  {t("TryAgain")}
                </Button>
              </div>
            )}

            <div className="divide-y divide-border rounded-lg border border-border">
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 disabled:opacity-50"
                disabled={saving}
                onClick={() => setShowPresets(true)}
              >
                <Grid2X2 size={18} className="text-muted-foreground" />
                <span className="text-sm">{t("GroupImageChoosePreset")}</span>
              </button>
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 disabled:opacity-50"
                disabled={saving}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus size={18} className="text-muted-foreground" />
                <span className="text-sm">{t("GroupImageChooseOwn")}</span>
              </button>
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 disabled:opacity-50"
                disabled={saving}
                onClick={() => { setLocalPreview(null); persist({ imageSource: "none" }); }}
              >
                <Undo2 size={18} className="text-muted-foreground" />
                <span className="text-sm">{t("GroupImageRemove")}</span>
              </button>
            </div>

            {saving && (
              <div className="flex justify-center">
                <Loader2 className="animate-spin text-primary" size={20} />
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Preset gallery */}
      <Dialog open={showPresets} onOpenChange={(o) => { if (!saving) setShowPresets(o); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">{t("GroupImageTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {MENU_GROUP_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                disabled={saving}
                className="w-full rounded-lg overflow-hidden border border-border hover:border-primary transition-colors text-left disabled:opacity-50"
                onClick={() => { setLocalPreview(presetSrc(preset.key)); persist({ imageSource: "preset", presetKey: preset.key as PresetKey }); }}
              >
                <MenuGroupBanner src={presetSrc(preset.key)} alt={t(preset.labelKey)} className="rounded-none" />
                <div className="px-3 py-2 text-sm font-medium bg-card">{t(preset.labelKey)}</div>
              </button>
            ))}
            <Button variant="secondary" className="w-full" disabled={saving} onClick={() => setShowPresets(false)}>
              {t("Cancel")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ImageCropDialog
        open={!!cropFile}
        file={cropFile}
        onCancel={() => setCropFile(null)}
        onCropped={(base64, preview) => {
          setCropFile(null);
          setLocalPreview(preview);
          persist({ imageSource: "custom", imageBase64: base64 });
        }}
      />
    </>
  );
};

export default MenuGroupImagePicker;