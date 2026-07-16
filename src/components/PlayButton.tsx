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
    // Mount-only client check: keeps SSR/first-hydration render at `false` (renders
    // null) so it matches the server, then reveals the button once on the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(isAudioSupported());
  }, []);

  const stopPlayback = () => {
    handleRef.current?.stop();
    handleRef.current = null;
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);
    onActiveColumn?.(null);
  };
  // Latest-ref: keeps the unmount cleanup below calling the current closure
  // (with up-to-date onActiveColumn/tab/tuning) instead of a stale one from mount.
  const stopRef = useRef(stopPlayback);
  // eslint-disable-next-line react-hooks/refs
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
