import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { customerOrderImageUrl } from "@/lib/customerOrderImage";

interface CustomerOrderImageProps {
  path: string | undefined;
  alt: string;
  className?: string;
  iconSize?: number;
}

export default function CustomerOrderImage({ path, alt, className = "", iconSize = 24 }: CustomerOrderImageProps) {
  const src = customerOrderImageUrl(path);
  const [failed, setFailed] = useState(!src);

  useEffect(() => { setFailed(!src); }, [src]);

  return (
    <div className={`relative flex items-center justify-center bg-gradient-to-br from-accent/30 to-muted overflow-hidden ${className}`}>
      {!failed && <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover" onError={() => setFailed(true)} />}
      {failed && <User className="text-muted-foreground" size={iconSize} aria-label="Customer profile image unavailable" />}
    </div>
  );
}
