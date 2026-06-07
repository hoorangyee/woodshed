import { cookies } from "next/headers";
import { defaultLocale, type Locale } from "./dictionaries";

export const LOCALE_COOKIE = "locale";

/** Server-only: reads the locale from the cookie. Defaults to English. */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return value === "ko" || value === "en" ? value : defaultLocale;
}
