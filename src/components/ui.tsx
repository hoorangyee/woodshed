import Link from "next/link";
import type { ComponentProps } from "react";

/* Shared style tokens (DRY) */
export const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-paper-raised shadow-sm transition-colors hover:bg-accent-ink active:translate-y-px";

export const btnGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-rule bg-paper-raised px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-ink-soft hover:text-ink";

export const inputBase =
  "w-full rounded-md border border-rule bg-paper-raised px-3 py-2 text-ink placeholder:text-ink-faint transition-colors focus:border-accent";

/** Woodshed logo mark — a small shed + round soundhole (window). Scales with font-size (em). */
export function WoodshedMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ width: "0.82em", height: "0.82em" }}
    >
      <path d="M3 10.5 L12 3.5 L21 10.5" />
      <path d="M5.5 10 V20.5 H18.5 V10" />
      <circle cx="12" cy="14.8" r="2.2" />
    </svg>
  );
}

/** Wordmark */
export function Wordmark({ as = "h1", className = "" }: { as?: "h1" | "span"; className?: string }) {
  const Tag = as;
  return (
    <Tag className={`font-serif tracking-tight text-ink ${className}`}>
      <Link href="/" className="inline-flex items-center gap-2 no-underline">
        <WoodshedMark className="text-accent" />
        <span>Woodshed</span>
      </Link>
    </Tag>
  );
}

/** Text link with a dotted accent underline */
export function InkLink({ className = "", ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={`text-ink-soft underline decoration-rule decoration-dotted underline-offset-4 transition-colors hover:text-accent hover:decoration-accent ${className}`}
    />
  );
}
