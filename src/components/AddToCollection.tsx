"use client";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toggleInCollection } from "@/lib/social-actions";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useDismiss } from "./use-dismiss";

export function AddToCollection({
  lickId,
  collections,
  containedIds,
}: {
  lickId: string;
  collections: { id: string; title: string }[];
  containedIds: string[];
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [contained, setContained] = useState<Set<string>>(new Set(containedIds));
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), ref);

  function toggle(cid: string) {
    const optimistic = new Set(contained);
    if (optimistic.has(cid)) optimistic.delete(cid);
    else optimistic.add(cid);
    setContained(optimistic);
    startTransition(async () => {
      const nowIn = await toggleInCollection(cid, lickId);
      setContained((prev) => {
        const s = new Set(prev);
        if (nowIn) s.add(cid);
        else s.delete(cid);
        return s;
      });
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="rounded-md border border-rule px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-accent hover:text-accent"
      >
        {t.addToCollection}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-56 rounded-lg border border-rule bg-paper-raised p-2 shadow-lg">
          {collections.length === 0 ? (
            <Link href="/collections" className="block px-2 py-1.5 text-sm text-accent">
              + {t.newCollection}
            </Link>
          ) : (
            <ul className="max-h-60 overflow-y-auto">
              {collections.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    disabled={pending}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-paper-sunk"
                  >
                    <span
                      className={`grid h-4 w-4 place-items-center rounded border text-[10px] ${
                        contained.has(c.id)
                          ? "border-accent bg-accent text-paper-raised"
                          : "border-rule"
                      }`}
                    >
                      {contained.has(c.id) ? "✓" : ""}
                    </span>
                    <span className="truncate text-ink">{c.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/collections"
            className="mt-1 block border-t border-rule px-2 pt-2 text-xs text-ink-faint hover:text-accent"
          >
            {t.collections} →
          </Link>
        </div>
      )}
    </div>
  );
}
