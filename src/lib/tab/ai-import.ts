import { STANDARD_TUNING, STRING_COUNT, type Column, type Articulation } from "./types";

const ARTICS: Articulation[] = ["h", "p", "/", "\\", "b", "b½", "~"];

export interface AiTabResult {
  tuning: string[];
  tab: Column[];
}

/** Validate/clamp an LLM's loose JSON into a safe { tuning, tab }. Never throws. */
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

  const cols: Column[] = [];
  if (Array.isArray(obj.tab)) {
    for (const c of obj.tab) {
      const notesRaw = (c as Record<string, unknown>)?.notes;
      const notes: Column["notes"] = [];
      if (Array.isArray(notesRaw)) {
        for (const n of notesRaw) {
          const note = (n ?? {}) as Record<string, unknown>;
          const string = Number(note.string);
          const fret = Number(note.fret);
          if (!Number.isInteger(string) || string < 0 || string > STRING_COUNT - 1) continue;
          if (!Number.isInteger(fret) || fret < 0 || fret > 24) continue;
          const artic =
            typeof note.artic === "string" && ARTICS.includes(note.artic as Articulation)
              ? (note.artic as Articulation)
              : undefined;
          notes.push(artic ? { string, fret, artic } : { string, fret });
        }
      }
      cols.push({ notes });
    }
  }
  // Trim trailing empty columns; keep at least one.
  while (cols.length > 1 && cols[cols.length - 1].notes.length === 0) cols.pop();
  return { tuning, tab: cols.length ? cols : [{ notes: [] }] };
}
