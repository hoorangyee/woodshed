"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { socialRepo } from "@/lib/db/social";
import { licksRepo } from "@/lib/db/licks";
import { currentUser } from "@/lib/auth/current-user";
import type { Visibility } from "@/lib/db/schema";

/* ── Likes ─────────────────────────────────────────────── */
export async function toggleLike(lickId: string): Promise<{ liked: boolean; count: number }> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const liked = await socialRepo.likes.toggle(user.id, lickId);
  const count = await socialRepo.likes.count(lickId);
  revalidatePath(`/licks/${lickId}`);
  return { liked, count };
}

/* ── Comments ───────────────────────────────────────────────── */
const commentSchema = z.string().trim().min(1).max(1000);

const COMMENT_RATE_LIMIT = 5; // max comments per minute
const COMMENT_WINDOW_MS = 60_000;

export async function addComment(lickId: string, formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const parsed = commentSchema.safeParse(formData.get("body"));
  if (!parsed.success) return;
  // Rate limit: drop if more than 5 in the last minute
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
  // Only the comment author or the lick owner may delete
  if (c.userId !== user.id && lick?.ownerId !== user.id) return;
  await socialRepo.comments.remove(commentId);
  revalidatePath(`/licks/${lickId}`);
}

/* ── Collections ─────────────────────────────────────────────── */
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

/** Toggle a lick in/out of a collection. Returns the new membership state. */
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
