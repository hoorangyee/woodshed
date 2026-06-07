"use client";
import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <main className="min-h-screen grid place-items-center bg-neutral-950 text-neutral-100">
      <form action={action} className="w-72 space-y-4">
        <h1 className="text-xl font-semibold">Licks</h1>
        <input
          type="password"
          name="password"
          placeholder="비밀번호"
          autoFocus
          className="w-full rounded bg-neutral-800 px-3 py-2 outline-none"
        />
        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
        <button
          disabled={pending}
          className="w-full rounded bg-amber-500 px-3 py-2 font-medium text-neutral-900 disabled:opacity-50"
        >
          {pending ? "확인 중..." : "로그인"}
        </button>
      </form>
    </main>
  );
}
