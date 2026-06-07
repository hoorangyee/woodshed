import { STANDARD_TUNING, STRING_COUNT, type Column, type Note, type Articulation } from "./types";

const ARTICS: Articulation[] = ["h", "p", "/", "\\", "b", "b½", "~"];

interface RawNote {
  string: number;
  fret: number;
  artic?: Articulation;
  x: number;
}

export interface AiTabResult {
  tuning: string[];
  tab: Column[];
}

/**
 * Validate the model's flat note list (each note carries a horizontal position x)
 * and reconstruct columns deterministically — the model judges *what*, we judge *where in time*.
 */
export function sanitizeTab(raw: unknown): AiTabResult {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  let tuning = STANDARD_TUNING;
  if (
    Array.isArray(obj.tuning) &&
    obj.tuning.length === STRING_COUNT &&
    obj.tuning.every((s) => typeof s === "string" && s.trim().length > 0)
  ) {
    tuning = obj.tuning.map((s) => String(s).trim().slice(0, 3));
  }

  const valid: RawNote[] = [];
  if (Array.isArray(obj.notes)) {
    for (const n of obj.notes) {
      const note = (n ?? {}) as Record<string, unknown>;
      const string = Number(note.string);
      const fret = Number(note.fret);
      if (!Number.isInteger(string) || string < 0 || string > STRING_COUNT - 1) continue;
      if (!Number.isInteger(fret) || fret < 0 || fret > 24) continue;
      const x = Number(note.x);
      const artic =
        typeof note.artic === "string" && ARTICS.includes(note.artic as Articulation)
          ? (note.artic as Articulation)
          : undefined;
      valid.push({ string, fret, artic, x: Number.isFinite(x) ? x : valid.length });
    }
  }

  return { tuning, tab: quantize(valid) };
}

function toNote(n: RawNote): Note {
  return n.artic ? { string: n.string, fret: n.fret, artic: n.artic } : { string: n.string, fret: n.fret };
}

/** Turn x-positioned notes into columns: cluster same-x notes (chords), insert empty columns for gaps. */
function quantize(notes: RawNote[]): Column[] {
  if (notes.length === 0) return [{ notes: [] }];
  const sorted = [...notes].sort((a, b) => a.x - b.x);
  const range = Math.max(1, sorted[sorted.length - 1].x - sorted[0].x);
  const sameTol = range * 0.02; // notes within 2% of width = same time position (chord)

  const events: { x: number; notes: Note[] }[] = [];
  for (const n of sorted) {
    const last = events[events.length - 1];
    if (last && n.x - last.x <= sameTol) last.notes.push(toNote(n));
    else events.push({ x: n.x, notes: [toNote(n)] });
  }
  if (events.length === 1) return [{ notes: events[0].notes }];

  // One "step" = the smallest gap between events; larger gaps become proportional empty columns.
  const gaps: number[] = [];
  for (let i = 1; i < events.length; i++) gaps.push(events[i].x - events[i - 1].x);
  const positive = gaps.filter((g) => g > 0);
  const unit = positive.length ? Math.min(...positive) : range;

  const cols: Column[] = [{ notes: events[0].notes }];
  for (let i = 1; i < events.length; i++) {
    const empties = Math.max(0, Math.min(8, Math.round((events[i].x - events[i - 1].x) / unit) - 1));
    for (let k = 0; k < empties; k++) cols.push({ notes: [] });
    cols.push({ notes: events[i].notes });
  }
  return cols;
}
