"use client";
import { useRef, useState } from "react";
import { STRING_COUNT, TOGGLE_KEYS, type Column, type Note, type Articulation } from "@/lib/tab/types";
import { addColumn, removeColumn, moveColumn, moveNote, setNote, clearNote, toggleArtic, cycleBend } from "@/lib/tab/editor-ops";
import { cellToken } from "@/lib/tab/serialize";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Dict } from "@/lib/i18n/dictionaries";

interface Props {
  tab: Column[];
  tuning: string[];
  onChange: (next: Column[]) => void;
}

// String indices in top-to-bottom display order (high e=5 on top)
const ROWS = Array.from({ length: STRING_COUNT }, (_, i) => STRING_COUNT - 1 - i);

// Articulation toolbar buttons (labels referenced by dictionary key)
const TOOLS: { artic: Articulation; glyph: string; labelKey: keyof Dict }[] = [
  { artic: "h", glyph: "h", labelKey: "hammerOn" },
  { artic: "p", glyph: "p", labelKey: "pullOff" },
  { artic: "/", glyph: "╱", labelKey: "slideUp" },
  { artic: "\\", glyph: "╲", labelKey: "slideDown" },
  { artic: "b", glyph: "↗", labelKey: "fullBend" },
  { artic: "b½", glyph: "↗½", labelKey: "halfBend" },
  { artic: "~", glyph: "∿", labelKey: "vibrato" },
];

