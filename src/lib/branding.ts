/** Replace only the known demo copy; stored shop descriptions remain untouched. */
export function gpsShopsShareDescription(value: string): string {
  return value.replace(
    /This is a demo shop to show what a shop could look like on Digital shop for testing purposes\.?/i,
    (match) => match.replace(/Digital shop/i, "GPS Shops"),
  );
}
