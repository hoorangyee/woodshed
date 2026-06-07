import type { Articulation, Column, Note } from "./types";

export function addColumn(cols: Column[]): Column[] {
  return [...cols, { notes: [] }];
}

export function removeColumn(cols: Column[], index: number): Column[] {
  return cols.filter((_, i) => i !== index);
}

/** Move the column at `from` to position `to` (drag-and-drop reorder). */
export function moveColumn(cols: Column[], from: number, to: number): Column[] {
  if (from === to || from < 0 || to < 0 || from >= cols.length || to >= cols.length) return cols;
  const next = [...cols];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Drag a single note (fret + articulation) to another cell.
 * If the target string is already taken in that column, a fresh column is inserted there
 * so the existing note is pushed aside instead of overwritten.
 */
export function moveNote(
  cols: Column[],
  fromCol: number,
  fromString: number,
  toCol: number,
  toString: number,
): Column[] {
  if (toCol < 0 || toCol >= cols.length) return cols;
  if (fromCol === toCol && fromString === toString) return cols;
  const src = cols[fromCol]?.notes.find((n) => n.string === fromString);
  if (!src) return cols;
  const moved: Note = { ...src, string: toString };

  // Remove the note from its source cell (column indices are unchanged).
  const without = cols.map((col, i) =>
    i === fromCol ? { notes: col.notes.filter((n) => n.string !== fromString) } : col,
  );

  if (without[toCol].notes.some((n) => n.string === toString)) {
    // Collision → insert a new column at toCol; existing content shifts right.
    return [...without.slice(0, toCol), { notes: [moved] }, ...without.slice(toCol)];
  }
  return without.map((col, i) =>
    i === toCol
      ? { notes: [...col.notes, moved].sort((a, b) => a.string - b.string) }
      : col,
  );
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

/** Cycle bend: none → full (b) → half (b½) → none */
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
