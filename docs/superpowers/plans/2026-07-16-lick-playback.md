# Lick Playback (Synthesized Sound) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Play a lick's TAB as sound in the browser via Web Audio Karplus-Strong synthesis — play/stop + BPM control in `TabView`, with a moving column highlight (playhead) in `TabStaff`.

**Architecture:** Pure logic (pitch mapping, note-event scheduling) lives in `src/lib` and is unit-tested; Web Audio side effects are isolated in `src/lib/audio/player.ts`; a `PlayButton` client component drives playback and reports the active column up to `TabView`, which passes it to `TabStaff` for the playhead highlight.

**Tech Stack:** Next.js (App Router), React 19, TypeScript, Web Audio API (no new dependencies), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-16-lick-playback-design.md`

## Global Constraints

- No new npm dependencies. Sound is synthesized client-side (Karplus-Strong), no audio files.
- Each TAB column plays as one eighth note: `columnDuration = 30 / bpm` seconds. BPM range 40–200, default 90.
- Whiskey columns (`col.whiskey`) are rests: they occupy time, produce no sound.
- Articulations: `b` → bend to +2 semitones, `b½` → +1, `/` → glide in from −2, `\` → glide in from +2, `~` → vibrato (5.5 Hz, ±35 cents), `h`/`p` → plain note.
- i18n: every user-facing string goes through `dictionaries.ts` with both `en` and `ko` entries (same shape).
- All tests via `npm test` (Vitest); UI test style follows `src/components/TabEditor.test.tsx`. `useI18n` falls back to English without a provider — component tests need no i18n wrapper.
- Repo commit style: conventional commits (`feat(...):`, `test(...):`), each ending with the trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Pitch mapping (`pitch.ts`)

**Files:**
- Create: `src/lib/tab/pitch.ts`
- Test: `src/lib/tab/pitch.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces: `tuningToMidi(tuning: string[]): number[]` and `midiToFreq(midi: number): number` — used by Task 2.

- [ ] **Step 1: Write the failing test**

Create `src/lib/tab/pitch.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/tab/pitch.test.ts`
Expected: FAIL — cannot resolve `./pitch`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/tab/pitch.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/tab/pitch.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tab/pitch.ts src/lib/tab/pitch.test.ts
git commit -m "feat(audio): map tuning + fret to MIDI/frequency

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Schedule builder (`schedule.ts`)

**Files:**
- Create: `src/lib/audio/schedule.ts`
- Test: `src/lib/audio/schedule.test.ts`

**Interfaces:**
- Consumes: `tuningToMidi`, `midiToFreq` from `@/lib/tab/pitch` (Task 1); `Column`, `Articulation` from `@/lib/tab/types`.
- Produces (used by Tasks 3–4):

```ts
export interface PitchPoint { at: number; semitones: number }   // at: 0..1 of the column
export interface NoteEvent {
  startTime: number;   // seconds from playback start
  freq: number;        // base (fret) frequency in Hz
  pitch: PitchPoint[]; // piecewise-linear pitch envelope
  vibrato: boolean;
}
export interface Schedule {
  events: NoteEvent[];
  columnDuration: number; // seconds per column
  totalDuration: number;  // tab.length * columnDuration
}
export function buildSchedule(tab: Column[], tuning: string[], bpm: number): Schedule;
```

- [ ] **Step 1: Write the failing test**

Create `src/lib/audio/schedule.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/audio/schedule.test.ts`
Expected: FAIL — cannot resolve `./schedule`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/audio/schedule.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/audio/schedule.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/audio/schedule.ts src/lib/audio/schedule.test.ts
git commit -m "feat(audio): build note-event schedule from TAB columns

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Web Audio player (`player.ts`)

**Files:**
- Create: `src/lib/audio/player.ts`

**Interfaces:**
- Consumes: `Schedule`, `NoteEvent` from `./schedule` (Task 2).
- Produces (used by Task 4):

