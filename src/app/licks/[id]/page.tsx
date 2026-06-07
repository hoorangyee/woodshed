import Link from "next/link";
import { notFound } from "next/navigation";
import { licksRepo } from "@/lib/db/licks";
import { TabView } from "@/components/TabView";
import { deleteLick } from "../actions";

export default async function LickDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lick = await licksRepo.get(id);
  if (!lick) notFound();
  const del = deleteLick.bind(null, id);
  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{lick.title}</h1>
        <div className="flex gap-2">
          <Link href={`/licks/${id}/edit`} className="rounded bg-neutral-700 px-3 py-1 text-sm">
            편집
          </Link>
          <form action={del}>
            <button className="rounded bg-red-600 px-3 py-1 text-sm">삭제</button>
          </form>
        </div>
      </div>
      <TabView tab={lick.tab} tuning={lick.tuning} />
      {lick.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1">
          {lick.tags.map((t) => (
            <Link
              key={t}
              href={`/?tag=${encodeURIComponent(t)}`}
              className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-amber-300"
            >
              #{t}
            </Link>
          ))}
        </div>
      )}
      {lick.source && <p className="mt-4 text-sm text-neutral-400">출처: {lick.source}</p>}
      {lick.memo && <p className="mt-2 whitespace-pre-wrap text-neutral-300">{lick.memo}</p>}
      <Link href="/" className="mt-6 inline-block text-sm text-neutral-500">
        ← 목록
      </Link>
    </main>
  );
}
