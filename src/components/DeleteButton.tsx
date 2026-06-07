"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function DeleteButton({ action }: { action: (formData: FormData) => void }) {
  const { t } = useI18n();
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="rounded-md border border-rule px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-accent hover:text-accent"
      >
        {t.del}
      </button>
    );
  }

  return (
    <form action={action} className="flex items-center gap-1.5">
      <span className="text-sm text-ink-soft">{t.confirmDelete}</span>
      <button className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-paper-raised hover:bg-accent-ink">
        {t.del}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="rounded-md border border-rule px-3 py-1.5 text-sm text-ink-soft hover:text-ink"
      >
        {t.cancel}
      </button>
    </form>
  );
}
