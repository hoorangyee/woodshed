import Link from "next/link";
import { TabStaff } from "./TabStaff";
import type { LickRecord } from "@/lib/db/licks";
import type { Dict } from "@/lib/i18n/dictionaries";

/** A lick row styled like a notebook entry. Shows the author when authorHandle is given (explore/profile). */
export function LickCard({
  lick,
  t,
  authorHandle,
  likeCount,
  commentCount,
}: {
  lick: LickRecord;
  t: Dict;
  authorHandle?: string | null;
  likeCount?: number;
  commentCount?: number;
}) {
  const noteCount = lick.tab.filter((c) => c.notes.length > 0).length;
  return (
    <div className="group relative flex flex-col gap-3 px-2 py-5 transition-colors hover:bg-paper-raised sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h3 className="font-serif text-xl text-ink transition-colors group-hover:text-accent">
          {/* Stretched link: the whole card opens the lick, but nested links (author) stay clickable */}
          <Link href={`/licks/${lick.id}`} className="no-underline after:absolute after:inset-0">
            {lick.title}
          </Link>
          {lick.hidden && (
            <span className="ml-2 rounded bg-accent/10 px-1.5 py-0.5 align-middle text-xs font-sans text-accent">
              {t.hiddenBadge}
            </span>
          )}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
          {authorHandle && (
            <span>
              <Link
                href={`/u/${authorHandle}`}
                className="relative z-10 text-accent no-underline hover:underline"
              >
                @{authorHandle}
              </Link>
              <span className="ml-2 text-ink-faint">·</span>
            </span>
          )}
          {lick.tags.length > 0 ? (
            lick.tags.map((t, i) => (
              <span key={t}>
                {i > 0 && <span className="mr-2 text-ink-faint">·</span>}
                <span>{t}</span>
              </span>
            ))
          ) : (
            <span className="text-ink-faint">{t.noTags}</span>
          )}
          <span className="text-ink-faint">· {t.noteCount(noteCount)}</span>
          {(likeCount !== undefined || commentCount !== undefined) && (
            <span className="text-ink-faint">
              · ♥ {likeCount ?? 0} · 💬 {commentCount ?? 0}
            </span>
          )}
        </div>
      </div>
      <div className="w-full shrink-0 sm:w-[18rem]">
        <TabStaff tab={lick.tab.slice(0, 12)} tuning={lick.tuning} surface="bg-paper-sunk" compact />
      </div>
    </div>
  );
}
