import { notFound } from "next/navigation";
import { LickForm } from "@/components/LickForm";
import { InkLink } from "@/components/ui";
import { licksRepo } from "@/lib/db/licks";
import { updateLick } from "../../actions";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { requireUser } from "@/lib/auth/current-user";

export default async function EditLickPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = getDictionary(await getLocale());
  const user = await requireUser();
  const lick = await licksRepo.get(id);
  if (!lick || lick.ownerId !== user.id) notFound(); // 비소유자 편집 차단
  const action = updateLick.bind(null, id);
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-6">
        <InkLink href={`/licks/${id}`} className="text-sm">
          ← {t.back}
        </InkLink>
        <h1 className="mt-3 font-serif text-3xl text-ink">{t.editLickHeading}</h1>
      </div>
      <LickForm initial={lick} action={action} submitLabel={t.update} />
    </main>
  );
}
