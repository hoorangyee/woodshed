"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { socialRepo } from "@/lib/db/social";
import { licksRepo } from "@/lib/db/licks";
import { currentUser } from "@/lib/auth/current-user";
import type { Visibility } from "@/lib/db/schema";

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

const COMMENT_RATE_LIMIT = 5; // 분당 최대 댓글 수
const COMMENT_WINDOW_MS = 60_000;

export async function addComment(lickId: string, formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const parsed = commentSchema.safeParse(formData.get("body"));
  if (!parsed.success) return;
  // 레이트리밋: 1분에 5개 초과면 무시
  const recent = await socialRepo.comments.recentCountByUser(user.id, Date.now() - COMMENT_WINDOW_MS);
  if (recent >= COMMENT_RATE_LIMIT) return;
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

/* ── 컬렉션 ─────────────────────────────────────────────── */
const titleSchema = z.string().trim().min(1).max(100);

export async function createCollection(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const title = titleSchema.safeParse(formData.get("title"));
  if (!title.success) return;
  const visibility = (String(formData.get("visibility") ?? "private") as Visibility) ?? "private";
  const id = await socialRepo.collections.create(user.id, { title: title.data, visibility });
  revalidatePath("/collections");
  redirect(`/collections/${id}`);
}

export async function deleteCollection(id: string) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const c = await socialRepo.collections.get(id);
  if (!c || c.ownerId !== user.id) redirect("/collections");
  await socialRepo.collections.remove(id);
  revalidatePath("/collections");
  redirect("/collections");
}

/** 컬렉션에 릭 추가/제거 토글. 새 포함 상태를 반환. */
export async function toggleInCollection(collectionId: string, lickId: string): Promise<boolean> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const c = await socialRepo.collections.get(collectionId);
  if (!c || c.ownerId !== user.id) return false;
  const contained = await socialRepo.collections.collectionIdsContaining(user.id, lickId);
  if (contained.includes(collectionId)) {
    await socialRepo.collections.removeLick(collectionId, lickId);
    revalidatePath(`/collections/${collectionId}`);
    return false;
  }
  await socialRepo.collections.addLick(collectionId, lickId);
  revalidatePath(`/collections/${collectionId}`);
  return true;
}

export async function removeFromCollection(collectionId: string, lickId: string) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const c = await socialRepo.collections.get(collectionId);
  if (!c || c.ownerId !== user.id) return;
  await socialRepo.collections.removeLick(collectionId, lickId);
  revalidatePath(`/collections/${collectionId}`);
}
