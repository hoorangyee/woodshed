"use client";
import { useState } from "react";
import { TabEditor } from "./TabEditor";
import { TabView } from "./TabView";
import { btnPrimary, inputBase } from "./ui";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { STANDARD_TUNING, type Column } from "@/lib/tab/types";
import type { Visibility } from "@/lib/db/schema";

const TUNINGS: Record<string, string[]> = {
  Standard: ["E", "A", "D", "G", "B", "e"],
  "Drop D": ["D", "A", "D", "G", "B", "e"],
};

export interface LickFormValue {
  title: string;
  tuning: string[];
  tab: Column[];
  memo: string;
  source: string;
  tags: string[];
  visibility: Visibility;
}

interface Props {
  initial?: Partial<LickFormValue>;
  action: (formData: FormData) => void;
  submitLabel: string;
}

export function LickForm({ initial, action, submitLabel }: Props) {
  const { t } = useI18n();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [tuning, setTuning] = useState<string[]>(initial?.tuning ?? STANDARD_TUNING);
  const [tab, setTab] = useState<Column[]>(initial?.tab ?? [{ notes: [] }]);
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? "private");

  function submit(formData: FormData) {
    const value: LickFormValue = {
      title,
      tuning,
      tab,
      memo,
      source,
      visibility,
      tags: tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    formData.set("payload", JSON.stringify(value));
    action(formData);
  }

  const visOptions: { value: Visibility; label: string }[] = [
    { value: "private", label: t.visPrivate },
    { value: "unlisted", label: t.visUnlisted },
    { value: "public", label: t.visPublic },
  ];

  return (
    <form action={submit} className="space-y-6">
      <Field label={t.titleLabel} htmlFor="title">
        <input
          id="title"
          className={`${inputBase} font-serif text-lg`}
          placeholder={t.titlePlaceholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </Field>

      <Field label={t.tabLabel}>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="tuning" className="text-ink-soft">
              {t.tuningLabel}
            </label>
            <select
              id="tuning"
              className="rounded-md border border-rule bg-paper-raised px-2 py-1 text-ink focus:border-accent"
              value={
                Object.keys(TUNINGS).find((k) => TUNINGS[k].join() === tuning.join()) ?? "Standard"
              }
              onChange={(e) => setTuning(TUNINGS[e.target.value])}
            >
              {Object.keys(TUNINGS).map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </div>
          <TabEditor tab={tab} tuning={tuning} onChange={setTab} />
          <TabView tab={tab} tuning={tuning} />
        </div>
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label={t.tagsLabel} htmlFor="tags" hint={t.tagsHint}>
          <input
            id="tags"
            className={inputBase}
            placeholder={t.tagsPlaceholder}
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
          />
        </Field>
        <Field label={t.sourceLabel} htmlFor="source" hint={t.sourceHint}>
          <input
            id="source"
            className={inputBase}
            placeholder={t.sourcePlaceholder}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </Field>
      </div>

      <Field label={t.memoLabel} htmlFor="memo">
        <textarea
          id="memo"
          className={inputBase}
          placeholder={t.memoPlaceholder}
          rows={3}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </Field>

      <Field label={t.visibilityLabel} htmlFor="visibility">
        <select
          id="visibility"
          className="rounded-md border border-rule bg-paper-raised px-3 py-2 text-ink focus:border-accent"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as Visibility)}
        >
          {visOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {visibility !== "private" && (
          <p className="mt-1.5 text-xs text-ink-faint">{t.licenseNote}</p>
        )}
      </Field>

      <div className="flex justify-end border-t border-rule pt-5">
        <button className={btnPrimary}>{submitLabel}</button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="flex items-baseline gap-2 text-xs font-medium uppercase tracking-wide text-ink-soft"
      >
        {label}
        {hint && <span className="font-normal normal-case tracking-normal text-ink-faint">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
