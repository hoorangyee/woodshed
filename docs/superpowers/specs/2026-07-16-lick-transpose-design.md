# Lick Transpose (Key Change) — Design

**Date:** 2026-07-16
**Status:** Approved

## Goal

Let lick authors shift a lick's key from the editor: a "KEY" control with − / +
semitone buttons transposes every note's fret on its own string. The change is a
normal edit — saved with the lick, and automatically reflected everywhere the
tab is consumed (staff, playback, ASCII copy).

## Decisions (user-confirmed)

| Decision | Choice |
| --- | --- |
| Where | Editor editing tool (destructive edit, saved with the lick) |
| UI | Semitone − / + stepper (licks store no key metadata, so only relative moves are possible) |
| Out-of-range frets | Refuse the whole move and disable the button for that direction |

## Design

### `src/lib/tab/types.ts`

- Add `export const MAX_FRET = 24;` (the 0–24 fret range is currently an
  unnamed convention in comments and the editor's digit cap).

### `src/lib/tab/editor-ops.ts` (pure, tested)

```ts
/**
 * Shift every note's fret by `semitones` (same string). Returns null when any
 * resulting fret would leave 0..MAX_FRET — the move is all-or-nothing, so a
 * +1 followed by −1 always restores the original tab (lossless, no clamping).
 * Columns with no notes (including whiskey breaks 🥃) pass through unchanged;
 * a tab with no notes transposes to itself.
 */
export function transpose(cols: Column[], semitones: number): Column[] | null;
```

- Preserves articulations and the `whiskey` flag (spread the column, replace
  only `notes`).

### `src/components/TabEditor.tsx`

- A "KEY" control group rendered alongside the ARTICULATIONS toolbar:
  - `−` button, aria-label from i18n ("Transpose down a semitone" / ko)
  - `+` button, aria-label from i18n ("Transpose up a semitone" / ko)
- Click → `onChange(transpose(tab, ±1)!)`.
- A direction's button is disabled when the tab has no notes or
  `transpose(tab, ±1) === null` (some note would leave 0..24).
- Styling follows the existing articulation-button chrome.

### Derived surfaces (no changes needed)

`TabStaff`, `TabView` preview, playback (`buildSchedule`), and `toAscii` all
read the tab data — the transposed tab flows through automatically.

### i18n

New dictionary keys in BOTH `en` and `ko` (same shape):
`keyLabel` ("KEY" / "키"), `transposeUpAria` ("Transpose up a semitone" /
"반음 올리기"), `transposeDownAria` ("Transpose down a semitone" / "반음 내리기").

## Error handling

- Out-of-range move: unreachable through the UI (button disabled); the op
  itself returns `null` rather than corrupting data if called directly.
- Empty tab / whiskey-only tab: both buttons disabled.

## Testing

- `editor-ops.test.ts`: shifts frets up/down; preserves articulation and
  whiskey columns; returns `null` when a note would pass fret 0 or MAX_FRET;
  empty tab returns the same content; +1 then −1 round-trips.
- `TabEditor.test.tsx`: clicking + updates the visible fret (e.g. 7 → 8);
  the − button is disabled when a note sits on fret 0; onChange receives the
  transposed tab.

## Out of scope (future work)

- Key metadata on licks (naming the key, absolute key picker).
- View-only transpose on the detail page (capo-style, non-destructive).
- Batch ±N input; ±1 stepping covers it.
