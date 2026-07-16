import { describe, it, expect } from "vitest";
import { tuningToMidi, midiToFreq } from "./pitch";

describe("tuningToMidi", () => {
  it("maps standard tuning to E2 A2 D3 G3 B3 E4", () => {
    expect(tuningToMidi(["E", "A", "D", "G", "B", "e"])).toEqual([40, 45, 50, 55, 59, 64]);
  });

  it("maps Drop D to D2 A2 D3 G3 B3 E4", () => {
    expect(tuningToMidi(["D", "A", "D", "G", "B", "e"])).toEqual([38, 45, 50, 55, 59, 64]);
  });
});

describe("midiToFreq", () => {
  it("A4 (69) is 440 Hz", () => {
    expect(midiToFreq(69)).toBe(440);
  });

  it("E2 (40) is ≈82.41 Hz", () => {
    expect(midiToFreq(40)).toBeCloseTo(82.41, 2);
  });
});
