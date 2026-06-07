"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** Licks / Collections tabs on a profile. Content is rendered server-side and toggled client-side. */
export function ProfileTabs({
  licks,
  collections,
}: {
  licks: React.ReactNode;
  collections: React.ReactNode;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"licks" | "collections">("licks");
  const tabClass = (active: boolean) =>
    `-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
      active ? "border-accent text-accent" : "border-transparent text-ink-soft hover:text-ink"
    }`;

  return (
    <div>
      <div role="tablist" aria-label="Profile sections" className="mb-5 flex gap-1 border-b border-rule">
        <button type="button" role="tab" aria-selected={tab === "licks"} onClick={() => setTab("licks")} className={tabClass(tab === "licks")}>
          {t.licksTab}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "collections"}
          onClick={() => setTab("collections")}
          className={tabClass(tab === "collections")}
        >
          {t.collections}
        </button>
      </div>
      <div role="tabpanel">{tab === "licks" ? licks : collections}</div>
    </div>
  );
}
