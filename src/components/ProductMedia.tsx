import { useMemo, useState, type MouseEvent } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMenuImageUrl } from "@/lib/authClient";
import { buildProductMediaSequence } from "@/lib/productMedia";

export interface ProductMediaProps {
  images?: string[];
  youtubeVideoId?: string | null;
  alt: string;
  className?: string;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}

/** Opt-in browser YouTube playback; the image pager remains independent and touch-friendly. */
const ProductMedia = ({ images = [], youtubeVideoId, alt, className = "", onClick }: ProductMediaProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const media = useMemo(() => buildProductMediaSequence(images, youtubeVideoId), [images, youtubeVideoId]);

  if (media.length === 0) {
    return <div className={`flex h-full items-center justify-center bg-gradient-to-br from-accent/30 to-muted ${className}`}><span className="text-4xl">🍽️</span></div>;
  }

  const current = media[Math.min(activeIndex, media.length - 1)];
  const move = (delta: number) => {
    setPlaying(false);
    setActiveIndex((index) => (index + delta + media.length) % media.length);
  };

  return (
    <div className={`relative h-full overflow-hidden bg-muted ${className}`} onClick={onClick}>
      {current.kind === "video" ? (
        playing ? (
          <iframe
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${encodeURIComponent(current.id)}?playsinline=1&rel=0`}
            title={`${alt} video`}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="group relative h-full w-full"
            aria-label={`Play ${alt} video`}
            onClick={(event) => { event.stopPropagation(); setPlaying(true); }}
          >
            <img
              src={`https://i.ytimg.com/vi/${encodeURIComponent(current.id)}/hqdefault.jpg`}
              alt=""
              className="h-full w-full object-cover"
              onError={(event) => { event.currentTarget.style.display = "none"; }}
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover:bg-black/35">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg"><Play size={25} fill="currentColor" /></span>
            </span>
            <span className="absolute left-3 top-3 rounded bg-black/65 px-2 py-1 text-xs font-semibold text-white">Video</span>
          </button>
        )
      ) : (
        <img
          src={/^data:image\//i.test(current.path) ? current.path : getMenuImageUrl(current.path)}
          alt={alt}
          className="h-full w-full object-cover"
        />
      )}

      {media.length > 1 && (
        <>
          <Button type="button" variant="secondary" size="icon" className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-black/55 text-white hover:bg-black/75" onClick={(event) => { event.stopPropagation(); move(-1); }} aria-label="Previous media"><ChevronLeft size={17} /></Button>
          <Button type="button" variant="secondary" size="icon" className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-black/55 text-white hover:bg-black/75" onClick={(event) => { event.stopPropagation(); move(1); }} aria-label="Next media"><ChevronRight size={17} /></Button>
          <span className="absolute bottom-2 right-2 rounded bg-black/65 px-2 py-1 text-xs font-semibold text-white">{activeIndex + 1} / {media.length}</span>
        </>
      )}
    </div>
  );
};

export default ProductMedia;
