"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function login(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  if (password !== process.env.APP_PASSWORD) {
    return { error: getDictionary(await getLocale()).wrongPassword };
  }
  const token = await createSessionToken(process.env.SESSION_SECRET ?? "");
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  redirect("/");
}
