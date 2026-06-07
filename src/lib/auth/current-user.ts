import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export interface CurrentUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  handle: string | null;
  role: string;
}

const ADMIN_EMAILS = (process.env.AUTH_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** Admin check: role='admin' or in the AUTH_ADMIN_EMAILS allowlist. */
export function isAdmin(user: Pick<CurrentUser, "role" | "email"> | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return !!user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
}

/** The session user's DB record (incl. handle, role). null if not signed in. */
export async function currentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      handle: users.handle,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** Require sign-in + handle onboarding. No session → /login; no handle → /onboarding. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!user.handle) redirect("/onboarding");
  return user;
}

/** Admin only. Non-admins are redirected home. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!isAdmin(user)) redirect("/");
  return user!;
}
