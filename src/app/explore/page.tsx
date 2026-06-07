import Link from "next/link";
import { licksRepo } from "@/lib/db/licks";
import { LickCard } from "@/components/LickCard";
import { TagFilter } from "@/components/TagFilter";
import { SiteHeader } from "@/components/SiteHeader";
import { btnGhost, btnPrimary, inputBase } from "@/components/ui";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { currentUser } from "@/lib/auth/current-user";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;
  const t = getDictionary(await getLocale());
  const [user, licks, tags] = await Promise.all([
    currentUser(),
    licksRepo.listPublic({ q, tag }),
    licksRepo.publicTags(),
  ]);

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
        <input
          name="q"
          defaultValue={q}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchAria}
          className={inputBase}
        />
      </form>

      {tags.length > 0 && (
        <div className="mb-2">
          <TagFilter tags={tags} basePath="/explore" />
        </div>
      )}

      {licks.length === 0 ? (
        <div role="status" className="rounded-lg border border-dashed border-rule px-6 py-16 text-center">
          <p className="font-serif text-2xl text-ink">{t.exploreEmptyTitle}</p>
          <p className="mt-2 text-sm text-ink-soft">{t.exploreEmptyBody}</p>
        </div>
      ) : (
        <ul className="divide-y divide-dotted divide-rule">
          {licks.map((l) => (
            <li key={l.id}>
              <LickCard lick={l} t={t} authorHandle={l.author?.handle} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
