"use client";
import { createContext, useContext } from "react";
import { dictionaries, defaultLocale, type Dict, type Locale } from "./dictionaries";

const LocaleContext = createContext<Locale>(defaultLocale);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** 클라이언트 컴포넌트용 훅. 프로바이더가 없으면 기본(영어) 사전으로 폴백. */
export function useI18n(): { locale: Locale; t: Dict } {
  const locale = useContext(LocaleContext);
  return { locale, t: dictionaries[locale] };
}
