import Link from "next/link";
import type { ComponentProps } from "react";

/* Studio Notebook 공용 스타일 토큰 (DRY) */
export const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-paper-raised shadow-sm transition-colors hover:bg-accent-ink active:translate-y-px";

export const btnGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-rule bg-paper-raised px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-ink-soft hover:text-ink";

export const inputBase =
  "w-full rounded-md border border-rule bg-paper-raised px-3 py-2 text-ink placeholder:text-ink-faint transition-colors focus:border-accent";

/** 잉크 펜 느낌의 워드마크 */
export function Wordmark({ as = "h1", className = "" }: { as?: "h1" | "span"; className?: string }) {
  const Tag = as;
  return (
    <Tag className={`font-serif tracking-tight text-ink ${className}`}>
      <Link href="/" className="inline-flex items-baseline gap-1.5 no-underline">
        <span className="text-accent">♪</span>
        <span>Licks</span>
      </Link>
    </Tag>
  );
}

/** 액센트 밑줄이 들어간 텍스트 링크 */
export function InkLink({ className = "", ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={`text-ink-soft underline decoration-rule decoration-dotted underline-offset-4 transition-colors hover:text-accent hover:decoration-accent ${className}`}
    />
  );
}
