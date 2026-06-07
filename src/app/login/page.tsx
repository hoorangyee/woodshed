"use client";
import { useActionState } from "react";
import { login } from "./actions";
import { btnPrimary, inputBase } from "@/components/ui";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-xs">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-3xl tracking-tight text-ink">
            <span className="text-accent">♪</span> Licks
          </h1>
          <p className="mt-1 text-sm text-ink-soft">기타 릭 TAB 노트</p>
        </div>
        <form action={action} className="space-y-3">
          <input
            type="password"
            name="password"
            placeholder="비밀번호"
            autoFocus
            aria-label="비밀번호"
            className={inputBase}
          />
          {state?.error && (
            <p role="alert" className="text-sm text-accent">
              {state.error}
            </p>
          )}
          <button disabled={pending} className={`${btnPrimary} w-full disabled:opacity-60`}>
            {pending ? "확인 중…" : "들어가기"}
          </button>
        </form>
      </div>
    </main>
  );
}