export function TabEditor({ tab, tuning, onChange }: Props) {
  const { t } = useI18n();
  const [active, setActive] = useState<{ col: number; string: number } | null>(null);
  // Recently pressed digits (window for two-digit frets). The cell always shows the real note value.
  const [buffer, setBuffer] = useState("");
  // Hidden input: focusing it on a cell tap brings up the OS numeric keypad.
  const inputRef = useRef<HTMLInputElement>(null);
  // Drag-and-drop column reorder (pointer-based → works on mouse and touch).
  const colEls = useRef<(HTMLDivElement | null)[]>([]);
  const [dragCol, setDragCol] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  function onGripDown(e: React.PointerEvent, c: number) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragCol(c);
    setDropTarget(c);
    setDragPos({ x: e.clientX, y: e.clientY });
  }
  function onGripMove(e: React.PointerEvent) {
    if (dragCol === null) return;
    const x = e.clientX;
    let ins = tab.length;
    for (let i = 0; i < tab.length; i++) {
      const r = colEls.current[i]?.getBoundingClientRect();
      if (r && x < r.left + r.width / 2) {
        ins = i;
        break;
      }
    }
    setDropTarget(ins);
    setDragPos({ x: e.clientX, y: e.clientY });
  }
  function onGripUp() {
    if (dragCol !== null && dropTarget !== null) {
      const to = dropTarget > dragCol ? dropTarget - 1 : dropTarget;
      if (to !== dragCol) {
        onChange(moveColumn(tab, dragCol, to));
        // Keep the active cell on its note as the columns reorder, and follow focus.
        if (active) {
          const ac = active.col;
          let nc = ac;
          if (ac === dragCol) nc = to;
          else if (dragCol < to && ac > dragCol && ac <= to) nc = ac - 1;
          else if (to < dragCol && ac >= to && ac < dragCol) nc = ac + 1;
          setActive({ col: nc, string: active.string });
          focusInput();
        }
      }
    }
    setDragCol(null);
    setDropTarget(null);
    setDragPos(null);
  }

  // Drag a single note (fret + articulation) onto another cell.
  const press = useRef<{ col: number; string: number; x: number; y: number; has: boolean; dragging: boolean } | null>(null);
  const justDragged = useRef(false);
  const [dragNote, setDragNote] = useState<{ col: number; string: number } | null>(null);
  const [dropCell, setDropCell] = useState<{ col: number; string: number } | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  function cellAt(x: number, y: number): { col: number; string: number } | null {
    const el = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>("[data-cell]");
    if (!el) return null;
    return { col: Number(el.dataset.col), string: Number(el.dataset.string) };
  }
  function onCellPointerDown(e: React.PointerEvent, c: number, s: number, has: boolean) {
    justDragged.current = false;
    press.current = { col: c, string: s, x: e.clientX, y: e.clientY, has, dragging: false };
  }
  function onCellPointerMove(e: React.PointerEvent) {
    const p = press.current;
    if (!p) return;
    if (!p.dragging) {
      if (!p.has) return;
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) return;
      p.dragging = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragNote({ col: p.col, string: p.string });
    }
    e.preventDefault();
    setDropCell(cellAt(e.clientX, e.clientY));
    setDragPos({ x: e.clientX, y: e.clientY });
  }
  function onCellPointerUp(e: React.PointerEvent) {
    const p = press.current;
    press.current = null;
    if (p?.dragging) {
      justDragged.current = true;
      // The synthetic click right after the drop is suppressed; clear the flag afterwards.
      setTimeout(() => {
        justDragged.current = false;
      }, 350);
      const target = cellAt(e.clientX, e.clientY);
      if (target) {
        onChange(moveNote(tab, p.col, p.string, target.col, target.string));
        // Move the active selection (and input focus) to where the note landed.
        setActive({ col: target.col, string: target.string });
        setBuffer("");
        focusInput();
      }
      setDragNote(null);
      setDropCell(null);
      setDragPos(null);
    }
  }

  const activeNote = active
    ? tab[active.col]?.notes.find((n) => n.string === active.string)
    : undefined;

  function focusInput() {
    inputRef.current?.focus();
  }

  function selectCell(col: number, string: number) {
    setActive({ col, string });
    setBuffer("");
    // Focus synchronously within the user gesture (tap) → shows the mobile keypad
    focusInput();
  }

  // Apply a single digit to the active note immediately (two-digit window supports 10-24). Shared by keyboard/keypad.
  function commitDigit(col: number, string: number, digit: string) {
    const nextBuf = (buffer + digit).slice(-2);
    const fret = Math.min(24, parseInt(nextBuf, 10));
    const existing = tab[col]?.notes.find((n) => n.string === string);
    setBuffer(nextBuf);
    onChange(setNote(tab, col, { string, fret, artic: existing?.artic }));
  }

  // Physical keyboard (desktop): handle digits/articulations/delete
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

  // Mobile soft keypad: keydown is unreliable, so capture digits/deletes via the input event.
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

  // Toolbar: toggle an articulation on the active note
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
      {/* Hidden input to summon the OS numeric keypad (fontSize 16 → prevents iOS zoom) */}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        aria-label={t.fretInputAria}
        tabIndex={-1}
        autoComplete="off"
        className="sr-only"
        style={{ fontSize: 16 }}
        onKeyDown={handleKey}
        onInput={handleInput}
        defaultValue=""
      />

      {/* Drag ghost — a lifted replica of the dragged cell/column, centered on the grab point */}
      {dragPos &&
        (() => {
          const ghostCell = (n: Note | undefined, key: React.Key) => (
            <span
              key={key}
              className="relative flex h-8 w-9 items-center justify-center text-sm tabular-nums text-ink"
            >
              <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-rule" />
              <span className="relative z-10">
                {n ? cellToken(n) : <span className="text-transparent">·</span>}
              </span>
            </span>
          );
          let cells: React.ReactNode = null;
          if (dragNote) {
            const n = tab[dragNote.col]?.notes.find((x) => x.string === dragNote.string);
            if (!n) return null;
            cells = ghostCell(n, "n");
          } else if (dragCol !== null && tab[dragCol]) {
            const col = tab[dragCol];
            cells = ROWS.map((s) => ghostCell(col.notes.find((x) => x.string === s), s));
          } else {
            return null;
          }
          return (
            <div
              className="pointer-events-none fixed z-50 flex -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-rule bg-paper-sunk p-1 font-mono shadow-lg"
              style={{ left: dragPos.x, top: dragPos.y }}
            >
              {cells}
            </div>
          );
        })()}

      <div className="flex items-stretch gap-1 overflow-x-auto rounded-lg border border-rule bg-paper-sunk p-3 font-mono">
        {/* String labels */}
        <div className="flex flex-col pr-1 text-sm font-medium text-ink-soft">
          {/* spacer matching each column's drag handle so labels line up with the string lines */}
          <span aria-hidden className="h-4" />
          {ROWS.map((s) => (
            <span key={s} className="flex h-8 items-center">
              {tuning[s]}
            </span>
          ))}
        </div>

        {tab.map((col, c) => (
          <div
            key={c}
            ref={(el) => {
              colEls.current[c] = el;
            }}
            className={`flex flex-col border-l-2 transition-opacity ${
              dragCol !== null && dropTarget === c ? "border-accent" : "border-transparent"
            } ${dragCol === c ? "opacity-40" : ""}`}
          >
            <button
              type="button"
              aria-label={t.dragColumn}
              onPointerDown={(e) => onGripDown(e, c)}
              onPointerMove={onGripMove}
              onPointerUp={onGripUp}
              onPointerCancel={onGripUp}
              className="flex h-4 cursor-grab touch-none items-center justify-center text-xs leading-none text-ink-faint transition-colors hover:text-accent active:cursor-grabbing"
            >
              ⠿
            </button>
            {ROWS.map((s) => {
              const note = col.notes.find((n) => n.string === s);
              const isActive = active?.col === c && active?.string === s;
              const isDropCell = dropCell?.col === c && dropCell?.string === s;
              const isDragSrc = dragNote?.col === c && dragNote?.string === s;
              return (
                <button
                  key={s}
                  type="button"
                  data-cell
                  data-col={c}
                  data-string={s}
                  aria-label={`string-${s}-col-${c}`}
                  onPointerDown={(e) => onCellPointerDown(e, c, s, !!note)}
                  onPointerMove={onCellPointerMove}
                  onPointerUp={onCellPointerUp}
                  onPointerCancel={onCellPointerUp}
                  onClick={() => {
                    if (justDragged.current) {
                      justDragged.current = false;
                      return;
                    }
                    selectCell(c, s);
                  }}
                  style={note ? { touchAction: "none" } : undefined}
                  className={`relative flex h-8 w-9 items-center justify-center text-sm tabular-nums transition-colors ${
                    note ? "cursor-grab active:cursor-grabbing" : ""
                  } ${
                    isActive
                      ? "rounded bg-accent font-medium text-paper-raised"
                      : isDropCell
                        ? "rounded ring-2 ring-accent ring-inset text-ink"
                        : "text-ink hover:bg-paper-raised"
                  } ${isDragSrc ? "opacity-30" : ""}`}
                >
                  {/* Line crossing the string */}
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
              aria-label={t.deleteColumn(c)}
              onClick={() => onChange(removeColumn(tab, c))}
              className="mt-1.5 flex h-5 items-center justify-center text-xs text-ink-faint transition-colors hover:text-accent"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          type="button"
          aria-label={t.addColumn}
          onClick={() => onChange(addColumn(tab))}
          className="ml-1 flex w-9 items-center justify-center self-center rounded-md border border-dashed border-rule py-2 text-lg text-ink-soft transition-colors hover:border-accent hover:text-accent"
        >
          +
        </button>
      </div>

      {/* Articulation toolbar */}
      <div className="rounded-lg border border-rule bg-paper-raised p-2">
        <div className="mb-1.5 flex items-center gap-2 px-1">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            {t.articulations}
          </span>
          <span className="text-xs text-ink-faint">
            {activeNote ? t.articToggleHint : t.selectNoteHint}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TOOLS.map((tool) => {
            const on = activeNote?.artic === tool.artic;
            const label = t[tool.labelKey] as string;
            return (
              <button
                key={tool.artic}
                type="button"
                aria-pressed={on}
                aria-label={label}
                disabled={!activeNote}
                onClick={() => applyArtic(tool.artic)}
                className={`flex min-w-[3.75rem] flex-col items-center gap-0.5 rounded-md border px-2 py-1.5 text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  on
                    ? "border-accent bg-accent text-paper-raised"
                    : "border-rule bg-paper-raised text-ink-soft hover:border-ink-soft hover:text-ink"
                }`}
              >
                <span className={`font-mono text-base leading-none ${on ? "" : "text-accent"}`}>
                  {tool.glyph}
                </span>
                <span>{label}</span>
              </button>
            );
          })}
          <button
            type="button"
            aria-label={t.clearNote}
            disabled={!activeNote}
            onClick={clearActiveNote}
            className="flex min-w-[3.75rem] flex-col items-center gap-0.5 rounded-md border border-rule bg-paper-raised px-2 py-1.5 text-[11px] text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="font-mono text-base leading-none">⌫</span>
            <span>{t.clearNote}</span>
          </button>
        </div>
      </div>

      <p className="text-xs text-ink-faint">{t.editorTip}</p>
    </div>
  );
}
