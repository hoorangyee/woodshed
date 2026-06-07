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
    // 즉시 클라이언트 쿠키도 기록 → 바로 다른 페이지로 이동해도 유실되지 않음
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
