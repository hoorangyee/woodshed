// b = 풀 벤딩(온음), b½ = 하프 벤딩(반음)
export type Articulation = "h" | "p" | "/" | "\\" | "b" | "b½" | "~";
export const ARTICULATIONS: Articulation[] = ["h", "p", "/", "\\", "b", "b½", "~"];
// 단일 키로 토글되는 주법(벤딩은 b 키로 별도 순환 처리)
export const TOGGLE_KEYS: Articulation[] = ["h", "p", "/", "\\", "~"];

export interface Note {
  string: number; // 0 = 저음 E ... 5 = 고음 e
  fret: number;   // 0..24
  artic?: Articulation;
}

export interface Column {
  notes: Note[];
}

export interface Lick {
  id: string;
  title: string;
  tuning: string[]; // 길이 6, index 0 = 저음
  tab: Column[];
  memo: string;
  source: string;
  createdAt: number;
  updatedAt: number;
}

export const STANDARD_TUNING: string[] = ["E", "A", "D", "G", "B", "e"];
export const STRING_COUNT = 6;
