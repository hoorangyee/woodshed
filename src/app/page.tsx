import Link from "next/link";
import { licksRepo } from "@/lib/db/licks";
import { LickCard } from "@/components/LickCard";
import { TagFilter } from "@/components/TagFilter";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Wordmark, btnPrimary, btnGhost, inputBase } from "@/components/ui";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { requireUser, isAdmin } from "@/lib/auth/current-user";
import { signOut } from "@/lib/auth/auth";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;
  const t = getDictionary(await getLocale());
  const user = await requireUser();
  const [licks, tags] = await Promise.all([
    licksRepo.list({ q, tag, ownerId: user.id }),
    licksRepo.allTags(user.id),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8 border-b border-rule pb-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <Wordmark className="text-4xl" />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <div className="flex items-center gap-2 rounded-full border border-rule bg-paper-raised py-1 pl-1 pr-1">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="h-6 w-6 rounded-full" />
              ) : (
                <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-xs text-paper-raised">
                  {(user.handle ?? user.name ?? "?").slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="px-1 text-sm text-ink-soft">@{user.handle}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button className="rounded-full px-2 py-0.5 text-xs text-ink-faint hover:text-accent">
                  {t.signOut}
                </button>
              </form>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">{t.licksCount(licks.length)}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/explore" className={btnGhost}>
              {t.explore}
            </Link>
            <Link href="/collections" className={btnGhost}>
              {t.collections}
            </Link>
            {isAdmin(user) && (
              <Link href="/admin" className={btnGhost}>
                {t.admin}
              </Link>
            )}
            <Link href="/licks/new" className={btnPrimary}>
              + {t.newLick}
            </Link>
          </div>
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

function EmptyState({ filtered, t }: { filtered: boolean; t: ReturnType<typeof getDictionary> }) {
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
