"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { currentUser } from "@/lib/auth/current-user";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";

export async function setHandle(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const t = getDictionary(await getLocale());

  const raw = String(formData.get("handle") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9-]{3,20}$/.test(raw) || raw.startsWith("-") || raw.endsWith("-")) {
    return { error: t.handleInvalid };
  }
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.handle, raw))
    .limit(1);
  if (existing[0] && existing[0].id !== user.id) {
    return { error: t.handleTaken };
  }
  await db.update(users).set({ handle: raw }).where(eq(users.id, user.id));
  redirect("/");
}
