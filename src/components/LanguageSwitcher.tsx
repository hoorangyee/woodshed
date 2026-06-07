"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocale } from "@/lib/i18n/actions";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LOCALES, type Locale } from "@/lib/i18n/dictionaries";

export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pick(next: Locale) {
    if (next === locale) return;
    // Also write the cookie client-side immediately so it isn't lost on an instant navigation (intentional global side effect)
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `locale=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div
      className="inline-flex overflow-hidden rounded-md border border-rule"
      role="group"
      aria-label="Language"
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => pick(l)}
          disabled={pending}
          aria-pressed={locale === l}
          className={`px-2 py-1 text-xs transition-colors disabled:opacity-60 ${
            locale === l
              ? "bg-accent text-paper-raised"
              : "bg-paper-raised text-ink-soft hover:text-ink"
          }`}
        >
          {t.localeLabel[l]}
        </button>
      ))}
    </div>
  );
}
