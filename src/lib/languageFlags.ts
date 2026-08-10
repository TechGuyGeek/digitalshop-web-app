// Local flag graphics for each of the 37 supported language codes.
// SVGs come from the in-repo `flag-icons` package (4x3 ratio) — no external URLs.
const flagUrls = import.meta.glob("/node_modules/flag-icons/flags/4x3/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

// language code -> ISO country / subdivision flag file
const LANGUAGE_COUNTRY: Record<string, string> = {
  "af-ZA": "za",
  "am-ET": "et",
  "ar-AE": "ae",
  "ca-ES": "es",
  "cy-GB": "gb-wls",
  "da-DK": "dk",
  "de-DE": "de",
  "el-GR": "gr",
  "en-AU": "au",
  "en-GB": "gb",
  "en-IE": "ie",
  "en-US": "us",
  en: "gb",
  "es-ES": "es",
  "fi-FI": "fi",
  "fr-FR": "fr",
  "gd-GB": "gb-sct",
  "he-IL": "il",
  "hi-IN": "in",
  "hu-HU": "hu",
  "is-IS": "is",
  "it-IT": "it",
  "ja-JP": "jp",
  kkj: "cm",
  "ko-KR": "kr",
  "nl-NL": "nl",
  "pa-IN": "in",
  "pl-PL": "pl",
  "pt-PT": "pt",
  "ro-RO": "ro",
  "ru-RU": "ru",
  "sv-SE": "se",
  "th-TH": "th",
  "tr-TR": "tr",
  "uk-UA": "ua",
  "zh-CN": "cn",
  "zh-TW": "tw",
};

/** Country/subdivision code used for a language, or "" when unknown. */
export function getLanguageCountry(code: string): string {
  if (LANGUAGE_COUNTRY[code]) return LANGUAGE_COUNTRY[code];
  const region = code.split("-")[1];
  return region ? region.toLowerCase() : "";
}

/** Local URL of the flag SVG for a language code, or undefined. */
export function getLanguageFlagSrc(code: string): string | undefined {
  const country = getLanguageCountry(code);
  if (!country) return undefined;
  return flagUrls[`/node_modules/flag-icons/flags/4x3/${country}.svg`];
}
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