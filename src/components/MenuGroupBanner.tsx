interface MenuGroupBannerProps {
  src: string | null;
  alt: string;
  className?: string;
}

/**
 * Fixed 3:1 "chocolate bar" banner. Portrait/square sources are cropped with
 * object-cover and can never make the card taller.
 */
const MenuGroupBanner = ({ src, alt, className = "" }: MenuGroupBannerProps) => {
  if (!src) return null;
  return (
    <div className={`w-full aspect-[3/1] overflow-hidden rounded-lg bg-muted ${className}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.currentTarget.parentElement as HTMLElement).style.display = "none";
        }}
      />
    </div>
  );
};

export default MenuGroupBanner;