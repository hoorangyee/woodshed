import { describe, it, expect } from "vitest";
import { sanitizeTab } from "./ai-import";

describe("sanitizeTab", () => {
  it("maps valid notes and articulations", () => {
    const r = sanitizeTab({
      tuning: ["E", "A", "D", "G", "B", "e"],
      tab: [{ notes: [{ string: 3, fret: 5, artic: "h" }] }, { notes: [{ string: 3, fret: 7, artic: "" }] }],
    });
    expect(r.tuning).toEqual(["E", "A", "D", "G", "B", "e"]);
    expect(r.tab).toHaveLength(2);
    expect(r.tab[0].notes[0]).toEqual({ string: 3, fret: 5, artic: "h" });
    expect(r.tab[1].notes[0]).toEqual({ string: 3, fret: 7 }); // "" → no artic
  });

  it("drops out-of-range strings/frets and invalid articulations", () => {
    const r = sanitizeTab({
      tab: [{ notes: [{ string: 9, fret: 3 }, { string: 2, fret: 99 }, { string: 2, fret: 4, artic: "z" }] }],
    });
    expect(r.tab[0].notes).toEqual([{ string: 2, fret: 4 }]);
  });

  it("falls back to standard tuning and empty tab on garbage", () => {
    expect(sanitizeTab(null)).toEqual({ tuning: ["E", "A", "D", "G", "B", "e"], tab: [{ notes: [] }] });
    expect(sanitizeTab({ tuning: ["x"], tab: "nope" }).tuning).toEqual(["E", "A", "D", "G", "B", "e"]);
  });

  it("trims trailing empty columns", () => {
    const r = sanitizeTab({ tab: [{ notes: [{ string: 0, fret: 3 }] }, { notes: [] }, { notes: [] }] });
    expect(r.tab).toHaveLength(1);
  });
});
