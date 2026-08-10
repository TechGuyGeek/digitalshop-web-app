import { getLanguageFlagSrc } from "@/lib/languageFlags";
import { cn } from "@/lib/utils";

interface LanguageFlagProps {
  code: string;
  label: string;
  className?: string;
}

/**
 * Rectangular 4:3 flag graphic (local SVG) shown beside a language name,
 * matching the native Android/iOS language picker.
 */
const LanguageFlag = ({ code, label, className }: LanguageFlagProps) => {
  const src = getLanguageFlagSrc(code);
  if (!src) {
    return <span className={cn("h-[15px] w-5 shrink-0 rounded-[2px] bg-muted", className)} aria-hidden="true" />;
  }
  return (
    <img
      src={src}
      alt={`${label} flag`}
      width={20}
      height={15}
      loading="lazy"
      decoding="async"
      className={cn(
        "h-[15px] w-5 shrink-0 rounded-[2px] object-cover shadow-sm ring-1 ring-black/10",
        className,
      )}
    />
  );
};

export default LanguageFlag;