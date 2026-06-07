"use client";
import { createContext, useContext } from "react";
import { dictionaries, defaultLocale, type Dict, type Locale } from "./dictionaries";

const LocaleContext = createContext<Locale>(defaultLocale);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** Hook for client components. Falls back to the default (English) dictionary without a provider. */
export function useI18n(): { locale: Locale; t: Dict } {
  const locale = useContext(LocaleContext);
  return { locale, t: dictionaries[locale] };
}
