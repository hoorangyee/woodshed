// Playback pitch mapping. Tunings are stored as note names without octaves
// (e.g. ["E","A","D","G","B","e"]); octaves are assigned by convention below.

const PITCH_CLASS: Record<string, number> = {
  C: 0, "C#": 1, DB: 1, D: 2, "D#": 3, EB: 3, E: 4, F: 5,
  "F#": 6, GB: 6, G: 7, "G#": 8, AB: 8, A: 9, "A#": 10, BB: 10, B: 11,
};

/**
 * String 0 (lowest) is anchored in octave 2 (MIDI 36–47); each later string
 * takes the lowest MIDI of its pitch class strictly above the previous
 * string. Standard → E2 A2 D3 G3 B3 E4, Drop D → D2 A2 D3 G3 B3 E4.
 * Unknown note names fall back to E so playback stays best-effort.
 */
export function tuningToMidi(tuning: string[]): number[] {
  const midis: number[] = [];
  let prev = 35; // one below C2, so the first string lands in 36..47
  for (const name of tuning) {
    const pc = PITCH_CLASS[name.trim().toUpperCase()] ?? 4;
    const midi = prev + 1 + (((pc - ((prev + 1) % 12)) + 12) % 12);
    midis.push(midi);
    prev = midi;
  }
  return midis;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
