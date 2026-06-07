"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { moderationRepo, type TargetType } from "@/lib/db/moderation";
import { currentUser, isAdmin } from "@/lib/auth/current-user";

const reasonSchema = z.string().trim().min(1).max(300);

/** 신고 생성. 성공 여부 반환(클라이언트 피드백용). */
export async function reportContent(
  targetType: TargetType,
  targetId: string,
  reason: string,
): Promise<boolean> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const parsed = reasonSchema.safeParse(reason);
  if (!parsed.success) return false;
  // 중복 방지: 같은 대상에 이미 미처리 신고가 있으면 멱등 처리
  if (await moderationRepo.hasOpenReport(user.id, targetType, targetId)) return true;
  await moderationRepo.createReport({
    targetType,
    targetId,
    reporterId: user.id,
    reason: parsed.data,
  });
  return true;
}

/* ── 관리자 모더레이션 ──────────────────────────────────── */
export async function adminHideLick(id: string, hidden: boolean) {
  if (!isAdmin(await currentUser())) redirect("/");
  await moderationRepo.hideLick(id, hidden);
  revalidatePath("/admin");
  revalidatePath(`/licks/${id}`);
  revalidatePath("/explore");
}

export async function adminHideComment(id: string, hidden: boolean) {
  if (!isAdmin(await currentUser())) redirect("/");
  await moderationRepo.hideComment(id, hidden);
  revalidatePath("/admin");
}

export async function adminSetReport(id: string, status: "resolved" | "dismissed") {
  if (!isAdmin(await currentUser())) redirect("/");
  await moderationRepo.setReportStatus(id, status);
  revalidatePath("/admin");
}
