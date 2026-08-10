// Flag emoji for each of the 37 supported language codes.
// Region-subtag driven (e.g. "fr-FR" -> FR), with explicit entries for the
// codes that have no usable region subtag or use a UK subdivision flag.
const EXPLICIT_FLAGS: Record<string, string> = {
  en: "\u{1F1EC}\u{1F1E7}", // English (generic) -> United Kingdom
  kkj: "\u{1F1E8}\u{1F1F2}", // Kako -> Cameroon
  "cy-GB": "\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}", // Wales
  "gd-GB": "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}", // Scotland
};

function regionToFlag(region: string): string {
  return region
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

/** Returns the flag emoji for a language code, or "" when unknown. */
export function getLanguageFlag(code: string): string {
  if (EXPLICIT_FLAGS[code]) return EXPLICIT_FLAGS[code];
  const region = code.split("-")[1];
  if (region && /^[A-Za-z]{2}$/.test(region)) return regionToFlag(region);
  return "";
}