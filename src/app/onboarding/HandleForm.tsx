"use client";
import { useActionState } from "react";
import { setHandle } from "./actions";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { btnPrimary } from "@/components/ui";

export function HandleForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(setHandle, {});
  return (
    <form action={action} className="space-y-3">
      <div className="flex items-center rounded-md border border-rule bg-paper-raised px-3 focus-within:border-accent">
        <span className="text-ink-faint">@</span>
        <input
          name="handle"
          placeholder={t.handlePlaceholder}
          autoFocus
          autoComplete="off"
          aria-label="handle"
          className="w-full bg-transparent py-2 pl-1 text-ink outline-none"
        />
      </div>
      <p className="text-xs text-ink-faint">{t.handleHint}</p>
      {state?.error && (
        <p role="alert" className="text-sm text-accent">
          {state.error}
        </p>
      )}
      <button disabled={pending} className={`${btnPrimary} w-full disabled:opacity-60`}>
        {t.continueBtn}
      </button>
    </form>
  );
}
