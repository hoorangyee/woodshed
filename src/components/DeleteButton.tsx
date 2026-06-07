"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { SubmitButton } from "./SubmitButton";

export function DeleteButton({ action }: { action: (formData: FormData) => void }) {
  const { t } = useI18n();
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="rounded-md border border-danger px-3 py-1.5 text-sm text-danger transition-colors hover:bg-danger hover:text-paper-raised"
      >
        {t.del}
      </button>
    );
  }

  return (
    <form action={action} className="flex items-center gap-1.5">
      <span className="text-sm text-ink-soft">{t.confirmDelete}</span>
      <SubmitButton
        pendingLabel={t.deleting}
        className="rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-paper-raised hover:bg-danger-ink"
      >
        {t.del}
      </SubmitButton>
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
