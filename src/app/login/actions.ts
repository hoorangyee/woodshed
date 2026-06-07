"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

export async function login(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  if (password !== process.env.APP_PASSWORD) {
    return { error: "비밀번호가 올바르지 않습니다." };
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
