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
      <div className="flex items-stretch gap-1 overflow-x-auto rounded-lg border border-rule bg-paper-sunk p-3 font-mono">
        {/* 줄 라벨 */}
        <div className="flex flex-col pr-1 text-sm font-medium text-ink-soft">
          {ROWS.map((s) => (
            <span key={s} className="flex h-8 items-center">
              {tuning[s]}
            </span>
          ))}
        </div>

        {tab.map((col, c) => (
          <div key={c} className="flex flex-col">
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
                  className={`relative flex h-8 w-9 items-center justify-center text-sm tabular-nums transition-colors ${
                    isActive
                      ? "rounded bg-accent font-medium text-paper-raised"
                      : "text-ink hover:bg-paper-raised"
                  }`}
                >
                  {/* 현(줄)을 가로지르는 라인 */}
                  {!isActive && (
                    <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-rule" />
                  )}
                  <span className="relative z-10">
                    {note ? (
                      cellToken(note)
                    ) : (
                      <span className={isActive ? "" : "text-transparent"}>·</span>
                    )}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              aria-label={`칸 삭제 ${c}`}
              onClick={() => onChange(removeColumn(tab, c))}
              className="mt-1.5 flex h-5 items-center justify-center text-xs text-ink-faint transition-colors hover:text-accent"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          type="button"
          aria-label="칸 추가"
          onClick={() => onChange(addColumn(tab))}
          className="ml-1 flex w-9 items-center justify-center self-center rounded-md border border-dashed border-rule py-2 text-lg text-ink-soft transition-colors hover:border-accent hover:text-accent"
        >
          +
        </button>
      </div>
      <p className="text-xs text-ink-soft">
        칸을 누르고 <kbd className="rounded bg-paper-sunk px-1">숫자</kbd>(0–24) 입력 · 주법{" "}
        <kbd className="rounded bg-paper-sunk px-1">h p / \ b ~</kbd> · 지우기{" "}
        <kbd className="rounded bg-paper-sunk px-1">Backspace</kbd>
      </p>
    </div>
  );
}
