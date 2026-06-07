import Link from "next/link";
import { licksRepo } from "@/lib/db/licks";
import { socialRepo } from "@/lib/db/social";
import { LickCard } from "@/components/LickCard";
import { TagFilter } from "@/components/TagFilter";
import { SiteHeader } from "@/components/SiteHeader";
import { btnGhost, btnPrimary, inputBase } from "@/components/ui";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { currentUser } from "@/lib/auth/current-user";

type Sort = "recent" | "likes" | "comments";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; sort?: string }>;
}) {
  const { q, tag, sort } = await searchParams;
  const sortKey: Sort = sort === "likes" || sort === "comments" ? sort : "recent";
  const t = getDictionary(await getLocale());

  const [user, baseLicks, tags] = await Promise.all([
    currentUser(),
    licksRepo.listPublic({ q, tag }),
    licksRepo.publicTags(),
  ]);

  const ids = baseLicks.map((l) => l.id);
  const [likeCounts, commentCounts] = await Promise.all([
    socialRepo.likes.countsFor(ids),
    socialRepo.comments.countsFor(ids),
  ]);
  const licks = baseLicks.map((l) => ({
    ...l,
    likeCount: likeCounts[l.id] ?? 0,
    commentCount: commentCounts[l.id] ?? 0,
  }));
  // listPublic은 최신순. 좋아요/댓글순은 카운트로 재정렬(동점은 최신순).
  if (sortKey === "likes") {
    licks.sort((a, b) => b.likeCount - a.likeCount || b.createdAt - a.createdAt);
  } else if (sortKey === "comments") {
    licks.sort((a, b) => b.commentCount - a.commentCount || b.createdAt - a.createdAt);
  }

  const sortOptions: { key: Sort; label: string }[] = [
    { key: "recent", label: t.sortRecent },
    { key: "likes", label: t.sortLikes },
    { key: "comments", label: t.sortComments },
  ];
  const sortHref = (s: Sort) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tag) params.set("tag", tag);
    if (s !== "recent") params.set("sort", s);
    const qs = params.toString();
    return qs ? `/explore?${qs}` : "/explore";
  };

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8 border-b border-rule pb-5">
        <div className="mb-4">
          <SiteHeader wordmarkClassName="text-4xl">
            {user ? (
              <Link href="/" className={btnGhost}>
                {t.myLicks}
              </Link>
            ) : (
              <Link href="/login" className={btnPrimary}>
                {t.signIn}
              </Link>
            )}
          </SiteHeader>
        </div>
        <div>
          <h1 className="font-serif text-2xl text-ink">{t.explore}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t.publicCount(licks.length)}</p>
        </div>
      </header>

      <form className="mb-4">
        {tag && <input type="hidden" name="tag" value={tag} />}
        {sortKey !== "recent" && <input type="hidden" name="sort" value={sortKey} />}
        <input
          name="q"
          defaultValue={q}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchAria}
          className={inputBase}
        />
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tags.length > 0 && <TagFilter tags={tags} basePath="/explore" />}
        <div className="ml-auto flex items-center gap-1 text-sm" role="group" aria-label="Sort">
          {sortOptions.map((o) => (
            <Link
              key={o.key}
              href={sortHref(o.key)}
              aria-current={sortKey === o.key ? "true" : undefined}
              className={`rounded-full px-3 py-1 transition-colors ${
                sortKey === o.key
                  ? "bg-accent text-paper-raised"
                  : "text-ink-soft hover:bg-paper-raised hover:text-ink"
              }`}
            >
              {o.label}
            </Link>
          ))}
        </div>
      </div>

      {licks.length === 0 ? (
        <div role="status" className="rounded-lg border border-dashed border-rule px-6 py-16 text-center">
          <p className="font-serif text-2xl text-ink">{t.exploreEmptyTitle}</p>
          <p className="mt-2 text-sm text-ink-soft">{t.exploreEmptyBody}</p>
        </div>
      ) : (
        <ul className="divide-y divide-dotted divide-rule">
          {licks.map((l) => (
            <li key={l.id}>
              <LickCard
                lick={l}
                t={t}
                authorHandle={l.author?.handle}
                likeCount={l.likeCount}
                commentCount={l.commentCount}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
