"use client";
import { useState } from "react";

export function DeleteButton({ action }: { action: (formData: FormData) => void }) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="rounded-md border border-rule px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-accent hover:text-accent"
      >
        삭제
      </button>
    );
  }

  return (
    <form action={action} className="flex items-center gap-1.5">
      <span className="text-sm text-ink-soft">정말?</span>
      <button className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-paper-raised hover:bg-accent-ink">
        삭제
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="rounded-md border border-rule px-3 py-1.5 text-sm text-ink-soft hover:text-ink"
      >
        취소
      </button>
    </form>
  );
}
