"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { licksRepo, type LickInput } from "@/lib/db/licks";
import { currentUser } from "@/lib/auth/current-user";

export async function importLicks(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) redirect("/");
  const data = JSON.parse(await file.text()) as {
    licks: (Partial<LickInput> & { title: string; tuning: string[]; tab: LickInput["tab"] })[];
  };
  for (const lick of data.licks ?? []) {
    await licksRepo.create(
      {
        title: lick.title,
        tuning: lick.tuning,
        tab: lick.tab,
        memo: lick.memo ?? "",
        source: lick.source ?? "",
        tags: lick.tags ?? [],
        visibility: lick.visibility ?? "private", // 가져온 릭은 기본 비공개
      },
      user.id,
    );
  }
  revalidatePath("/");
  redirect("/");
}
