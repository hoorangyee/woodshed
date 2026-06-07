import type { Articulation, Column, Note } from "./types";

export function addColumn(cols: Column[]): Column[] {
  return [...cols, { notes: [] }];
}

export function removeColumn(cols: Column[], index: number): Column[] {
  return cols.filter((_, i) => i !== index);
}

export function setNote(cols: Column[], colIndex: number, note: Note): Column[] {
  return cols.map((col, i) => {
    if (i !== colIndex) return col;
    const others = col.notes.filter((n) => n.string !== note.string);
    return { notes: [...others, note].sort((a, b) => a.string - b.string) };
  });
}

export function clearNote(cols: Column[], colIndex: number, string: number): Column[] {
  return cols.map((col, i) =>
    i === colIndex ? { notes: col.notes.filter((n) => n.string !== string) } : col,
  );
}

export function toggleArtic(
  cols: Column[],
  colIndex: number,
  string: number,
  artic: Articulation,
): Column[] {
  return cols.map((col, i) => {
    if (i !== colIndex) return col;
    return {
      notes: col.notes.map((n) =>
        n.string === string ? { ...n, artic: n.artic === artic ? undefined : artic } : n,
      ),
    };
  });
}

/** 벤딩 순환: 없음 → 풀(b) → 하프(b½) → 없음 */
export function cycleBend(cols: Column[], colIndex: number, string: number): Column[] {
  const next = (artic: Articulation | undefined): Articulation | undefined =>
    artic === "b" ? "b½" : artic === "b½" ? undefined : "b";
  return cols.map((col, i) => {
    if (i !== colIndex) return col;
    return {
      notes: col.notes.map((n) => (n.string === string ? { ...n, artic: next(n.artic) } : n)),
    };
  });
}
