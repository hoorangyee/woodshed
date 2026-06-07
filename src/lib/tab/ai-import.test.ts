import { describe, it, expect } from "vitest";
import { sanitizeTab } from "./ai-import";

describe("sanitizeTab", () => {
  it("maps valid notes and articulations", () => {
    const r = sanitizeTab({
      tuning: ["E", "A", "D", "G", "B", "e"],
      notes: [
        { string: 3, fret: 5, artic: "h", x: 0 },
        { string: 3, fret: 7, artic: "", x: 100 },
      ],
    });
    expect(r.tuning).toEqual(["E", "A", "D", "G", "B", "e"]);
    expect(r.tab[0].notes[0]).toEqual({ string: 3, fret: 5, artic: "h" });
    expect(r.tab[1].notes[0]).toEqual({ string: 3, fret: 7 }); // "" → no artic
  });

  it("reconstructs spacing from x (a wide gap becomes an empty column)", () => {
    const r = sanitizeTab({
      notes: [
        { string: 3, fret: 5, x: 0 },
        { string: 3, fret: 7, x: 100 },
        { string: 3, fret: 8, x: 300 },
      ],
    });
    expect(r.tab.map((c) => c.notes.map((n) => n.fret))).toEqual([[5], [7], [], [8]]);
  });

  it("merges notes at the same x into one chord column", () => {
    const r = sanitizeTab({
      notes: [
        { string: 0, fret: 3, x: 0 },
        { string: 1, fret: 3, x: 2 },
        { string: 0, fret: 5, x: 200 },
      ],
    });
    expect(r.tab[0].notes).toHaveLength(2);
    expect(r.tab).toHaveLength(2);
  });

  it("drops out-of-range strings/frets and invalid articulations", () => {
    const r = sanitizeTab({
      notes: [
        { string: 9, fret: 3, x: 0 },
        { string: 2, fret: 99, x: 10 },
        { string: 2, fret: 4, artic: "z", x: 20 },
      ],
    });
    expect(r.tab.flatMap((c) => c.notes)).toEqual([{ string: 2, fret: 4 }]);
  });

  it("falls back to standard tuning and empty tab on garbage", () => {
    expect(sanitizeTab(null)).toEqual({ tuning: ["E", "A", "D", "G", "B", "e"], tab: [{ notes: [] }] });
    expect(sanitizeTab({ tuning: ["x"], notes: "nope" }).tuning).toEqual(["E", "A", "D", "G", "B", "e"]);
  });
});
