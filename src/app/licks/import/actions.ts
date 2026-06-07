"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { licksRepo, type LickInput } from "@/lib/db/licks";

export async function importLicks(formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) redirect("/");
  const data = JSON.parse(await file.text()) as {
    licks: (LickInput & { id?: string })[];
  };
  for (const lick of data.licks ?? []) {
    await licksRepo.create({
      title: lick.title,
      tuning: lick.tuning,
      tab: lick.tab,
      memo: lick.memo ?? "",
      source: lick.source ?? "",
      tags: lick.tags ?? [],
    });
  }
  revalidatePath("/");
  redirect("/");
}
