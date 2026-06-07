"use client";
import { useState, useTransition } from "react";
import { reportContent } from "@/lib/moderation-actions";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { TargetType } from "@/lib/db/moderation";
import type { Dict } from "@/lib/i18n/dictionaries";

export function ReportButton({
  targetType,
  targetId,
  variant = "button",
}: {
  targetType: TargetType;
  targetId: string;
  variant?: "button" | "link";
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const reasons: { key: keyof Dict; label: string }[] = [
    { key: "reasonSpam", label: t.reasonSpam },
    { key: "reasonInappropriate", label: t.reasonInappropriate },
    { key: "reasonCopyright", label: t.reasonCopyright },
    { key: "reasonOther", label: t.reasonOther },
  ];

  function submit(reason: string) {
    startTransition(async () => {
      const ok = await reportContent(targetType, targetId, reason);
      if (ok) {
        setDone(true);
        setOpen(false);
      }
    });
  }

  if (done) {
    return <span className="text-xs text-ink-faint">{t.reported}</span>;
  }

  const trigger =
    variant === "link"
      ? "text-xs text-ink-faint transition-colors hover:text-accent"
      : "rounded-md border border-rule px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-accent hover:text-accent";

  return (
    <div className="relative inline-block">
      <button type="button" onClick={() => setOpen((o) => !o)} className={trigger}>
        {t.report}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-44 rounded-lg border border-rule bg-paper-raised p-1 shadow-lg">
          {reasons.map((r) => (
            <button
              key={r.key}
              type="button"
              disabled={pending}
              onClick={() => submit(r.label)}
              className="block w-full rounded px-2 py-1.5 text-left text-sm text-ink hover:bg-paper-sunk"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
