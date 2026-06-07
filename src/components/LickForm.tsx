"use client";
import { useState } from "react";
import { TabEditor } from "./TabEditor";
import { TabView } from "./TabView";
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

  const input = "w-full rounded bg-neutral-800 px-3 py-2 outline-none";
  return (
    <form action={submit} className="space-y-4">
      <input
        className={input}
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="flex items-center gap-2 text-sm">
        <label className="text-neutral-400">튜닝</label>
        <select
          className="rounded bg-neutral-800 px-2 py-1"
          value={Object.keys(TUNINGS).find((k) => TUNINGS[k].join() === tuning.join()) ?? "Standard"}
          onChange={(e) => setTuning(TUNINGS[e.target.value])}
        >
          {Object.keys(TUNINGS).map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </div>
      <TabEditor tab={tab} tuning={tuning} onChange={setTab} />
      <TabView tab={tab} tuning={tuning} />
      <input
        className={input}
        placeholder="태그 (쉼표로 구분)"
        value={tagsText}
        onChange={(e) => setTagsText(e.target.value)}
      />
      <input
        className={input}
        placeholder="출처 (곡명 / 링크)"
        value={source}
        onChange={(e) => setSource(e.target.value)}
      />
      <textarea
        className={input}
        placeholder="메모"
        rows={3}
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
      />
      <button className="rounded bg-amber-500 px-4 py-2 font-medium text-neutral-900">
        {submitLabel}
      </button>
    </form>
  );
}
