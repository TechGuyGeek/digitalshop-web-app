import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const MAP_MARKERS = [
  { emoji: "🏪", label: "SHOP ICON" },
  { emoji: "🍻", label: "PUB ICON" },
  { emoji: "☕", label: "CAFE ICON" },
  { emoji: "🍴", label: "RESTAURANT ICON" },
  { emoji: "🏠", label: "HOME ICON" },
  { emoji: "🎪", label: "MOBILE ICON" },
  { emoji: "🧸", label: "TOYS ICON" },
  { emoji: "🥪", label: "SANDWICHES ICON" },
  { emoji: "📍", label: "GOOGLE ICON" },
  { emoji: "🍳", label: "BREAKFAST ICON" },
  { emoji: "👔", label: "MENS CLOTHING ICON" },
  { emoji: "👗", label: "LADIES CLOTHING ICON" },
];

interface MapMarkerPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (emoji: string, label: string) => void;
  selected: string;
}

const MapMarkerPicker = ({ open, onOpenChange, onSelect, selected }: MapMarkerPickerProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] p-0 bg-[hsl(var(--muted))]">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-center text-foreground">Choose a Map Marker</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="divide-y divide-border">
            {MAP_MARKERS.map((marker) => (
              <button
                key={marker.label}
                onClick={() => {
                  onSelect(marker.emoji, marker.label);
                  onOpenChange(false);
                }}
                className={`w-full flex flex-col items-center py-4 hover:bg-accent/50 transition-colors ${
                  selected === marker.emoji ? "bg-accent" : ""
                }`}
              >
                <span className="text-5xl mb-1">{marker.emoji}</span>
                <span className="text-xs font-bold tracking-wider text-foreground uppercase">
                  {marker.label}
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default MapMarkerPicker;
