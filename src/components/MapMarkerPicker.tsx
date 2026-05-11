import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface MapMarkerOption {
  id: number;
  emoji: string;
  label: string;
  iconUrl: string;
}

const MARKER_ICON_BASE = "https://gpsshops.com/map-icons/";

export const MAP_MARKERS: MapMarkerOption[] = [
  { id: 1,  emoji: "🏪", label: "SHOP ICON",            iconUrl: MARKER_ICON_BASE + "shop01.png" },
  { id: 2,  emoji: "🍻", label: "PUB ICON",             iconUrl: MARKER_ICON_BASE + "pub02.png" },
  { id: 3,  emoji: "☕", label: "CAFE ICON",            iconUrl: MARKER_ICON_BASE + "cafe03.png" },
  { id: 4,  emoji: "🍴", label: "RESTAURANT ICON",      iconUrl: MARKER_ICON_BASE + "restaurant04.png" },
  { id: 5,  emoji: "🏠", label: "HOME ICON",            iconUrl: MARKER_ICON_BASE + "home05.png" },
  { id: 6,  emoji: "🎪", label: "MOBILE ICON",          iconUrl: MARKER_ICON_BASE + "mobile06.png" },
  { id: 7,  emoji: "🧸", label: "TOYS ICON",            iconUrl: MARKER_ICON_BASE + "toys07.png" },
  { id: 8,  emoji: "🥪", label: "SANDWICHES ICON",      iconUrl: MARKER_ICON_BASE + "sandwichs08.png" },
  { id: 9,  emoji: "📍", label: "GOOGLE ICON",          iconUrl: MARKER_ICON_BASE + "google09.png" },
  { id: 10, emoji: "🍳", label: "BREAKFAST ICON",       iconUrl: MARKER_ICON_BASE + "breakfast10.png" },
  { id: 11, emoji: "👔", label: "MENS CLOTHING ICON",   iconUrl: MARKER_ICON_BASE + "clothing11.png" },
  { id: 12, emoji: "👗", label: "LADIES CLOTHING ICON", iconUrl: MARKER_ICON_BASE + "clothing12.png" },
  { id: 13, emoji: "🔢", label: "DIGITS ICON",          iconUrl: MARKER_ICON_BASE + "digit.png" },
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
                <img
                  src={marker.iconUrl}
                  alt={marker.label}
                  className="w-12 h-12 object-contain mb-1"
                />
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
