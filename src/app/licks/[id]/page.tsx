import Link from "next/link";
import { notFound } from "next/navigation";
import { licksRepo } from "@/lib/db/licks";
import { TabView } from "@/components/TabView";
import { DeleteButton } from "@/components/DeleteButton";
import { InkLink, btnGhost } from "@/components/ui";
import { deleteLick } from "../actions";

export default async function LickDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lick = await licksRepo.get(id);
  if (!lick) notFound();
  const del = deleteLick.bind(null, id);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <InkLink href="/" className="text-sm">
        ← 노트로
      </InkLink>

      <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-5">
        <div className="min-w-0">
          <h1 className="font-serif text-3xl text-ink">{lick.title}</h1>
          {lick.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
              {lick.tags.map((t, i) => (
                <span key={t}>
                  {i > 0 && <span className="mr-2 text-ink-faint">·</span>}
                  <Link
                    href={`/?tag=${encodeURIComponent(t)}`}
                    className="no-underline transition-colors hover:text-accent"
                  >
                    {t}
                  </Link>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href={`/licks/${id}/edit`} className={btnGhost}>
            편집
          </Link>
          <DeleteButton action={del} />
        </div>
      </div>

      <TabView tab={lick.tab} tuning={lick.tuning} />

      {(lick.source || lick.memo) && (
        <dl className="mt-6 space-y-4">
          {lick.source && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-soft">출처</dt>
              <dd className="mt-1 text-ink">{lick.source}</dd>
            </div>
          )}
          {lick.memo && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-soft">메모</dt>
              <dd className="mt-1 whitespace-pre-wrap text-ink">{lick.memo}</dd>
            </div>
          )}
        </dl>
      )}
    </main>
  );
}
