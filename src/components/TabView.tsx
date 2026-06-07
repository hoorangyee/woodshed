"use client";
import { useState } from "react";
import { toAscii } from "@/lib/tab/serialize";
import type { Column } from "@/lib/tab/types";

export function TabView({ tab, tuning }: { tab: Column[]; tuning: string[] }) {
  const [copied, setCopied] = useState(false);
  const ascii = toAscii(tab, tuning);
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded bg-neutral-900 p-3 font-mono text-sm leading-5 text-neutral-100">
        {ascii}
      </pre>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(ascii);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="absolute right-2 top-2 rounded bg-neutral-700 px-2 py-1 text-xs"
      >
        {copied ? "복사됨" : "복사"}
      </button>
    </div>
  );
}
