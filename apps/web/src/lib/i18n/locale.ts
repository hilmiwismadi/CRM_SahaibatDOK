export type Locale = "id" | "en";

export const LOCALE_STORAGE_KEY = "sahaibat-locale";

export function formatDate(iso: string | Date, locale: Locale, opts: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", opts);
}

export function formatTime(iso: string | Date, locale: Locale, opts: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleTimeString(locale === "en" ? "en-US" : "id-ID", opts);
}
