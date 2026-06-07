import { describe, it, expect } from "vitest";
import {
  addColumn,
  removeColumn,
  moveColumn,
  moveNote,
  setNote,
  clearNote,
  toggleArtic,
  cycleBend,
} from "./editor-ops";
import type { Column } from "./types";

const base: Column[] = [{ notes: [] }];

describe("addColumn / removeColumn", () => {
  it("adds an empty column at end", () => {
    expect(addColumn(base)).toHaveLength(2);
    expect(addColumn(base)[1].notes).toEqual([]);
  });
  it("removes the column at index", () => {
    const two: Column[] = [{ notes: [{ string: 0, fret: 1 }] }, { notes: [] }];
    expect(removeColumn(two, 0)).toHaveLength(1);
    expect(removeColumn(two, 0)[0].notes).toEqual([]);
  });
});

describe("moveColumn", () => {
  const cols = (...frets: number[]): Column[] => frets.map((f) => ({ notes: [{ string: 0, fret: f }] }));
  it("moves a column to a new position", () => {
    const r = moveColumn(cols(1, 2, 3), 0, 2);
    expect(r.map((c) => c.notes[0].fret)).toEqual([2, 3, 1]);
  });
  it("moves backwards", () => {
    const r = moveColumn(cols(1, 2, 3), 2, 0);
    expect(r.map((c) => c.notes[0].fret)).toEqual([3, 1, 2]);
  });
  it("is a no-op for equal or out-of-range indices", () => {
    const c = cols(1, 2, 3);
    expect(moveColumn(c, 1, 1)).toBe(c);
    expect(moveColumn(c, 0, 9)).toBe(c);
  });
});

describe("moveNote", () => {
  it("moves a note (fret + artic) to an empty cell, keeping the articulation", () => {
    const t: Column[] = [{ notes: [{ string: 3, fret: 14, artic: "b" }] }, { notes: [] }];
    const r = moveNote(t, 0, 3, 1, 5);
    expect(r[0].notes).toEqual([]);
    expect(r[1].notes).toEqual([{ string: 5, fret: 14, artic: "b" }]);
  });

  it("inserts a new column when the target cell is occupied (pushes existing aside)", () => {
    const t: Column[] = [
      { notes: [{ string: 0, fret: 1 }] },
      { notes: [{ string: 0, fret: 9 }] },
    ];
    const r = moveNote(t, 0, 0, 1, 0); // drop onto occupied (col1,string0)
    expect(r).toHaveLength(3);
    expect(r[0].notes).toEqual([]); // source emptied
    expect(r[1].notes).toEqual([{ string: 0, fret: 1 }]); // moved into a fresh column
    expect(r[2].notes).toEqual([{ string: 0, fret: 9 }]); // existing pushed right
  });

  it("is a no-op for the same cell or a missing source note", () => {
    const t: Column[] = [{ notes: [{ string: 0, fret: 1 }] }];
    expect(moveNote(t, 0, 0, 0, 0)).toBe(t);
    expect(moveNote(t, 0, 2, 0, 3)).toBe(t);
  });
});

describe("setNote / clearNote", () => {
  it("sets a note on a string, replacing any existing note on that string", () => {
    let cols = setNote(base, 0, { string: 2, fret: 5 });
    expect(cols[0].notes).toEqual([{ string: 2, fret: 5 }]);
    cols = setNote(cols, 0, { string: 2, fret: 7 });
    expect(cols[0].notes).toEqual([{ string: 2, fret: 7 }]);
  });
  it("clears the note on a string", () => {
    const cols = setNote(base, 0, { string: 2, fret: 5 });
    expect(clearNote(cols, 0, 2)[0].notes).toEqual([]);
  });
});

describe("toggleArtic", () => {
  it("sets then unsets articulation on a note", () => {
    let cols = setNote(base, 0, { string: 2, fret: 5 });
    cols = toggleArtic(cols, 0, 2, "b");
    expect(cols[0].notes[0].artic).toBe("b");
    cols = toggleArtic(cols, 0, 2, "b");
    expect(cols[0].notes[0].artic).toBeUndefined();
  });
  it("replaces a different articulation", () => {
    let cols = setNote(base, 0, { string: 2, fret: 5, artic: "h" });
    cols = toggleArtic(cols, 0, 2, "b");
    expect(cols[0].notes[0].artic).toBe("b");
  });
});

describe("cycleBend", () => {
  it("cycles none → full → half → none", () => {
    let cols = setNote(base, 0, { string: 2, fret: 5 });
    cols = cycleBend(cols, 0, 2);
    expect(cols[0].notes[0].artic).toBe("b");
    cols = cycleBend(cols, 0, 2);
    expect(cols[0].notes[0].artic).toBe("b½");
    cols = cycleBend(cols, 0, 2);
    expect(cols[0].notes[0].artic).toBeUndefined();
  });
  it("overrides a non-bend articulation by starting at full", () => {
    let cols = setNote(base, 0, { string: 2, fret: 5, artic: "/" });
    cols = cycleBend(cols, 0, 2);
    expect(cols[0].notes[0].artic).toBe("b");
  });
});
