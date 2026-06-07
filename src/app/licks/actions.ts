"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { licksRepo, type LickInput } from "@/lib/db/licks";
import { currentUser } from "@/lib/auth/current-user";

const noteSchema = z.object({
  string: z.number().int().min(0).max(5),
  fret: z.number().int().min(0).max(24),
  artic: z.enum(["h", "p", "/", "\\", "b", "b½", "~"]).optional(),
});
const inputSchema = z.object({
  title: z.string().trim().min(1),
  tuning: z.array(z.string()).length(6),
  tab: z.array(z.object({ notes: z.array(noteSchema) })),
  memo: z.string(),
  source: z.string(),
  tags: z.array(z.string()),
  visibility: z.enum(["public", "unlisted", "private"]).default("private"),
});

function parsePayload(formData: FormData): LickInput {
  const raw = JSON.parse(String(formData.get("payload") ?? "{}"));
  return inputSchema.parse(raw);
}

export async function createLick(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const input = parsePayload(formData);
  const id = await licksRepo.create(input, user.id);
  revalidatePath("/");
  redirect(`/licks/${id}`);
}

export async function updateLick(id: string, formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const lick = await licksRepo.get(id);
  if (!lick || lick.ownerId !== user.id) redirect("/"); // 비소유자 차단
  const input = parsePayload(formData);
  await licksRepo.update(id, input);
  revalidatePath("/");
  revalidatePath(`/licks/${id}`);
  redirect(`/licks/${id}`);
}

export async function deleteLick(id: string) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const lick = await licksRepo.get(id);
  if (!lick || lick.ownerId !== user.id) redirect("/"); // 비소유자 차단
  await licksRepo.remove(id);
  revalidatePath("/");
  redirect("/");
}
