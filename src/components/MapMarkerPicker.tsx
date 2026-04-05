import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface MapMarkerOption {
  id: number;
  emoji: string;
  label: string;
}

export const MAP_MARKERS: MapMarkerOption[] = [
  { id: 1, emoji: "🏪", label: "SHOP ICON" },
  { id: 2, emoji: "🍻", label: "PUB ICON" },
  { id: 3, emoji: "☕", label: "CAFE ICON" },
  { id: 4, emoji: "🍴", label: "RESTAURANT ICON" },
  { id: 5, emoji: "🏠", label: "HOME ICON" },
  { id: 6, emoji: "🎪", label: "MOBILE ICON" },
  { id: 7, emoji: "🧸", label: "TOYS ICON" },
  { id: 8, emoji: "🥪", label: "SANDWICHES ICON" },
  { id: 9, emoji: "📍", label: "GOOGLE ICON" },
  { id: 10, emoji: "🍳", label: "BREAKFAST ICON" },
  { id: 11, emoji: "👔", label: "MENS CLOTHING ICON" },
  { id: 12, emoji: "👗", label: "LADIES CLOTHING ICON" },
];

interface MapMarkerPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (marker: MapMarkerOption) => void;
  selectedId: number;
}

const MapMarkerPicker = ({ open, onOpenChange, onSelect, selectedId }: MapMarkerPickerProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] p-0 bg-[hsl(var(--muted))]">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-center text-foreground">Choose a Map Marker</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground text-xs">
            Select an icon to represent your shop on the map
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="divide-y divide-border">
            {MAP_MARKERS.map((marker) => (
              <button
                key={marker.id}
                onClick={() => onSelect(marker)}
                className={`w-full flex flex-col items-center py-4 hover:bg-accent/50 transition-colors ${
                  selectedId === marker.id ? "bg-accent" : ""
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
