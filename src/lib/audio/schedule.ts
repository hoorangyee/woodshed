import type { Articulation, Column } from "@/lib/tab/types";
import { midiToFreq, tuningToMidi } from "@/lib/tab/pitch";

export interface PitchPoint {
  /** Position within the column, 0..1 */
  at: number;
  /** Offset from the fret pitch */
  semitones: number;
}

export interface NoteEvent {
  /** Seconds from playback start */
  startTime: number;
  /** Base (fret) frequency in Hz */
  freq: number;
  /** Piecewise-linear pitch envelope */
  pitch: PitchPoint[];
  vibrato: boolean;
}

export interface Schedule {
  events: NoteEvent[];
  columnDuration: number;
  totalDuration: number;
}

const FLAT: PitchPoint[] = [
  { at: 0, semitones: 0 },
  { at: 1, semitones: 0 },
];

function bend(target: number): PitchPoint[] {
  return [
    { at: 0, semitones: 0 },
    { at: 0.25, semitones: 0 },
    { at: 0.6, semitones: target },
    { at: 1, semitones: target },
  ];
}

function glideFrom(offset: number): PitchPoint[] {
  return [
    { at: 0, semitones: offset },
    { at: 0.4, semitones: 0 },
    { at: 1, semitones: 0 },
  ];
}

function envelopeFor(artic?: Articulation): { pitch: PitchPoint[]; vibrato: boolean } {
  switch (artic) {
    case "b":
      return { pitch: bend(2), vibrato: false };
    case "b½":
      return { pitch: bend(1), vibrato: false };
    case "/":
      return { pitch: glideFrom(-2), vibrato: false };
    case "\\":
      return { pitch: glideFrom(2), vibrato: false };
    case "~":
      return { pitch: FLAT, vibrato: true };
    default:
      // h/p play as plain notes in v1
      return { pitch: FLAT, vibrato: false };
  }
}

/** Each column is one eighth note; whiskey columns 🥃 are rests. */
export function buildSchedule(tab: Column[], tuning: string[], bpm: number): Schedule {
  const columnDuration = 30 / bpm;
  const midis = tuningToMidi(tuning);
  const events: NoteEvent[] = [];
  tab.forEach((col, c) => {
    if (col.whiskey) return;
    for (const note of col.notes) {
      const { pitch, vibrato } = envelopeFor(note.artic);
      events.push({
        startTime: c * columnDuration,
        freq: midiToFreq(midis[note.string] + note.fret),
        pitch,
        vibrato,
      });
    }
  });
  return { events, columnDuration, totalDuration: tab.length * columnDuration };
}
