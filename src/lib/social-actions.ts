"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { socialRepo } from "@/lib/db/social";
import { licksRepo } from "@/lib/db/licks";
import { currentUser } from "@/lib/auth/current-user";

/* ── 좋아요 ─────────────────────────────────────────────── */
export async function toggleLike(lickId: string): Promise<{ liked: boolean; count: number }> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const liked = await socialRepo.likes.toggle(user.id, lickId);
  const count = await socialRepo.likes.count(lickId);
  revalidatePath(`/licks/${lickId}`);
  return { liked, count };
}

/* ── 댓글 ───────────────────────────────────────────────── */
const commentSchema = z.string().trim().min(1).max(1000);

export async function addComment(lickId: string, formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const parsed = commentSchema.safeParse(formData.get("body"));
  if (!parsed.success) return;
  await socialRepo.comments.add(lickId, user.id, parsed.data);
  revalidatePath(`/licks/${lickId}`);
}

export async function deleteComment(commentId: string, lickId: string) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const c = await socialRepo.comments.get(commentId);
  if (!c) return;
  const lick = await licksRepo.get(lickId);
  // 댓글 작성자 또는 릭 소유자만 삭제 가능
  if (c.userId !== user.id && lick?.ownerId !== user.id) return;
  await socialRepo.comments.remove(commentId);
  revalidatePath(`/licks/${lickId}`);
}
