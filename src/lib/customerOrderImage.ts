import { getMenuImageUrl } from "@/lib/authClient";

export function customerOrderImageUrl(path: string | undefined): string {
  const url = getMenuImageUrl(path);
  return url.includes("/menu1/api/v1/menu-image.php?") ? url : "";
}
