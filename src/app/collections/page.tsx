import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { socialRepo } from "@/lib/db/social";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { createCollection } from "@/lib/social-actions";
import { InkLink, btnPrimary, inputBase } from "@/components/ui";

export default async function CollectionsPage() {
  const user = await requireUser();
  const t = getDictionary(await getLocale());
  const collections = await socialRepo.collections.listByOwner(user.id);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-6">
        <InkLink href="/" className="text-sm">
          ← {t.myLicks}
        </InkLink>
        <h1 className="mt-3 font-serif text-3xl text-ink">{t.collections}</h1>
      </div>

      <form action={createCollection} className="mb-8 flex flex-wrap gap-2">
        <input
          name="title"
          required
          maxLength={100}
          placeholder={t.collectionTitle}
          className={`${inputBase} flex-1`}
        />
        <select
          name="visibility"
          defaultValue="private"
          className="rounded-md border border-rule bg-paper-raised px-2 text-sm text-ink"
          aria-label={t.visibilityLabel}
        >
          <option value="private">{t.visPrivate}</option>
          <option value="public">{t.visPublic}</option>
        </select>
        <button className={btnPrimary}>{t.createCollection}</button>
      </form>

      {collections.length === 0 ? (
        <p className="text-sm text-ink-soft">{t.noCollections}</p>
      ) : (
        <ul className="divide-y divide-dotted divide-rule">
          {collections.map((c) => (
            <li key={c.id}>
              <Link
                href={`/collections/${c.id}`}
                className="flex items-center justify-between py-4 no-underline transition-colors hover:text-accent"
              >
                <span className="font-serif text-lg text-ink">{c.title}</span>
                <span className="text-sm text-ink-faint">
                  {c.itemCount} · {c.visibility === "public" ? t.visPublic : t.visPrivate}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
