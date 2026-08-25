import { useEffect, useState } from "react";
import { Package, User } from "lucide-react";
import { customerOrderImageUrl } from "@/lib/customerOrderImage";

interface CustomerOrderImageProps {
  path: string | undefined;
  alt: string;
  className?: string;
  iconSize?: number;
  variant?: "customer" | "product";
}

export default function CustomerOrderImage({ path, alt, className = "", iconSize = 24, variant = "customer" }: CustomerOrderImageProps) {
  const src = customerOrderImageUrl(path);
  const [failed, setFailed] = useState(!src);
  const FallbackIcon = variant === "product" ? Package : User;

  useEffect(() => { setFailed(!src); }, [src]);

  return (
    <div className={`relative flex items-center justify-center bg-gradient-to-br from-accent/30 to-muted overflow-hidden ${className}`}>
      {!failed && <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover" onError={() => setFailed(true)} />}
      {failed && <FallbackIcon className="text-muted-foreground" size={iconSize} aria-label={variant === "product" ? "Product image unavailable" : "Customer profile image unavailable"} />}
    </div>
  );
}
