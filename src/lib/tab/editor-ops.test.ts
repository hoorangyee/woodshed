import { describe, it, expect } from "vitest";
import { addColumn, removeColumn, setNote, clearNote, toggleArtic } from "./editor-ops";
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
