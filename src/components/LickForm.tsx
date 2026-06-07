"use client";
import { useState } from "react";
import { TabEditor } from "./TabEditor";
import { TabView } from "./TabView";
import { btnPrimary, inputBase } from "./ui";
import { STANDARD_TUNING, type Column } from "@/lib/tab/types";

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
}

interface Props {
  initial?: Partial<LickFormValue>;
  action: (formData: FormData) => void;
  submitLabel: string;
}

export function LickForm({ initial, action, submitLabel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [tuning, setTuning] = useState<string[]>(initial?.tuning ?? STANDARD_TUNING);
  const [tab, setTab] = useState<Column[]>(initial?.tab ?? [{ notes: [] }]);
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));

  function submit(formData: FormData) {
    const value: LickFormValue = {
      title,
      tuning,
      tab,
      memo,
      source,
      tags: tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    formData.set("payload", JSON.stringify(value));
    action(formData);
  }

  return (
    <form action={submit} className="space-y-6">
      <Field label="제목" htmlFor="title">
        <input
          id="title"
          className={`${inputBase} font-serif text-lg`}
          placeholder="예: BB 박스 벤딩"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </Field>

      <Field label="TAB">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="tuning" className="text-ink-soft">
              튜닝
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
        <Field label="태그" htmlFor="tags" hint="쉼표로 구분">
          <input
            id="tags"
            className={inputBase}
            placeholder="blues, bb-king"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
          />
        </Field>
        <Field label="출처" htmlFor="source" hint="곡명 / 링크">
          <input
            id="source"
            className={inputBase}
            placeholder="youtube.com/…"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </Field>
      </div>

      <Field label="메모" htmlFor="memo">
        <textarea
          id="memo"
          className={inputBase}
          placeholder="어디서 따왔는지, 어떤 느낌인지…"
          rows={3}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
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
