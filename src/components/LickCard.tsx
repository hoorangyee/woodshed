import Link from "next/link";
import { toAscii } from "@/lib/tab/serialize";
import type { LickRecord } from "@/lib/db/licks";

/** 노트의 한 줄(엔트리)처럼 보이는 릭 행 */
export function LickCard({ lick }: { lick: LickRecord }) {
  const preview = toAscii(lick.tab.slice(0, 12), lick.tuning);
  const noteCount = lick.tab.filter((c) => c.notes.length > 0).length;
  return (
    <Link
      href={`/licks/${lick.id}`}
      className="group flex flex-col gap-3 px-2 py-5 no-underline transition-colors hover:bg-paper-raised sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <h3 className="font-serif text-xl text-ink transition-colors group-hover:text-accent">
          {lick.title}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
          {lick.tags.length > 0 ? (
            lick.tags.map((t, i) => (
              <span key={t}>
                {i > 0 && <span className="mr-2 text-ink-faint">·</span>}
                <span>{t}</span>
              </span>
            ))
          ) : (
            <span className="text-ink-faint">태그 없음</span>
          )}
          <span className="text-ink-faint">· {noteCount}음</span>
        </div>
      </div>
      <pre className="shrink-0 overflow-hidden rounded bg-paper-sunk px-3 py-2 font-mono text-[11px] leading-[1.35] text-ink-soft sm:max-w-[18rem]">
        {preview}
      </pre>
    </Link>
  );
}
