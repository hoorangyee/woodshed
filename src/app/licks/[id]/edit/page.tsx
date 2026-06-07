import { notFound } from "next/navigation";
import { LickForm } from "@/components/LickForm";
import { licksRepo } from "@/lib/db/licks";
import { updateLick } from "../../actions";

export default async function EditLickPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lick = await licksRepo.get(id);
  if (!lick) notFound();
  const action = updateLick.bind(null, id);
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-xl font-semibold">릭 편집</h1>
      <LickForm initial={lick} action={action} submitLabel="수정" />
    </main>
  );
}
