import Link from "next/link";
import { notFound } from "next/navigation";
import { licksRepo } from "@/lib/db/licks";
import { TabView } from "@/components/TabView";
import { DeleteButton } from "@/components/DeleteButton";
import { InkLink, btnGhost } from "@/components/ui";
import { deleteLick } from "../actions";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { currentUser } from "@/lib/auth/current-user";

export default async function LickDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = getDictionary(await getLocale());
  const [lick, user] = await Promise.all([licksRepo.get(id), currentUser()]);
  if (!lick) notFound();

  const isOwner = !!user && user.id === lick.ownerId;
  // 비공개 릭은 소유자만 열람 가능
  if (lick.visibility === "private" && !isOwner) notFound();

  const del = deleteLick.bind(null, id);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <InkLink href="/" className="text-sm">
        ← {t.back}
      </InkLink>

      <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-5">
        <div className="min-w-0">
          <h1 className="font-serif text-3xl text-ink">{lick.title}</h1>
          {lick.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
              {lick.tags.map((tag, i) => (
                <span key={tag}>
                  {i > 0 && <span className="mr-2 text-ink-faint">·</span>}
                  <Link
                    href={`/?tag=${encodeURIComponent(tag)}`}
                    className="no-underline transition-colors hover:text-accent"
                  >
                    {tag}
                  </Link>
                </span>
              ))}
            </div>
          )}
        </div>
        {isOwner && (
          <div className="flex shrink-0 items-center gap-2">
            <Link href={`/licks/${id}/edit`} className={btnGhost}>
              {t.edit}
            </Link>
            <DeleteButton action={del} />
          </div>
        )}
      </div>

      <TabView tab={lick.tab} tuning={lick.tuning} />

      {(lick.source || lick.memo) && (
        <dl className="mt-6 space-y-4">
          {lick.source && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                {t.sourceLabel}
              </dt>
              <dd className="mt-1 text-ink">{lick.source}</dd>
            </div>
          )}
          {lick.memo && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                {t.memoLabel}
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-ink">{lick.memo}</dd>
            </div>
          )}
        </dl>
      )}
    </main>
  );
}
