"use client";
import { useActionState } from "react";
import { login } from "./actions";
import { btnPrimary, inputBase } from "@/components/ui";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function LoginPage() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(login, {});
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-xs">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-3xl tracking-tight text-ink">
            <span className="text-accent">♪</span> Licks
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{t.appTagline}</p>
        </div>
        <form action={action} className="space-y-3">
          <input
            type="password"
            name="password"
            placeholder={t.password}
            autoFocus
            aria-label={t.password}
            className={inputBase}
          />
          {state?.error && (
            <p role="alert" className="text-sm text-accent">
              {state.error}
            </p>
          )}
          <button disabled={pending} className={`${btnPrimary} w-full disabled:opacity-60`}>
            {pending ? t.loggingIn : t.login}
          </button>
        </form>
        <div className="mt-6 flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </main>
  );
}
