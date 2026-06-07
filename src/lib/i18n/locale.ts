import { cookies } from "next/headers";
import { defaultLocale, type Locale } from "./dictionaries";

export const LOCALE_COOKIE = "locale";

/** 서버 전용: 쿠키에서 로케일을 읽는다. 기본값은 영어. */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return value === "ko" || value === "en" ? value : defaultLocale;
}
