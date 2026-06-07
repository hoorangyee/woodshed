import Link from "next/link";
import { notFound } from "next/navigation";
import { licksRepo } from "@/lib/db/licks";
import { socialRepo } from "@/lib/db/social";
import { LickCard } from "@/components/LickCard";
import { SiteHeader } from "@/components/SiteHeader";
import { btnGhost, btnPrimary } from "@/components/ui";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { currentUser } from "@/lib/auth/current-user";

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const t = getDictionary(await getLocale());
  const profile = await licksRepo.getUserByHandle(handle.toLowerCase());
  if (!profile) notFound();

  const [user, licks, collections] = await Promise.all([
    currentUser(),
    licksRepo.listPublic({ ownerId: profile.id }),
    socialRepo.collections.listByOwner(profile.id, { publicOnly: true }),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8 border-b border-rule pb-5">
        <div className="mb-6">
          <SiteHeader wordmarkClassName="text-2xl">
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
        <div className="flex items-center gap-3">
          {profile.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.image} alt="" className="h-12 w-12 rounded-full" />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-lg text-paper-raised">
              {(profile.handle ?? "?").slice(0, 1).toUpperCase()}
            </span>
          )}
          <div>
            <h1 className="font-serif text-2xl text-ink">@{profile.handle}</h1>
            <p className="text-sm text-ink-soft">{t.publicCount(licks.length)}</p>
          </div>
        </div>
      </header>

      {licks.length === 0 ? (
        <div role="status" className="rounded-lg border border-dashed border-rule px-6 py-16 text-center">
          <p className="text-sm text-ink-soft">{t.profileEmpty}</p>
        </div>
      ) : (
        <ul className="divide-y divide-dotted divide-rule">
          {licks.map((l) => (
            <li key={l.id}>
              <LickCard lick={l} t={t} />
            </li>
          ))}
        </ul>
      )}

      {collections.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-2 font-serif text-xl text-ink">{t.collections}</h2>
          <ul className="divide-y divide-dotted divide-rule">
            {collections.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/collections/${c.id}`}
                  className="flex items-center justify-between py-4 no-underline transition-colors hover:text-accent"
                >
                  <span className="font-serif text-lg text-ink">{c.title}</span>
                  <span className="text-sm text-ink-faint">{c.itemCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
