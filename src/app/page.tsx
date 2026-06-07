import Link from "next/link";
import { licksRepo } from "@/lib/db/licks";
import { LickCard } from "@/components/LickCard";
import { TagFilter } from "@/components/TagFilter";
import { ImportButton } from "@/components/ImportButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Wordmark, btnPrimary, btnGhost, inputBase } from "@/components/ui";
import { importLicks } from "@/app/licks/import/actions";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;
  const t = getDictionary(await getLocale());
  const [licks, tags] = await Promise.all([licksRepo.list({ q, tag }), licksRepo.allTags()]);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-5">
        <div>
          <Wordmark className="text-4xl" />
          <p className="mt-1 text-sm text-ink-soft">{t.licksCount(licks.length)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LanguageSwitcher />
          <a href="/api/export" className={btnGhost}>
            {t.exportJson}
          </a>
          <ImportButton action={importLicks} />
          <Link href="/licks/new" className={btnPrimary}>
            + {t.newLick}
          </Link>
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
          <TagFilter tags={tags} />
        </div>
      )}

      {licks.length === 0 ? (
        <EmptyState filtered={Boolean(q || tag)} t={t} />
      ) : (
        <ul className="divide-y divide-dotted divide-rule">
          {licks.map((l) => (
            <li key={l.id}>
              <LickCard lick={l} t={t} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function EmptyState({
  filtered,
  t,
}: {
  filtered: boolean;
  t: ReturnType<typeof getDictionary>;
}) {
  return (
    <div role="status" className="rounded-lg border border-dashed border-rule px-6 py-16 text-center">
      <p className="font-serif text-2xl text-ink">
        {filtered ? t.emptyTitleFiltered : t.emptyTitleEmpty}
      </p>
      <p className="mt-2 text-sm text-ink-soft">
        {filtered ? t.emptyBodyFiltered : t.emptyBodyEmpty}
      </p>
      {!filtered && (
        <Link href="/licks/new" className={`${btnPrimary} mt-5`}>
          + {t.writeFirst}
        </Link>
      )}
    </div>
  );
}
