export interface Coordinates {
  lat: number;
  lng: number;
}

export function isValidCoordinate(value: Coordinates | null | undefined): value is Coordinates {
  if (!value || !Number.isFinite(value.lat) || !Number.isFinite(value.lng)) return false;
  if (value.lat < -90 || value.lat > 90 || value.lng < -180 || value.lng > 180) return false;
  return !(value.lat === 0 && value.lng === 0);
}

export function haversineMiles(from: Coordinates, to: Coordinates): number | null {
  if (!isValidCoordinate(from) || !isValidCoordinate(to)) return null;
  const earthRadiusMiles = 3958.8;
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = toRadians(to.lat - from.lat);
  const longitudeDelta = toRadians(to.lng - from.lng);
  const latitude1 = toRadians(from.lat);
  const latitude2 = toRadians(to.lat);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusMiles * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
}

export function formatDistanceMiles(distance: number | null | undefined): string | null {
  if (distance == null || !Number.isFinite(distance)) return null;
  return `${distance.toFixed(2)} mi`;
}
