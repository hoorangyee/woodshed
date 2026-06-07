import Link from "next/link";
import { toAscii } from "@/lib/tab/serialize";
import type { LickRecord } from "@/lib/db/licks";

export function LickCard({ lick }: { lick: LickRecord }) {
  const preview = toAscii(lick.tab.slice(0, 8), lick.tuning);
  return (
    <Link
      href={`/licks/${lick.id}`}
      className="block rounded-lg border border-neutral-800 bg-neutral-900 p-4 hover:border-amber-500/50"
    >
      <h3 className="mb-2 font-medium">{lick.title}</h3>
      <pre className="mb-2 max-h-24 overflow-hidden font-mono text-xs text-neutral-400">
        {preview}
      </pre>
      <div className="flex flex-wrap gap-1">
        {lick.tags.map((t) => (
          <span key={t} className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-amber-300">
            #{t}
          </span>
        ))}
      </div>
    </Link>
  );
}
