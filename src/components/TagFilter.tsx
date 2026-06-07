"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function TagFilter({ tags, basePath = "/" }: { tags: string[]; basePath?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("tag");

  function pick(tag: string | null) {
    const next = new URLSearchParams(params.toString());
    if (tag) next.set("tag", tag);
    else next.delete("tag");
    const qs = next.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  const chip = "rounded-full px-3 py-1 text-sm transition-colors";
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t.tagFilterAria}>
      <button
        onClick={() => pick(null)}
        aria-pressed={!active}
        className={`${chip} ${!active ? "bg-accent text-paper-raised" : "text-ink-soft hover:bg-paper-raised hover:text-ink"}`}
      >
        {t.all}
      </button>
      {tags.map((t) => {
        const on = active === t;
        return (
          <button
            key={t}
            onClick={() => pick(on ? null : t)}
            aria-pressed={on}
            className={`${chip} ${on ? "bg-accent text-paper-raised" : "text-ink-soft hover:bg-paper-raised hover:text-ink"}`}
          >
            <span className={on ? "opacity-70" : "text-ink-faint"}>#</span>
            {t}
          </button>
        );
      })}
    </div>
  );
}
