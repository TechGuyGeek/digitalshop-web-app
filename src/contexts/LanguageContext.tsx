import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// Available translation files mapped to display names
const LANGUAGE_MAP: Record<string, string> = {
  "af-ZA": "Afrikaans",
  "am-ET": "Amharic (Ethiopian)",
  "ar-AE": "Arabic",
  "ca-ES": "Catalan",
  "cy-GB": "Welsh",
  "da-DK": "Danish",
  "de-DE": "German",
  "el-GR": "Greek",
  "en-AU": "English (Australian)",
  "en-GB": "English (British)",
  "en-IE": "English (Irish)",
  "en-US": "English (American)",
  "en": "English",
  "es-ES": "Spanish",
  "fi-FI": "Finnish",
  "fr-FR": "French",
  "gd-GB": "Scottish Gaelic",
  "he-IL": "Hebrew",
  "hi-IN": "Hindi",
  "hu-HU": "Hungarian",
  "is-IS": "Icelandic",
  "it-IT": "Italian",
  "ja-JP": "Japanese",
  "kkj": "Kako",
  "ko-KR": "Korean",
  "nl-NL": "Dutch",
  "pa-IN": "Punjabi",
  "pl-PL": "Polish",
  "pt-PT": "Portuguese",
  "ro-RO": "Romanian",
  "ru-RU": "Russian",
  "sv-SE": "Swedish",
  "th-TH": "Thai",
  "tr-TR": "Turkish",
  "uk-UA": "Ukrainian",
  "zh-CN": "Chinese (Simplified)",
  "zh-TW": "Chinese (Traditional)",
};

type Translations = Record<string, string>;

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
  availableLanguages: { code: string; name: string }[];
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "digitalShopLanguage";
const TRANSLATIONS_PATH = "/DigitalShopTranslationsJson";

const AVAILABLE_CODES = Object.keys(LANGUAGE_MAP);

function detectBrowserLanguage(): string {
  const browserLang = navigator.language; // e.g. "en-GB", "fr-FR", "pt"
  // Exact match
  if (AVAILABLE_CODES.includes(browserLang)) {
    console.log(`[i18n] Browser language "${browserLang}" matched exactly`);
    return browserLang;
  }
  // Base language match (e.g. "en" from "en-GB")
  const base = browserLang.split("-")[0];
  if (AVAILABLE_CODES.includes(base)) {
    console.log(`[i18n] Browser base language "${base}" matched`);
    return base;
  }
  // Find first code starting with base (e.g. "fr" -> "fr-FR")
  const partial = AVAILABLE_CODES.find((c) => c.startsWith(base + "-"));
  if (partial) {
    console.log(`[i18n] Browser language "${browserLang}" partially matched to "${partial}"`);
    return partial;
  }
  console.log(`[i18n] No match for browser language "${browserLang}", falling back to en`);
  return "en";
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    return detectBrowserLanguage();
  });
  const [translations, setTranslations] = useState<Translations>({});
  const [fallback, setFallback] = useState<Translations>({});
  const [loading, setLoading] = useState(true);

  const availableLanguages = Object.entries(LANGUAGE_MAP).map(([code, name]) => ({ code, name }));

  // Load fallback (en.json) once
  useEffect(() => {
    fetch(`${TRANSLATIONS_PATH}/en.json`)
      .then((r) => r.json())
      .then((data) => setFallback(data))
      .catch((err) => console.error("[i18n] Failed to load en.json fallback:", err));
  }, []);

  // Load selected language
  useEffect(() => {
    setLoading(true);
    fetch(`${TRANSLATIONS_PATH}/${language}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setTranslations(data);
        console.log(`[i18n] Loaded ${language}.json with ${Object.keys(data).length} keys`);
      })
      .catch((err) => {
        console.error(`[i18n] Failed to load ${language}.json:`, err);
        setTranslations({});
      })
      .finally(() => setLoading(false));
  }, [language]);

  const setLanguage = useCallback((lang: string) => {
    localStorage.setItem(STORAGE_KEY, lang);
    setLanguageState(lang);
  }, []);

  // selectedLanguage[key] ?? en[key] ?? key
  const t = useCallback(
    (key: string): string => {
      const val = translations[key];
      if (val && val !== "Need review") return val;
      const fb = fallback[key];
      if (fb && fb !== "Need review") return fb;
      return key;
    },
    [translations, fallback]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, availableLanguages, loading }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
