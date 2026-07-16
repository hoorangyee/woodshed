"use client";
import { useState } from "react";
import { toAscii } from "@/lib/tab/serialize";
import { TabStaff } from "./TabStaff";
import { PlayButton } from "./PlayButton";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Column } from "@/lib/tab/types";

export function TabView({ tab, tuning }: { tab: Column[]; tuning: string[] }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [activeColumn, setActiveColumn] = useState<number | null>(null);
  return (
    <div className="relative rounded-lg border border-rule bg-paper-raised p-1.5">
      <TabStaff tab={tab} tuning={tuning} surface="bg-paper-raised" activeColumn={activeColumn} />
      <div className="absolute right-3 top-3 z-30 flex items-center gap-2">
        <PlayButton tab={tab} tuning={tuning} onActiveColumn={setActiveColumn} />
        <button
          type="button"
          aria-label={t.copyAria}
          onClick={async () => {
            await navigator.clipboard.writeText(toAscii(tab, tuning));
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="rounded-md border border-rule bg-paper-raised px-2.5 py-1 text-xs text-ink-soft shadow-sm transition-colors hover:border-ink-soft hover:text-ink"
        >
          {copied ? t.copied : t.copy}
        </button>
      </div>
    </div>
  );
}
