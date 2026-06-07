import { notFound } from "next/navigation";
import { LickForm } from "@/components/LickForm";
import { InkLink } from "@/components/ui";
import { licksRepo } from "@/lib/db/licks";
import { updateLick } from "../../actions";

export default async function EditLickPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lick = await licksRepo.get(id);
  if (!lick) notFound();
  const action = updateLick.bind(null, id);
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-6">
        <InkLink href={`/licks/${id}`} className="text-sm">
          ← 돌아가기
        </InkLink>
        <h1 className="mt-3 font-serif text-3xl text-ink">릭 편집</h1>
      </div>
      <LickForm initial={lick} action={action} submitLabel="수정하기" />
    </main>
  );
}
