"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleLike } from "@/lib/social-actions";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function LikeButton({
  lickId,
  initialLiked,
  initialCount,
  canLike,
}: {
  lickId: string;
  initialLiked: boolean;
  initialCount: number;
  canLike: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!canLike) {
      router.push("/login");
      return;
    }
    // optimistic update
    setLiked((v) => !v);
    setCount((c) => c + (liked ? -1 : 1));
    startTransition(async () => {
      const res = await toggleLike(lickId);
      setLiked(res.liked);
      setCount(res.count);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={liked}
      aria-label={t.like}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${
        liked
          ? "border-accent bg-accent text-paper-raised"
          : "border-rule text-ink-soft hover:border-accent hover:text-accent"
      }`}
    >
      <span aria-hidden>{liked ? "♥" : "♡"}</span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
