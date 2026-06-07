"use client";
import { useRef, useState } from "react";
import { STRING_COUNT, TOGGLE_KEYS, type Column, type Articulation } from "@/lib/tab/types";
import { addColumn, removeColumn, setNote, clearNote, toggleArtic, cycleBend } from "@/lib/tab/editor-ops";
import { cellToken } from "@/lib/tab/serialize";

interface Props {
  tab: Column[];
  tuning: string[];
  onChange: (next: Column[]) => void;
}

// 위→아래 표시 순서의 줄 인덱스 (고음 e=5 가 맨 위)
const ROWS = Array.from({ length: STRING_COUNT }, (_, i) => STRING_COUNT - 1 - i);

// 주법 툴바 버튼
const TOOLS: { artic: Articulation; glyph: string; label: string }[] = [
  { artic: "h", glyph: "h", label: "해머온" },
  { artic: "p", glyph: "p", label: "풀오프" },
  { artic: "/", glyph: "╱", label: "슬라이드↑" },
  { artic: "\\", glyph: "╲", label: "슬라이드↓" },
  { artic: "b", glyph: "↗", label: "풀 벤딩" },
  { artic: "b½", glyph: "↗½", label: "하프 벤딩" },
  { artic: "~", glyph: "∿", label: "비브라토" },
];

export function TabEditor({ tab, tuning, onChange }: Props) {
  const [active, setActive] = useState<{ col: number; string: number } | null>(null);
  // 직전에 누른 숫자들(두 자리 프렛 입력용 윈도). 셀 표시는 항상 실제 note 값을 따른다.
  const [buffer, setBuffer] = useState("");
  // 숨겨진 입력: 칸을 탭하면 포커스를 줘서 OS 숫자 키패드를 띄운다.
  const inputRef = useRef<HTMLInputElement>(null);

  const activeNote = active
    ? tab[active.col]?.notes.find((n) => n.string === active.string)
    : undefined;

  function focusInput() {
    inputRef.current?.focus();
  }

  function selectCell(col: number, string: number) {
    setActive({ col, string });
    setBuffer("");
    // 사용자 제스처(탭) 안에서 동기적으로 포커스 → 모바일 키패드 표시
    focusInput();
  }

  // 숫자 한 자리를 활성 음에 즉시 반영(두 자리 윈도로 10~24 지원). 키보드/키패드 공용.
  function commitDigit(col: number, string: number, digit: string) {
    const nextBuf = (buffer + digit).slice(-2);
    const fret = Math.min(24, parseInt(nextBuf, 10));
    const existing = tab[col]?.notes.find((n) => n.string === string);
    setBuffer(nextBuf);
    onChange(setNote(tab, col, { string, fret, artic: existing?.artic }));
  }

  // 물리 키보드(데스크톱): 숫자/주법/삭제 처리
  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!active) return;
    const { col, string } = active;
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      commitDigit(col, string, e.key);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setBuffer("");
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      onChange(clearNote(tab, col, string));
      setBuffer("");
    } else if (e.key === "b") {
      e.preventDefault();
      onChange(cycleBend(tab, col, string));
    } else if (TOGGLE_KEYS.includes(e.key as Articulation)) {
      e.preventDefault();
      onChange(toggleArtic(tab, col, string, e.key as Articulation));
    }
  }

  // 모바일 소프트 키패드: keydown이 불안정하므로 입력 이벤트로 숫자/삭제를 잡는다.
  function handleInput(e: React.FormEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    if (!active) {
      el.value = "";
      return;
    }
    const ne = e.nativeEvent as InputEvent;
    if (ne.inputType && ne.inputType.startsWith("delete")) {
      onChange(clearNote(tab, active.col, active.string));
      setBuffer("");
      el.value = "";
      return;
    }
    const src = ne.data ?? el.value;
    const digits = src.match(/\d/g);
    if (digits && digits.length) {
      commitDigit(active.col, active.string, digits[digits.length - 1]);
    }
    el.value = "";
  }

  // 툴바: 활성 음에 주법 토글
  function applyArtic(artic: Articulation) {
    if (!active || !activeNote) return;
    onChange(toggleArtic(tab, active.col, active.string, artic));
    focusInput();
  }

  function clearActiveNote() {
    if (!active || !activeNote) return;
    onChange(clearNote(tab, active.col, active.string));
    setBuffer("");
    focusInput();
  }

  return (
    <div className="space-y-3">
      {/* OS 숫자 키패드를 띄우기 위한 숨김 입력 (fontSize 16 → iOS 줌 방지) */}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        aria-label="프렛 숫자 입력"
        tabIndex={-1}
        autoComplete="off"
        className="sr-only"
        style={{ fontSize: 16 }}
        onKeyDown={handleKey}
        onInput={handleInput}
        defaultValue=""
      />

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
                  onClick={() => selectCell(c, s)}
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

      {/* 주법 툴바 */}
      <div className="rounded-lg border border-rule bg-paper-raised p-2">
        <div className="mb-1.5 flex items-center gap-2 px-1">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">주법</span>
          <span className="text-xs text-ink-faint">
            {activeNote ? "버튼으로 켜고 끄기" : "음을 선택하면 적용할 수 있어요"}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TOOLS.map((t) => {
            const on = activeNote?.artic === t.artic;
            return (
              <button
                key={t.artic}
                type="button"
                aria-pressed={on}
                aria-label={t.label}
                disabled={!activeNote}
                onClick={() => applyArtic(t.artic)}
                className={`flex min-w-[3.75rem] flex-col items-center gap-0.5 rounded-md border px-2 py-1.5 text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  on
                    ? "border-accent bg-accent text-paper-raised"
                    : "border-rule bg-paper-raised text-ink-soft hover:border-ink-soft hover:text-ink"
                }`}
              >
                <span className={`font-mono text-base leading-none ${on ? "" : "text-accent"}`}>
                  {t.glyph}
                </span>
                <span>{t.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            aria-label="음 지우기"
            disabled={!activeNote}
            onClick={clearActiveNote}
            className="flex min-w-[3.75rem] flex-col items-center gap-0.5 rounded-md border border-rule bg-paper-raised px-2 py-1.5 text-[11px] text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="font-mono text-base leading-none">⌫</span>
            <span>음 지우기</span>
          </button>
        </div>
      </div>

      <p className="text-xs text-ink-faint">
        팁: 칸을 탭하면 숫자 키패드가 떠요. 두 자리는 숫자를 이어서 누르세요(최대 24). 주법은 위 버튼{" "}
        또는 단축키(<span className="font-mono">h p / \ b ~</span>)로 입력합니다.
      </p>
    </div>
  );
}
