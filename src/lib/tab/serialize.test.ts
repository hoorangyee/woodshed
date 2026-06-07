import { describe, it, expect } from "vitest";
import { toAscii, cellToken } from "./serialize";
import { STANDARD_TUNING, type Column } from "./types";

describe("cellToken", () => {
  it("renders fret number", () => {
    expect(cellToken({ string: 0, fret: 5 })).toBe("5");
  });
  it("appends articulation", () => {
    expect(cellToken({ string: 0, fret: 7, artic: "b" })).toBe("7b");
  });
});

describe("toAscii", () => {
  it("renders empty tab as six dashed lines with labels", () => {
    const out = toAscii([], STANDARD_TUNING);
    const lines = out.split("\n");
    expect(lines).toHaveLength(6);
    expect(lines[0].startsWith("e|")).toBe(true); // high string on top
    expect(lines[5].startsWith("E|")).toBe(true);
  });

  it("places notes on the correct string and pads columns to equal width", () => {
    // tuning index: 0=E,1=A,2=D,3=G,4=B,5=e. Display order (top→bottom) = e,B,G,D,A,E.
    const tab: Column[] = [
      { notes: [{ string: 4, fret: 8, artic: "b" }] }, // B string → lines[1], 2 chars wide
      { notes: [{ string: 3, fret: 7 }] },             // G string → lines[2]
    ];
    const out = toAscii(tab, STANDARD_TUNING);
    const lines = out.split("\n");
    const bLine = lines[1]; // B
    const gLine = lines[2]; // G
    expect(bLine).toContain("8b");
    expect(gLine).toContain("7");
    // All lines have equal length (column-aligned)
    const lens = new Set(lines.map((l) => l.length));
    expect(lens.size).toBe(1);
  });
});
