"use client";
import { useState } from "react";
import { toAscii } from "@/lib/tab/serialize";
import type { Column } from "@/lib/tab/types";

export function TabView({ tab, tuning }: { tab: Column[]; tuning: string[] }) {
  const [copied, setCopied] = useState(false);
  const ascii = toAscii(tab, tuning);
  return (
    <div className="relative rounded-lg border border-rule bg-paper-raised p-1">
      <pre className="overflow-x-auto rounded-md bg-paper-sunk p-4 font-mono text-sm leading-6 text-ink">
        {ascii}
      </pre>
      <button
        type="button"
        aria-label="TAB 복사"
        onClick={async () => {
          await navigator.clipboard.writeText(ascii);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="absolute right-3 top-3 rounded-md border border-rule bg-paper-raised px-2.5 py-1 text-xs text-ink-soft transition-colors hover:border-ink-soft hover:text-ink"
      >
        {copied ? "복사됨 ✓" : "복사"}
      </button>
    </div>
  );
}