```ts
export interface PlaybackHandle {
  stop(): void;
  startTime: number;       // AudioContext time at playback start
  columnDuration: number;
  totalDuration: number;
  currentTime(): number;   // live AudioContext clock, for the playhead loop
}
export function isAudioSupported(): boolean;
export function playLick(schedule: Schedule): PlaybackHandle;
```

No unit test: jsdom has no `AudioContext` (this module is verified by typecheck here and manually in the browser in Task 6).

- [ ] **Step 1: Write the implementation**

Create `src/lib/audio/player.ts`:

```ts
import type { NoteEvent, Schedule } from "./schedule";

export interface PlaybackHandle {
  stop(): void;
  startTime: number;
  columnDuration: number;
  totalDuration: number;
  currentTime(): number;
}

const PLUCK_SECONDS = 1.5; // notes ring out; Karplus-Strong decays on its own
const DAMPING = 0.996;
const MASTER_GAIN = 0.4;
const START_DELAY = 0.05;
const VIBRATO_HZ = 5.5;
const VIBRATO_SEMITONES = 0.35;

let ctx: AudioContext | null = null;

export function isAudioSupported(): boolean {
  return typeof window !== "undefined" && typeof window.AudioContext === "function";
}

function getContext(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function rateFor(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

// Karplus-Strong pluck: a noise burst fed through an averaging delay line.
const pluckCache = new Map<number, AudioBuffer>();
function pluckBuffer(ac: AudioContext, freq: number): AudioBuffer {
  const key = Math.round(freq * 10);
  const cached = pluckCache.get(key);
  if (cached) return cached;
  const sr = ac.sampleRate;
  const length = Math.floor(sr * PLUCK_SECONDS);
  const buf = ac.createBuffer(1, length, sr);
  const data = buf.getChannelData(0);
  const period = Math.max(2, Math.round(sr / freq));
  for (let i = 0; i < period; i++) data[i] = Math.random() * 2 - 1;
  for (let i = period; i < length; i++) {
    data[i] = DAMPING * 0.5 * (data[i - period] + data[i - period + 1]);
  }
  pluckCache.set(key, buf);
  return buf;
}

function scheduleNote(
  ac: AudioContext,
  dest: AudioNode,
  ev: NoteEvent,
  t0: number,
  columnDuration: number,
): void {
  const src = ac.createBufferSource();
  src.buffer = pluckBuffer(ac, ev.freq);
  const start = t0 + ev.startTime;
  // Pitch envelope (bends/slides) as playbackRate ramps over the column
  src.playbackRate.setValueAtTime(rateFor(ev.pitch[0]?.semitones ?? 0), start);
  for (const p of ev.pitch.slice(1)) {
    src.playbackRate.linearRampToValueAtTime(
      rateFor(p.semitones),
      start + p.at * columnDuration,
    );
  }
  if (ev.vibrato) {
    const lfo = ac.createOscillator();
    lfo.frequency.value = VIBRATO_HZ;
    const depth = ac.createGain();
    depth.gain.value = rateFor(VIBRATO_SEMITONES) - 1;
    lfo.connect(depth);
    depth.connect(src.playbackRate);
    lfo.start(start);
    lfo.stop(start + PLUCK_SECONDS);
  }
  src.connect(dest);
  src.start(start);
}

export function playLick(schedule: Schedule): PlaybackHandle {
  const ac = getContext();
  const master = ac.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(ac.destination);
  const startTime = ac.currentTime + START_DELAY;
  for (const ev of schedule.events) {
    scheduleNote(ac, master, ev, startTime, schedule.columnDuration);
  }
  return {
    startTime,
    columnDuration: schedule.columnDuration,
    totalDuration: schedule.totalDuration,
    currentTime: () => ac.currentTime,
    stop() {
      master.disconnect();
    },
  };
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit 0 (no new errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/audio/player.ts
git commit -m "feat(audio): Karplus-Strong Web Audio player

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: i18n keys + `PlayButton` component

**Files:**
- Modify: `src/lib/i18n/dictionaries.ts` (en block near `copyAria` ~line 140; ko block near `copyAria` ~line 297)
- Create: `src/components/PlayButton.tsx`
- Test: `src/components/PlayButton.test.tsx`

**Interfaces:**
- Consumes: `buildSchedule` (Task 2), `isAudioSupported` / `playLick` / `PlaybackHandle` (Task 3), `useI18n`.
- Produces (used by Task 5): `<PlayButton tab={Column[]} tuning={string[]} onActiveColumn={(col: number | null) => void} />`. Renders `null` when Web Audio is unavailable (also true during SSR/hydration, avoiding mismatch).

- [ ] **Step 1: Add dictionary keys**

In `src/lib/i18n/dictionaries.ts`, add to the `en` object directly after the `copyAria: "Copy TAB as ASCII",` line:

```ts
  play: "Play",
  stop: "Stop",
  playAria: "Play lick",
  stopAria: "Stop playback",
  bpmAria: "Tempo (BPM)",
