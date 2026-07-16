import type { NoteEvent, Schedule } from "./schedule";

export interface PlaybackHandle {
  stop(): void;
  /** Lets tails ring, then disconnects. */
  release(): void;
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
  const limiter = ac.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  master.connect(limiter);
  limiter.connect(ac.destination);
  const teardown = () => {
    master.disconnect();
    limiter.disconnect();
  };
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
      const now = ac.currentTime;
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 0.03);
      window.setTimeout(teardown, 50);
    },
    release() {
      window.setTimeout(teardown, PLUCK_SECONDS * 1000);
    },
  };
}
