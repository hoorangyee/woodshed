import { LickForm } from "@/components/LickForm";
import { InkLink } from "@/components/ui";
import { createLick } from "../actions";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function NewLickPage() {
  const t = getDictionary(await getLocale());
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-6">
        <InkLink href="/" className="text-sm">
          ← {t.back}
        </InkLink>
        <h1 className="mt-3 font-serif text-3xl text-ink">{t.newLickHeading}</h1>
      </div>
      <LickForm action={createLick} submitLabel={t.save} />
    </main>
  );
}
