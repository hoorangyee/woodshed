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

/** 관리자 여부: role='admin' 또는 AUTH_ADMIN_EMAILS 허용목록. */
export function isAdmin(user: Pick<CurrentUser, "role" | "email"> | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return !!user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
}

/** 현재 세션 사용자의 DB 레코드(핸들·role 포함). 미로그인이면 null. */
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

/** 로그인 + 핸들 온보딩을 강제. 미로그인→/login, 핸들 미설정→/onboarding. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!user.handle) redirect("/onboarding");
  return user;
}

/** 관리자 전용. 비관리자는 홈으로. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!isAdmin(user)) redirect("/");
  return user!;
}
