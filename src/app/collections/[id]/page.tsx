import Link from "next/link";
import { notFound } from "next/navigation";
import { socialRepo } from "@/lib/db/social";
import { licksRepo, type LickRecord } from "@/lib/db/licks";
import { currentUser } from "@/lib/auth/current-user";
import { LickCard } from "@/components/LickCard";
import { DeleteButton } from "@/components/DeleteButton";
import { InkLink } from "@/components/ui";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { deleteCollection, removeFromCollection } from "@/lib/social-actions";

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = getDictionary(await getLocale());
  const [collection, user] = await Promise.all([socialRepo.collections.get(id), currentUser()]);
  if (!collection) notFound();

  const isOwner = !!user && user.id === collection.ownerId;
  if (collection.visibility === "private" && !isOwner) notFound();

  const lickIds = await socialRepo.collections.itemLickIds(id);
  const raw = await Promise.all(lickIds.map((lid) => licksRepo.get(lid)));
  // 표시 가능한 릭만: (공개/링크공유) 그리고 (숨김 아님) — 단, 내가 소유한 릭은 항상 표시
  const items = raw.filter((l): l is LickRecord => {
    if (!l) return false;
    const ownLick = !!user && l.ownerId === user.id;
    if (ownLick) return true;
    return l.visibility !== "private" && !l.hidden;
  });
  const author = await licksRepo.getAuthorById(collection.ownerId);
  const del = deleteCollection.bind(null, id);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <InkLink href="/collections" className="text-sm">
        ← {t.collections}
      </InkLink>
      <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-5">
        <div>
          <h1 className="font-serif text-3xl text-ink">{collection.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {author?.handle && (
              <>
                {t.byAuthor}{" "}
                <Link href={`/u/${author.handle}`} className="text-accent hover:underline">
                  @{author.handle}
                </Link>{" "}
                ·{" "}
              </>
            )}
            {collection.itemCount}
          </p>
        </div>
        {isOwner && <DeleteButton action={del} />}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-ink-soft">{t.collectionEmpty}</p>
      ) : (
        <ul className="divide-y divide-dotted divide-rule">
          {items.map((l) => (
            <li key={l.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <LickCard lick={l} t={t} />
              </div>
              {isOwner && (
                <form action={removeFromCollection.bind(null, id, l.id)}>
                  <button className="rounded-md border border-rule px-2 py-1 text-xs text-ink-faint transition-colors hover:border-accent hover:text-accent">
                    {t.removeFromCollection}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
