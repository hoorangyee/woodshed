# Lick Playback (Synthesized Sound) — Design

**Date:** 2026-07-16
**Status:** Approved pending user review

## Goal

Play a lick's TAB as sound directly in the browser — no audio files, no external
libraries. Synthesis happens client-side with the Web Audio API using
Karplus-Strong plucked-string synthesis. A play/stop button with a BPM control
lives in `TabView`, so playback works on both the lick detail page and the
editor's live preview. While playing, the current column is highlighted in the
staff (playhead).

## Decisions (user-confirmed)

| Decision | Choice |
| --- | --- |
| Button placement | Integrated into `TabView` (detail page + editor preview) |
| Tempo | Adjustable BPM control, 40–200, default 90 |
| Articulations | Rendered as pitch effects (bends, slides, vibrato) |
| Sound engine | Karplus-Strong synthesis into `AudioBuffer` (zero dependencies) |
| Playhead | Included in v1 — active column highlighted in `TabStaff` |

## Architecture

Pure logic is separated from Web Audio side effects so the interesting parts
are unit-testable:

```
Column[] + tuning + bpm
   │
   ▼
src/lib/tab/pitch.ts       pure: tuning/string/fret → MIDI → frequency
src/lib/audio/schedule.ts  pure: buildSchedule() → NoteEvent[]
   │
   ▼
src/lib/audio/player.ts    Web Audio: Karplus-Strong synth + schedule executor
   │
   ▼
src/components/PlayButton.tsx  UI (play/stop toggle + BPM control + rAF playhead loop)
   │
   ▼
src/components/TabView.tsx     hosts PlayButton, passes activeColumn to TabStaff
src/components/TabStaff.tsx    renders playhead highlight for activeColumn
```

### `src/lib/tab/pitch.ts` (pure)

- `tuningToMidi(tuning: string[]): number[]` — tunings are stored as note names
  without octaves (e.g. `["E","A","D","G","B","e"]`). Octaves are assigned by
  convention: string 0 (lowest) is anchored in octave 2 (MIDI 36–47); each
  subsequent string gets the lowest MIDI note of its pitch class that is ≥ the
  previous string's note. This yields E2 A2 D3 G3 B3 E4 for Standard and
  D2 A2 D3 G3 B3 E4 for Drop D without any per-tuning tables.
- `midiToFreq(midi: number): number` — A4 = 440 Hz, `440 * 2^((m-69)/12)`.
- Note pitch = open-string MIDI + fret.

### `src/lib/audio/schedule.ts` (pure)

- `buildSchedule(tab: Column[], tuning: string[], bpm: number): Schedule`
- Each column is one eighth note: `columnDuration = 30 / bpm` seconds.
- Whiskey columns (🥃) are rests — they occupy time, produce no events.
- Each note becomes a `NoteEvent`:
  ```ts
  interface PitchPoint { at: number; semitones: number }  // at: 0..1 fraction of note
  interface NoteEvent {
    startTime: number;      // seconds from playback start
    freq: number;           // base frequency (fret pitch)
    pitch: PitchPoint[];    // piecewise-linear pitch envelope, semitone offsets
    vibrato: boolean;
  }
  ```
- Articulation → pitch envelope mapping:

  | TAB | Sound |
  | --- | --- |
  | `b` (full bend) | hold base for 25% of the note, ramp to +2 semitones by 60%, hold |
  | `b½` (half bend) | same shape, target +1 semitone |
  | `/` (slide up) | start at −2 semitones, reach base pitch at 40% of the note |
  | `\` (slide down) | start at +2 semitones, reach base pitch at 40% of the note |
  | `~` (vibrato) | `vibrato: true` → 5.5 Hz LFO, ±35 cents |
  | `h` / `p` | v1: plain note (correct pitch, no special transition) |

- `Schedule` also carries `columnDuration` and `totalDuration` so the UI can
  drive the playhead and reset the button when playback ends.

### `src/lib/audio/player.ts` (Web Audio side effects)

- Lazy `AudioContext` singleton, created on first play click (satisfies
  browser autoplay policies).
- **Karplus-Strong synthesis**: for each distinct base frequency, fill an
  `AudioBuffer` (~1.5 s) with a JS loop — delay line of
  `N = round(sampleRate / freq)` samples seeded with white noise, then
  `y[n] = damping * 0.5 * (y[n-N] + y[n-N-1])` with damping ≈ 0.996. Buffers
  are cached per rounded frequency.
- Each `NoteEvent` plays through an `AudioBufferSourceNode`; the pitch
  envelope is applied as `playbackRate` linear ramps
  (`rate = 2^(semitones/12)`), and vibrato connects an `OscillatorNode`
  (5.5 Hz) through a small `GainNode` into `playbackRate`.
- Notes ring out naturally (Karplus-Strong decays on its own); no gain cutoff
  at column boundaries.
- All sources route through a per-playback master `GainNode`.
  `play()` returns a handle:
  ```ts
  interface PlaybackHandle {
    stop(): void;              // disconnect master gain, stop sources
    startTime: number;         // ctx.currentTime at start
    columnDuration: number;
    totalDuration: number;
    currentTime(): number;     // ctx.currentTime (for the playhead loop)
  }
  ```

### `src/components/PlayButton.tsx` (client)

- Play/stop toggle button + compact BPM control (range 40–200, default 90),
  styled to match the existing Copy button chrome in `TabView`.
- Play → builds schedule, calls player, flips to stop icon; runs a
  `requestAnimationFrame` loop computing
  `activeColumn = floor((now - startTime) / columnDuration)` and reports it via
  an `onActiveColumn(col | null)` callback prop.
- Auto-reverts to play state when `totalDuration` elapses (last column's
  highlight clears; tails may still ring).
- BPM changes apply to the next playback (no live re-timing).
- Cleanup on unmount and on re-click: stop current playback, cancel rAF.

### `src/components/TabView.tsx` changes

- Hosts `PlayButton` next to the Copy button; holds `activeColumn` state and
  passes it to `TabStaff`.

### `src/components/TabStaff.tsx` changes

- New optional prop `activeColumn?: number | null`.
- When set, render a highlight `<rect>` in the SVG behind the string lines:
  `x = activeColumn * COL_W`, `width = COL_W`, full staff height,
  `fill="var(--color-accent)"` at low opacity, rounded corners.
- No behavior change when the prop is absent (all existing call sites).

## Error handling

- **No Web Audio / SSR**: `PlayButton` feature-detects `window.AudioContext`
  (after mount) and renders nothing if unavailable.
- **Empty tab** (no sounding notes): button disabled.
- **Unmount / navigation mid-playback**: effect cleanup stops playback.
- **Re-click while playing**: acts as stop.

## Testing

- `src/lib/tab/pitch.test.ts` — Standard and Drop D → expected MIDI numbers;
  `midiToFreq` spot checks (A4 = 440, E2 ≈ 82.41).
- `src/lib/audio/schedule.test.ts` — column timing vs BPM; whiskey rests skip
  events but occupy time; pitch envelopes per articulation; totalDuration.
- `player.ts` / `PlayButton` are Web Audio-bound (jsdom has no AudioContext) —
  verified manually in the browser.

## i18n

- New dictionary keys (en/ko): play button label/aria, stop label/aria, BPM
  control aria label.

## Out of scope (future work)

- Rhythm/duration data in the TAB model (columns stay uniform eighth notes).
- Hammer-on/pull-off legato transitions (currently plain notes).
- Live tempo change during playback.
- Auto-scrolling the staff container to follow the playhead on long licks.