```

And to the `ko` object directly after the `copyAria: "TAB을 ASCII로 복사",` line:

```ts
  play: "재생",
  stop: "정지",
  playAria: "Lick 재생",
  stopAria: "재생 정지",
  bpmAria: "템포 (BPM)",
```

- [ ] **Step 2: Write the failing test**

Create `src/components/PlayButton.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlayButton } from "./PlayButton";
import { STANDARD_TUNING, type Column } from "@/lib/tab/types";

const { stopMock, playMock } = vi.hoisted(() => ({
  stopMock: vi.fn(),
  playMock: vi.fn(),
}));

vi.mock("@/lib/audio/player", () => ({
  isAudioSupported: () => true,
  playLick: playMock,
}));

const TAB: Column[] = [{ notes: [{ string: 0, fret: 3 }] }];

describe("PlayButton", () => {
  beforeEach(() => {
    stopMock.mockClear();
    playMock.mockReset();
    playMock.mockReturnValue({
      stop: stopMock,
      startTime: 0,
      columnDuration: 1 / 3,
      totalDuration: 1 / 3,
      currentTime: () => 0,
    });
  });

  it("toggles to stop while playing, and stops on second click", async () => {
    const user = userEvent.setup();
    render(<PlayButton tab={TAB} tuning={STANDARD_TUNING} />);
    await user.click(await screen.findByRole("button", { name: "Play lick" }));
    expect(playMock).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Stop playback" }));
    expect(stopMock).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Play lick" })).toBeInTheDocument();
  });

  it("reports the active column while playing", async () => {
    const user = userEvent.setup();
    const onActive = vi.fn();
    render(<PlayButton tab={TAB} tuning={STANDARD_TUNING} onActiveColumn={onActive} />);
    await user.click(await screen.findByRole("button", { name: "Play lick" }));
    await vi.waitFor(() => expect(onActive).toHaveBeenCalledWith(0));
  });

  it("is disabled when the tab has no sounding notes", async () => {
    render(
      <PlayButton tab={[{ notes: [] }, { notes: [], whiskey: true }]} tuning={STANDARD_TUNING} />,
    );
    expect(await screen.findByRole("button", { name: "Play lick" })).toBeDisabled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/PlayButton.test.tsx`
Expected: FAIL — cannot resolve `./PlayButton`.

- [ ] **Step 4: Write the implementation**

Create `src/components/PlayButton.tsx`:

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { buildSchedule } from "@/lib/audio/schedule";
import { isAudioSupported, playLick, type PlaybackHandle } from "@/lib/audio/player";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Column } from "@/lib/tab/types";

const MIN_BPM = 40;
const MAX_BPM = 200;
const DEFAULT_BPM = 90;

interface Props {
  tab: Column[];
  tuning: string[];
  onActiveColumn?: (col: number | null) => void;
}

/** Play/stop toggle + BPM control. Renders nothing when Web Audio is unavailable. */
export function PlayButton({ tab, tuning, onActiveColumn }: Props) {
  const { t } = useI18n();
  const [supported, setSupported] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const handleRef = useRef<PlaybackHandle | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    setSupported(isAudioSupported());
  }, []);

  const stopPlayback = () => {
    handleRef.current?.stop();
    handleRef.current = null;
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);
    onActiveColumn?.(null);
  };
  const stopRef = useRef(stopPlayback);
  stopRef.current = stopPlayback;
  useEffect(() => () => stopRef.current(), []);

  const start = () => {
    const schedule = buildSchedule(tab, tuning, bpm);
    if (schedule.events.length === 0) return;
    handleRef.current = playLick(schedule);
    setPlaying(true);
    const tick = () => {
      const h = handleRef.current;
      if (!h) return;
      const elapsed = h.currentTime() - h.startTime;
      if (elapsed >= h.totalDuration) {
        stopRef.current();
        return;
      }
      onActiveColumn?.(elapsed < 0 ? null : Math.floor(elapsed / h.columnDuration));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  if (!supported) return null;
  const hasNotes = tab.some((c) => !c.whiskey && c.notes.length > 0);

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1 text-xs text-ink-soft">
        <input
          type="range"
          min={MIN_BPM}
          max={MAX_BPM}
          step={5}
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          aria-label={t.bpmAria}
          className="h-1 w-16 accent-[var(--color-accent)]"
        />
        <span className="w-8 text-right tabular-nums">{bpm}</span>
      </label>
      <button
        type="button"
        disabled={!hasNotes}
        aria-label={playing ? t.stopAria : t.playAria}
        onClick={playing ? stopPlayback : start}
        className="rounded-md border border-rule bg-paper-raised px-2.5 py-1 text-xs text-ink-soft shadow-sm transition-colors hover:border-ink-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        {playing ? `■ ${t.stop}` : `▶ ${t.play}`}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/PlayButton.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/i18n/dictionaries.ts src/components/PlayButton.tsx src/components/PlayButton.test.tsx
git commit -m "feat(ui): play/stop button with BPM control

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Playhead in `TabStaff` + wiring in `TabView`

**Files:**
- Modify: `src/components/TabStaff.tsx` (Props interface ~line 9; SVG body ~line 185)
- Modify: `src/components/TabView.tsx` (whole component)
- Test: `src/components/TabStaff.test.tsx`

**Interfaces:**
- Consumes: `PlayButton` (Task 4).
- Produces: `TabStaff` gains optional prop `activeColumn?: number | null`; no behavior change when absent (existing call sites: `TabView`, `LickCard`, `opengraph-image` are unaffected).

- [ ] **Step 1: Write the failing test**

Create `src/components/TabStaff.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TabStaff } from "./TabStaff";
import { STANDARD_TUNING, type Column } from "@/lib/tab/types";

const TAB: Column[] = [{ notes: [{ string: 0, fret: 3 }] }, { notes: [] }];

describe("TabStaff playhead", () => {
  it("renders no highlight without activeColumn", () => {
    const { container } = render(<TabStaff tab={TAB} tuning={STANDARD_TUNING} />);
    expect(container.querySelector("svg rect")).toBeNull();
  });

  it("highlights the active column at its x position", () => {
    const { container } = render(
      <TabStaff tab={TAB} tuning={STANDARD_TUNING} activeColumn={1} />,
    );
    const rect = container.querySelector("svg rect");
    expect(rect).not.toBeNull();
    expect(rect!.getAttribute("x")).toBe("46"); // column 1 × COL_W (46)
    expect(rect!.getAttribute("width")).toBe("46");
  });

  it("ignores an out-of-range activeColumn", () => {
    const { container } = render(
      <TabStaff tab={TAB} tuning={STANDARD_TUNING} activeColumn={5} />,
    );
    expect(container.querySelector("svg rect")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/TabStaff.test.tsx`
Expected: FAIL — the highlight tests fail (`svg rect` is null; `activeColumn` prop does not exist yet).

- [ ] **Step 3: Add the playhead to `TabStaff`**

In `src/components/TabStaff.tsx`, add to the `Props` interface:

```ts
  /** Column to highlight during playback (playhead) */
  activeColumn?: number | null;
```

Update the component signature:

```ts
export function TabStaff({
  tab,
  tuning,
  surface = "bg-paper-raised",
  compact = false,
  activeColumn = null,
}: Props) {
```

Inside the `<svg>`, immediately BEFORE the `{/* String lines */}` block, add (draws under the string lines; fret chips are opaque HTML above the SVG, so the band shows around them):

```tsx
          {/* Playhead highlight */}
          {activeColumn != null && activeColumn >= 0 && activeColumn < cols.length && (
            <rect
              x={activeColumn * COL_W}
              y={HEAD - 4}
              width={COL_W}
              height={staffH + 8}
              rx={6}
              fill="var(--color-accent)"
              opacity={0.12}
            />
          )}
```

- [ ] **Step 4: Wire `PlayButton` and `activeColumn` in `TabView`**

Replace the body of `src/components/TabView.tsx` with:

```tsx
"use client";
import { useState } from "react";
import { toAscii } from "@/lib/tab/serialize";
import { TabStaff } from "./TabStaff";
import { PlayButton } from "./PlayButton";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Column } from "@/lib/tab/types";

export function TabView({ tab, tuning }: { tab: Column[]; tuning: string[] }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [activeColumn, setActiveColumn] = useState<number | null>(null);
  return (
    <div className="relative rounded-lg border border-rule bg-paper-raised p-1.5">
      <TabStaff tab={tab} tuning={tuning} surface="bg-paper-raised" activeColumn={activeColumn} />
      <div className="absolute right-3 top-3 z-30 flex items-center gap-2">
        <PlayButton tab={tab} tuning={tuning} onActiveColumn={setActiveColumn} />
        <button
          type="button"
          aria-label={t.copyAria}
          onClick={async () => {
            await navigator.clipboard.writeText(toAscii(tab, tuning));
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="rounded-md border border-rule bg-paper-raised px-2.5 py-1 text-xs text-ink-soft shadow-sm transition-colors hover:border-ink-soft hover:text-ink"
        >
          {copied ? t.copied : t.copy}
        </button>
      </div>
    </div>
  );
}
```

(The copy button loses its own `absolute right-3 top-3 z-30` classes — the shared wrapper `div` now carries the positioning.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/TabStaff.test.tsx && npx tsc --noEmit`
Expected: PASS (3 tests); typecheck exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/TabStaff.tsx src/components/TabStaff.test.tsx src/components/TabView.tsx
git commit -m "feat(ui): lick playback in TabView with playhead highlight

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Full verification + README

**Files:**
- Modify: `README.md` (Features list)

- [ ] **Step 1: Run the full suite**

Run: `npm test && npm run lint && npx tsc --noEmit`
Expected: all pass, no new warnings.

- [ ] **Step 2: Manual browser verification**

Run: `npm run dev`, open `http://localhost:3000`, then verify on a lick detail page and in the editor (`/licks/new`):

1. ▶ button + BPM slider appear at the top-right of the staff, next to Copy.
2. Play a lick with plain notes — hear plucked-string notes, evenly spaced; playhead band moves column by column and clears at the end.
3. A whiskey column produces a silent gap (playhead still passes through it).
4. A bend (`b`) audibly bends up; a slide (`/`) glides in; vibrato (`~`) wobbles.
5. Changing BPM changes speed on the next play.
6. Clicking ▶ again mid-playback stops the sound and clears the playhead.
7. Editor preview: the button plays the tab currently being edited.
8. Empty tab (`/licks/new` before entering notes): button is disabled.

- [ ] **Step 3: Add README feature bullet**

In `README.md`, add to the Features list after the "Graphic TAB editor" bullet:

```markdown
- **Playback** — hear any lick right in the browser: Karplus‑Strong plucked‑string synthesis (Web Audio, no samples), adjustable tempo, bends/slides/vibrato rendered as pitch effects, with a moving playhead on the staff.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(readme): document lick playback feature

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
