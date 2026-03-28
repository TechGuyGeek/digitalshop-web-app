import { getCategoryByCode } from "./shopCategories";

const SERVER_DOMAIN = "https://app.techguygeek.co.uk/";

export interface NearbyCompany {
  companyid: number;
  companyname: string;
  companylat: number;
  companylong: number;
  companyphoto?: string;
  CompanyDescription?: string;
  PublicNumber: number;
  distance: number;
}

export interface NearbyShop {
  companyid: number;
  name: string;
  icon: string;
  lat: number;
  lng: number;
  photo?: string;
  description?: string;
  categoryCode: number;
  categoryLabel: string;
  distance: number;
}

export async function fetchGlobalShops(): Promise<NearbyShop[]> {
  const url = SERVER_DOMAIN + "menu1/PHPread/ClientMenu/GetlocationPointsGlobal.php";
  const response = await fetch(url);
  return parseShopsResponse(await response.text(), false);
}

export async function fetchNearbyShops(lat: number, lng: number, variant: "free" | "paid" = "free"): Promise<NearbyShop[]> {
  const endpoint = variant === "paid"
    ? "menu1/PHPread/ClientMenu/GetlocationPointsPaid.php"
    : "menu1/PHPread/ClientMenu/GetlocationPoints.php";
  const url = SERVER_DOMAIN + endpoint;

  const formData = new URLSearchParams();
  formData.append("lat", String(lat));
  formData.append("lon", String(lng));

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  return parseShopsResponse(await response.text(), true);
}

function parseShopsResponse(text: string, hasDistance: boolean): NearbyShop[] {
  if (!text || text.trim() === "") return [];

  try {
    const companies: NearbyCompany[] = JSON.parse(text);
    if (!Array.isArray(companies)) return [];

    return companies.map((c) => {
      const cat = getCategoryByCode(Number(c.PublicNumber) || 0);
      return {
        companyid: c.companyid,
        name: c.companyname || "Unknown Shop",
        icon: cat.emoji,
        lat: Number(c.companylat),
        lng: Number(c.companylong),
        photo: c.companyphoto || undefined,
        description: c.CompanyDescription || undefined,
        categoryCode: cat.id,
        categoryLabel: cat.label,
        distance: hasDistance ? (Number(c.distance) || 0) : 0,
      };
    });
  } catch {
    console.error("Failed to parse shops response:", text);
    return [];
  }
}
