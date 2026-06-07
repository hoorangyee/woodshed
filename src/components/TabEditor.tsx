"use client";
import { useState } from "react";
import { STRING_COUNT, ARTICULATIONS, type Column, type Articulation } from "@/lib/tab/types";
import { addColumn, removeColumn, setNote, clearNote, toggleArtic } from "@/lib/tab/editor-ops";
import { cellToken } from "@/lib/tab/serialize";

interface Props {
  tab: Column[];
  tuning: string[];
  onChange: (next: Column[]) => void;
}

// 위→아래 표시 순서의 줄 인덱스 (고음 e=5 가 맨 위)
const ROWS = Array.from({ length: STRING_COUNT }, (_, i) => STRING_COUNT - 1 - i);

export function TabEditor({ tab, tuning, onChange }: Props) {
  const [active, setActive] = useState<{ col: number; string: number } | null>(null);
  const [buffer, setBuffer] = useState("");

  function commitFret(col: number, string: number) {
    if (buffer === "") return;
    const fret = Math.min(24, Math.max(0, parseInt(buffer, 10)));
    onChange(setNote(tab, col, { string, fret }));
    setBuffer("");
  }

  function handleKey(e: React.KeyboardEvent, col: number, string: number) {
    if (/^[0-9]$/.test(e.key)) {
      setBuffer((prev) => (prev + e.key).slice(-2));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commitFret(col, string);
    } else if (e.key === "Backspace" || e.key === "Delete") {
      onChange(clearNote(tab, col, string));
      setBuffer("");
    } else if (ARTICULATIONS.includes(e.key as Articulation)) {
      onChange(toggleArtic(tab, col, string, e.key as Articulation));
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-stretch gap-2 overflow-x-auto rounded bg-neutral-900 p-2 font-mono">
        <div className="flex flex-col py-1 text-neutral-400">
          {ROWS.map((s) => (
            <span key={s} className="h-7 leading-7">
              {tuning[s]}
            </span>
          ))}
        </div>
        {tab.map((col, c) => (
          <div key={c} className="flex flex-col gap-0">
            {ROWS.map((s) => {
              const note = col.notes.find((n) => n.string === s);
              const isActive = active?.col === c && active?.string === s;
              return (
                <button
                  key={s}
                  type="button"
                  aria-label={`string-${s}-col-${c}`}
                  onClick={() => {
                    setActive({ col: c, string: s });
                    setBuffer("");
                  }}
                  onKeyDown={(e) => handleKey(e, c, s)}
                  onBlur={() => commitFret(c, s)}
                  className={`h-7 w-8 text-center text-sm tabular-nums ${
                    isActive ? "bg-amber-500/30 ring-1 ring-amber-400" : "hover:bg-neutral-800"
                  }`}
                >
                  {note ? cellToken(note) : <span className="text-neutral-600">-</span>}
                </button>
              );
            })}
            <button
              type="button"
              aria-label={`칸 삭제 ${c}`}
              onClick={() => onChange(removeColumn(tab, c))}
              className="mt-1 text-xs text-neutral-500 hover:text-red-400"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          aria-label="칸 추가"
          onClick={() => onChange(addColumn(tab))}
          className="self-center rounded bg-neutral-700 px-2 py-1 text-lg"
        >
          +
        </button>
      </div>
      <p className="text-xs text-neutral-500">
        칸 클릭 후 숫자 입력(0–24). 주법: h p / \ b ~ · 삭제: Backspace
      </p>
    </div>
  );
}
