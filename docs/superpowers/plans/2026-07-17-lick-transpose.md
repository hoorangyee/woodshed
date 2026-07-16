# Lick Transpose (Key Change) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "KEY" − / + semitone stepper in the TAB editor that transposes every note's fret, refusing (button disabled) any move that would push a fret outside 0–24.

**Architecture:** A pure `transpose` op in `src/lib/tab/editor-ops.ts` (all-or-nothing, `null` on out-of-range) following the file's existing pattern, wired to two small buttons in `TabEditor`'s articulation-toolbar header. All derived surfaces (staff, playback, ASCII) read the tab, so they reflect the change automatically.

**Tech Stack:** Next.js (App Router), React 19, TypeScript, Vitest + Testing Library. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-16-lick-transpose-design.md`

## Global Constraints

- No new npm dependencies.
- Fret range is 0..24; add `export const MAX_FRET = 24;` to `src/lib/tab/types.ts` and use it (no magic 24 in the new op).
- Transpose is all-or-nothing: if ANY resulting fret would leave 0..MAX_FRET, `transpose` returns `null` and the UI button for that direction is disabled. No clamping — `+1` then `−1` must always restore the original tab.
- Articulations (`artic`) and whiskey columns (`whiskey: true`) are preserved through a transpose.
- i18n: every user-facing string goes through `dictionaries.ts` with BOTH `en` and `ko` entries (`ko` is typed `Dict`, so a missing key is a compile error). Keys and exact values: `keyLabel` ("Key" / "키"), `transposeUpAria` ("Transpose up a semitone" / "반음 올리기"), `transposeDownAria` ("Transpose down a semitone" / "반음 내리기").
- Tests via Vitest (`npx vitest run <file>`); component-test style follows `src/components/TabEditor.test.tsx` (its `Harness` wraps TabEditor with `useState`; `useI18n` falls back to English without a provider).
- KNOWN issue (not yours): project-wide `npx tsc --noEmit` has 27 pre-existing errors in `src/lib/db/licks.test.ts` and `src/lib/db/moderation.test.ts`; judge "no NEW errors mentioning your files", not exit code.
- Commit style: conventional commits ending with the trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: `transpose` op (+ `MAX_FRET`)

**Files:**
- Modify: `src/lib/tab/types.ts` (add one exported constant)
- Modify: `src/lib/tab/editor-ops.ts` (append one function)
- Test: `src/lib/tab/editor-ops.test.ts` (append one describe block)

**Interfaces:**
- Consumes: `Column`, `Note` from `./types` (existing).
- Produces (Task 2 relies on these exact names):
  - `MAX_FRET: number` exported from `src/lib/tab/types.ts`
  - `transpose(cols: Column[], semitones: number): Column[] | null` exported from `src/lib/tab/editor-ops.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/tab/editor-ops.test.ts` (add `transpose` to the existing import list from `./editor-ops`):

```ts
describe("transpose", () => {
  const tab: Column[] = [
    {
      notes: [
        { string: 0, fret: 5, artic: "b" },
        { string: 1, fret: 7 },
      ],
    },
    { notes: [], whiskey: true },
    { notes: [{ string: 2, fret: 0 }] },
  ];

  it("shifts every fret by the given semitones", () => {
    const up = transpose(tab, 2)!;
    expect(up[0].notes.map((n) => n.fret)).toEqual([7, 9]);
    expect(up[2].notes[0].fret).toBe(2);
  });

  it("preserves articulations and whiskey columns", () => {
    const up = transpose(tab, 2)!;
    expect(up[0].notes[0].artic).toBe("b");
    expect(up[1].whiskey).toBe(true);
  });

  it("returns null when a note would drop below fret 0", () => {
    expect(transpose(tab, -1)).toBeNull(); // column 3 sits on fret 0
  });

  it("returns null when a note would pass MAX_FRET", () => {
    const high: Column[] = [{ notes: [{ string: 0, fret: 24 }] }];
    expect(transpose(high, 1)).toBeNull();
  });

  it("round-trips: +1 then −1 restores the original", () => {
    const once = transpose(tab, 1)!;
    expect(transpose(once, -1)).toEqual(tab);
  });

  it("transposes a tab with no notes to itself", () => {
    expect(transpose([{ notes: [] }], 3)).toEqual([{ notes: [] }]);
  });

  it("does not mutate the input", () => {
    transpose(tab, 2);
    expect(tab[0].notes[0].fret).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/tab/editor-ops.test.ts`
Expected: FAIL — `transpose` is not exported.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/tab/types.ts`, directly after the `STRING_COUNT` export at the bottom, add:

```ts
export const MAX_FRET = 24;
```

Append to `src/lib/tab/editor-ops.ts` (extend the type import at the top to `import { MAX_FRET, type Articulation, type Column, type Note } from "./types";`):

```ts
/**
 * Shift every note's fret by `semitones` (same string). All-or-nothing:
 * returns null when any resulting fret would leave 0..MAX_FRET, so a +1
 * followed by −1 always restores the original tab (no clamping). Whiskey
 * and empty columns pass through unchanged.
 */
export function transpose(cols: Column[], semitones: number): Column[] | null {
  const out: Column[] = [];
  for (const col of cols) {
    const notes: Note[] = [];
    for (const n of col.notes) {
      const fret = n.fret + semitones;
      if (fret < 0 || fret > MAX_FRET) return null;
      notes.push({ ...n, fret });
    }
    out.push({ ...col, notes });
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/tab/editor-ops.test.ts`
Expected: PASS (all describe blocks, including the 7 new tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tab/types.ts src/lib/tab/editor-ops.ts src/lib/tab/editor-ops.test.ts
git commit -m "feat(editor): transpose op shifts all frets by semitones

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: i18n keys + KEY stepper in `TabEditor`

**Files:**
- Modify: `src/lib/i18n/dictionaries.ts` (en block after `bpmAria: "Tempo (BPM)",`; ko block after `bpmAria: "템포 (BPM)",`)
- Modify: `src/components/TabEditor.tsx` (import + 3 helpers + articulation-toolbar header row)
- Test: `src/components/TabEditor.test.tsx` (append one describe block)

**Interfaces:**
- Consumes: `transpose` from `@/lib/tab/editor-ops` (Task 1): `transpose(cols: Column[], semitones: number): Column[] | null`.
- Produces: no new exports — UI only.

- [ ] **Step 1: Add dictionary keys**

In `src/lib/i18n/dictionaries.ts`, add to the `en` object directly after the `bpmAria: "Tempo (BPM)",` line:

```ts
  keyLabel: "Key",
  transposeUpAria: "Transpose up a semitone",
  transposeDownAria: "Transpose down a semitone",
```

And to the `ko` object directly after the `bpmAria: "템포 (BPM)",` line:

```ts
  keyLabel: "키",
  transposeUpAria: "반음 올리기",
  transposeDownAria: "반음 내리기",
```

- [ ] **Step 2: Write the failing test**

Append to `src/components/TabEditor.test.tsx` (the file already imports `render`, `screen`, `userEvent`, `vi`, `Harness` is defined at the top; add `STANDARD_TUNING` / `TabEditor` imports only if not already present — they are):

```tsx
describe("transpose buttons", () => {
  it("shifts a note up a semitone through onChange", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const cell = screen.getByRole("button", { name: "string-2-col-0" });
    await user.click(cell);
    await user.keyboard("7");
    await user.click(screen.getByRole("button", { name: "Transpose up a semitone" }));
    expect(cell).toHaveTextContent("8");
  });

  it("disables both buttons when the tab has no notes", () => {
    render(<TabEditor tab={[{ notes: [] }]} tuning={STANDARD_TUNING} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Transpose up a semitone" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Transpose down a semitone" })).toBeDisabled();
  });

  it("disables − when a note sits on fret 0, keeps + enabled", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "string-2-col-0" }));
    await user.keyboard("0");
    expect(screen.getByRole("button", { name: "Transpose down a semitone" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Transpose up a semitone" })).toBeEnabled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/TabEditor.test.tsx`
Expected: FAIL — no button named "Transpose up a semitone".

- [ ] **Step 4: Write the implementation**

In `src/components/TabEditor.tsx`:

1. Extend the editor-ops import (line 4) with `transpose`:

```ts
import { addColumn, removeColumn, insertWhiskey, moveColumn, moveNote, setNote, clearNote, toggleArtic, cycleBend, transpose } from "@/lib/tab/editor-ops";
```

2. Directly after the `clearActiveNote` function, add:

```tsx
  // KEY stepper: transpose the whole tab by ±1 semitone (all-or-nothing)
  const hasNotes = tab.some((c) => c.notes.length > 0);
  const canTransposeUp = hasNotes && transpose(tab, 1) !== null;
  const canTransposeDown = hasNotes && transpose(tab, -1) !== null;
  function applyTranspose(semitones: number) {
    const next = transpose(tab, semitones);
    if (next) onChange(next);
  }
```

3. Replace the articulation-toolbar header row

```tsx
        <div className="mb-1.5 flex items-center gap-2 px-1">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            {t.articulations}
          </span>
          <span className="text-xs text-ink-faint">
            {activeNote ? t.articToggleHint : t.selectNoteHint}
          </span>
        </div>
```

with:

```tsx
        <div className="mb-1.5 flex flex-wrap items-center gap-2 px-1">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            {t.articulations}
          </span>
          <span className="text-xs text-ink-faint">
            {activeNote ? t.articToggleHint : t.selectNoteHint}
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
              {t.keyLabel}
            </span>
            <button
              type="button"
              aria-label={t.transposeDownAria}
              title={t.transposeDownAria}
              disabled={!canTransposeDown}
              onClick={() => applyTranspose(-1)}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-rule bg-paper-raised font-mono text-sm text-ink-soft transition-colors hover:border-ink-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              −
            </button>
            <button
              type="button"
              aria-label={t.transposeUpAria}
              title={t.transposeUpAria}
              disabled={!canTransposeUp}
              onClick={() => applyTranspose(1)}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-rule bg-paper-raised font-mono text-sm text-ink-soft transition-colors hover:border-ink-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
          </span>
        </div>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/TabEditor.test.tsx && npx tsc --noEmit`
Expected: PASS (3 new tests); typecheck shows only the 27 known pre-existing errors, none mentioning TabEditor or dictionaries.

- [ ] **Step 6: Commit**

```bash
git add src/lib/i18n/dictionaries.ts src/components/TabEditor.tsx src/components/TabEditor.test.tsx
git commit -m "feat(editor): KEY stepper transposes the lick by semitones

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Full verification + README

**Files:**
- Modify: `README.md` (editor feature bullet)

- [ ] **Step 1: Run the full suite**

Run: `npm test && npm run lint`
Expected: all tests pass (89 total: 79 existing + 10 new), lint clean.

- [ ] **Step 2: Manual browser verification**

Per `.claude/skills/verify/SKILL.md` (dev server, dev login, editor at `/licks/new`):

1. KEY − / + buttons appear at the right of the ARTICULATIONS header; both disabled on an empty tab.
2. Enter notes (e.g. 7 and 0 on two columns): − is disabled (fret 0 present), + is enabled.
3. Click + → every fret rises by 1 (7→8, 0→1) in grid, staff preview, and ASCII copy; − becomes enabled.
4. Click − → original frets restored.
5. Raise a note to 24 → + becomes disabled.
6. Playback after transpose sounds a semitone higher (schedule derives from the tab).
7. Articulations and whiskey columns survive a ± round trip.

- [ ] **Step 3: Update README**

In `README.md`, in the Features list, replace:

```markdown
- **Graphic TAB editor** — click frets on a 6‑string grid; articulations (hammer‑on/pull‑off, slides, full/half bends, vibrato) rendered as a real sheet‑music staff. Live ASCII preview + copy. Works on mobile via the native numeric keypad.
```

with:

```markdown
- **Graphic TAB editor** — click frets on a 6‑string grid; articulations (hammer‑on/pull‑off, slides, full/half bends, vibrato) rendered as a real sheet‑music staff. One‑tap key transpose (± semitone). Live ASCII preview + copy. Works on mobile via the native numeric keypad.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(readme): mention key transpose in the editor feature

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
