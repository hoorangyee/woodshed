import { describe, it, expect } from "vitest";
import { buildSchedule } from "./schedule";
import { STANDARD_TUNING, type Column } from "@/lib/tab/types";

describe("buildSchedule", () => {
  it("spaces columns as eighth notes at the given BPM", () => {
    const tab: Column[] = [
      { notes: [{ string: 0, fret: 0 }] },
      { notes: [{ string: 0, fret: 2 }] },
    ];
    const s = buildSchedule(tab, STANDARD_TUNING, 120);
    expect(s.columnDuration).toBeCloseTo(0.25);
    expect(s.events.map((e) => e.startTime)).toEqual([0, 0.25]);
    expect(s.totalDuration).toBeCloseTo(0.5);
  });

  it("whiskey columns produce no events but occupy time", () => {
    const tab: Column[] = [
      { notes: [{ string: 0, fret: 0 }] },
      { notes: [], whiskey: true },
      { notes: [{ string: 0, fret: 3 }] },
    ];
    const s = buildSchedule(tab, STANDARD_TUNING, 60);
    expect(s.events).toHaveLength(2);
    expect(s.events[1].startTime).toBeCloseTo(1.0); // column 2 at 2 × 0.5s
    expect(s.totalDuration).toBeCloseTo(1.5);
  });

  it("computes fret pitch from the tuning", () => {
    // high e (string 5, E4) + fret 5 = A4 = 440 Hz
    const tab: Column[] = [{ notes: [{ string: 5, fret: 5 }] }];
    const s = buildSchedule(tab, STANDARD_TUNING, 90);
    expect(s.events[0].freq).toBeCloseTo(440);
  });

  it("full bend holds, then ramps to +2 semitones", () => {
    const tab: Column[] = [{ notes: [{ string: 2, fret: 7, artic: "b" }] }];
    const s = buildSchedule(tab, STANDARD_TUNING, 90);
    expect(s.events[0].pitch).toEqual([
      { at: 0, semitones: 0 },
      { at: 0.25, semitones: 0 },
      { at: 0.6, semitones: 2 },
      { at: 1, semitones: 2 },
    ]);
    expect(s.events[0].vibrato).toBe(false);
  });

  it("half bend targets +1 semitone", () => {
    const tab: Column[] = [{ notes: [{ string: 2, fret: 7, artic: "b½" }] }];
    const s = buildSchedule(tab, STANDARD_TUNING, 90);
    expect(s.events[0].pitch[2]).toEqual({ at: 0.6, semitones: 1 });
  });

  it("slide up glides in from below; slide down from above", () => {
    const up: Column[] = [{ notes: [{ string: 2, fret: 7, artic: "/" }] }];
    const down: Column[] = [{ notes: [{ string: 2, fret: 7, artic: "\\" }] }];
    expect(buildSchedule(up, STANDARD_TUNING, 90).events[0].pitch[0]).toEqual({
      at: 0,
      semitones: -2,
    });
    expect(buildSchedule(down, STANDARD_TUNING, 90).events[0].pitch[0]).toEqual({
      at: 0,
      semitones: 2,
    });
  });

  it("vibrato sets the flag with a flat envelope", () => {
    const tab: Column[] = [{ notes: [{ string: 2, fret: 7, artic: "~" }] }];
    const e = buildSchedule(tab, STANDARD_TUNING, 90).events[0];
    expect(e.vibrato).toBe(true);
    expect(e.pitch).toEqual([
      { at: 0, semitones: 0 },
      { at: 1, semitones: 0 },
    ]);
  });
});
