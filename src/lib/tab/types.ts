// b = full bend (whole step), b½ = half bend (half step)
export type Articulation = "h" | "p" | "/" | "\\" | "b" | "b½" | "~";
export const ARTICULATIONS: Articulation[] = ["h", "p", "/", "\\", "b", "b½", "~"];
// Articulations toggled by a single key (bends are cycled separately via the b key)
export const TOGGLE_KEYS: Articulation[] = ["h", "p", "/", "\\", "~"];

export interface Note {
  string: number; // 0 = low E ... 5 = high e
  fret: number;   // 0..24
  artic?: Articulation;
}

export interface Column {
  notes: Note[];
  /** A "whiskey break" column 🥃 — the bluesman sips between notes. */
  whiskey?: boolean;
}

export interface Lick {
  id: string;
  title: string;
  tuning: string[]; // length 6, index 0 = lowest string
  tab: Column[];
  memo: string;
  source: string;
  createdAt: number;
  updatedAt: number;
}

export const STANDARD_TUNING: string[] = ["E", "A", "D", "G", "B", "e"];
export const STRING_COUNT = 6;
