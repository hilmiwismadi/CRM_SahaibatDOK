"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LOCALE_STORAGE_KEY, type Locale } from "./locale";
import { translations, type Translations } from "./translations";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// Default is "id" (matches the app's original all-Indonesian copy) both on
// the server render and on the client's first render, so hydration never
// mismatches — the real preference (if different) is read from
// localStorage in an effect and applied on the next render, same pattern
// AppSidebar already uses for its collapsed/expanded width.
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("id");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored === "id" || stored === "en") setLocaleState(stored);
    } catch {
      // localStorage unavailable — stay on default "id".
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, l);
    } catch {
      // ignore — per-viewer convenience only
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({ locale, setLocale, t: translations[locale] }),
    [locale, setLocale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
