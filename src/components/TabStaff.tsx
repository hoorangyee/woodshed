import { STRING_COUNT, type Column, type Articulation } from "@/lib/tab/types";

const SLIDES = new Set<Articulation>(["/", "\\"]);
const BENDS = new Set<Articulation>(["b", "b½"]);

// Top-to-bottom display order (high e=5 on top)
const ROWS = Array.from({ length: STRING_COUNT }, (_, i) => STRING_COUNT - 1 - i);

interface Props {
  tab: Column[];
  tuning: string[];
  /** Container/chip background (must match so the staff line hides behind chips) */
  surface?: string;
  compact?: boolean;
}

/** Polygon points for an upward arrowhead */
function upArrowhead(x: number, yTip: number, size: number): string {
  return `${x},${yTip} ${x - size},${yTip + size * 1.5} ${x + size},${yTip + size * 1.5}`;
}

/** Wavy-line (vibrato) path above a note */
function wavyPath(cx: number, y: number, width: number, amp: number, wl: number): string {
  const startX = cx - width / 2;
  const segs = Math.max(2, Math.round(width / wl));
  const step = width / segs;
  let d = `M ${startX} ${y}`;
  for (let i = 0; i < segs; i++) {
    const cpx = startX + step * (i + 0.5);
    const x2 = startX + step * (i + 1);
    const dir = i % 2 === 0 ? -1 : 1;
    d += ` Q ${cpx} ${y + dir * amp} ${x2} ${y}`;
  }
  return d;
}

/**
 * Renders TAB as a graphic staff. Fret chips sit on six string lines;
 * slides are diagonals, bends are curved arrows (full / ½), vibrato is a wavy line,
 * and hammer-ons/pull-offs are slur arcs (H / P) connecting the two notes.
 */
export function TabStaff({ tab, tuning, surface = "bg-paper-raised", compact = false }: Props) {
  const cols = tab.length > 0 ? tab : [{ notes: [] }];

  // Coordinate-system constants
  const ROW_H = compact ? 22 : 34;
  const COL_W = compact ? 30 : 46;
  const PAD = compact ? 8 : 16;
  const HEAD = compact ? 14 : 22; // Headroom above notes (for bends/vibrato)
  const staffH = STRING_COUNT * ROW_H;
  const totalH = HEAD + staffH;
  const staffW = cols.length * COL_W;
  // Extra room on the right so the last note's bend arrow + "full"/"½" label isn't clipped.
  const RIGHT = compact ? 14 : 28;
  const bodyW = staffW + RIGHT;

  const rowIndex = (s: number) => STRING_COUNT - 1 - s;
  const y = (s: number) => HEAD + rowIndex(s) * ROW_H + ROW_H / 2;
  const x = (c: number) => c * COL_W + COL_W / 2;

  // Compute slide diagonals
  const slides: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const inset = compact ? 7 : 11;
  const slant = compact ? 4 : 6;
  cols.forEach((col, c) => {
    for (const note of col.notes) {
      if (!note.artic || !SLIDES.has(note.artic)) continue;
      const nextCol = cols[c + 1];
      const target =
        nextCol?.notes.find((n) => n.string === note.string) ??
        (nextCol?.notes.length === 1 ? nextCol.notes[0] : undefined);
      if (target) {
        let y1 = y(note.string);
        let y2 = y(target.string);
        if (y1 === y2) {
          const up = note.artic === "/";
          y1 += up ? slant : -slant;
          y2 += up ? -slant : slant;
        }
        slides.push({ x1: x(c) + inset, y1, x2: x(c + 1) - inset, y2 });
      } else {
        const up = note.artic === "/";
        const yc = y(note.string);
        slides.push({
          x1: x(c) + inset,
          y1: yc + (up ? slant : -slant),
          x2: x(c) + inset + COL_W * 0.4,
          y2: yc + (up ? -slant : slant),
        });
      }
    }
  });

  // Bend curved arrows + vibrato wavy lines
  type Bend = { path: string; head: string; label: string; lx: number; ly: number };
  const bends: Bend[] = [];
  const vibratos: string[] = [];
  const bendUp = compact ? 14 : 22;
  const ah = compact ? 2.5 : 3.5;
  cols.forEach((col, c) => {
    for (const note of col.notes) {
      if (!note.artic) continue;
      if (BENDS.has(note.artic)) {
        const bx0 = x(c) + (compact ? 7 : 10);
        const by0 = y(note.string) - (compact ? 2 : 3);
        const bx1 = bx0 + (compact ? 7 : 10);
        const by1 = y(note.string) - bendUp;
        bends.push({
          path: `M ${bx0} ${by0} Q ${bx1} ${by0} ${bx1} ${by1}`,
          head: upArrowhead(bx1, by1, ah),
          label: note.artic === "b½" ? "½" : "full",
          lx: bx1 + (compact ? 4 : 5),
          ly: by1 + (compact ? 4 : 5),
        });
      } else if (note.artic === "~") {
        vibratos.push(
          wavyPath(
            x(c),
            y(note.string) - (compact ? 11 : 16),
            compact ? 16 : 24,
            compact ? 2.5 : 3.5,
            compact ? 6 : 8,
          ),
        );
      }
    }
  });

  // Hammer-on (H) / pull-off (P): a slur arc above the staff connecting the two notes
  type Slur = { path: string; label: string; lx: number; ly: number };
  const slurs: Slur[] = [];
  const arcUp = compact ? 9 : 13;
  const slurLift = compact ? 5 : 7;
  cols.forEach((col, c) => {
    for (const note of col.notes) {
      if (note.artic !== "h" && note.artic !== "p") continue;
      const nextCol = cols[c + 1];
      const target =
        nextCol?.notes.find((n) => n.string === note.string) ??
        (nextCol?.notes.length === 1 ? nextCol.notes[0] : undefined);
      const x1 = x(c) + inset;
      const x2 = target ? x(c + 1) - inset : x1 + COL_W * 0.5;
      const y1 = y(note.string) - slurLift;
      const y2 = (target ? y(target.string) : y(note.string)) - slurLift;
      const apex = Math.min(y1, y2) - arcUp;
      const midX = (x1 + x2) / 2;
      slurs.push({
        path: `M ${x1} ${y1} Q ${midX} ${apex} ${x2} ${y2}`,
        label: note.artic === "h" ? "H" : "P",
        lx: midX,
        ly: apex - (compact ? 1 : 2),
      });
    }
  });

  const chipText = compact ? "text-[11px]" : "text-sm";
  const labelText = compact ? "text-[10px]" : "text-xs";
  const bendLabelSize = compact ? 7 : 9;

  return (
    <div className={`flex overflow-x-auto rounded-lg ${surface}`} style={{ padding: PAD }}>
      {/* String labels */}
      {!compact && (
        <div className="mr-1 flex flex-col" style={{ height: staffH, marginTop: HEAD }}>
          {ROWS.map((s) => (
            <div
              key={s}
              className={`flex items-center justify-end pr-1 font-mono ${labelText} font-medium text-ink-soft`}
              style={{ height: ROW_H }}
            >
              {tuning[s]}
            </div>
          ))}
        </div>
      )}

      {/* Staff body */}
      <div className="relative" style={{ width: bodyW, height: totalH }}>
        <svg
          className="absolute inset-0"
          width={bodyW}
          height={totalH}
          aria-hidden="true"
          style={{ overflow: "visible" }}
        >
          {/* String lines */}
          {ROWS.map((s) => (
            <line
              key={s}
              x1={0}
              x2={bodyW}
              y1={y(s)}
              y2={y(s)}
              stroke="var(--color-rule)"
              strokeWidth={1}
            />
          ))}
          {/* Slide diagonals */}
          {slides.map((l, i) => (
            <line
              key={`s${i}`}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke="var(--color-accent)"
              strokeWidth={compact ? 1.25 : 1.75}
              strokeLinecap="round"
            />
          ))}
          {/* Vibrato wavy lines */}
          {vibratos.map((d, i) => (
            <path
              key={`v${i}`}
              d={d}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={compact ? 1.25 : 1.5}
              strokeLinecap="round"
            />
          ))}
          {/* Hammer-on / pull-off slurs */}
          {slurs.map((sl, i) => (
            <g key={`h${i}`}>
              <path
                d={sl.path}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={compact ? 1.25 : 1.5}
                strokeLinecap="round"
              />
              <text
                x={sl.lx}
                y={sl.ly}
                fontSize={compact ? 7 : 10}
                fontStyle="italic"
                textAnchor="middle"
                fill="var(--color-accent)"
              >
                {sl.label}
              </text>
            </g>
          ))}
          {/* Bend curved arrows */}
          {bends.map((b, i) => (
            <g key={`b${i}`}>
              <path
                d={b.path}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={compact ? 1.25 : 1.5}
                strokeLinecap="round"
              />
              <polygon points={b.head} fill="var(--color-accent)" />
              <text
                x={b.lx}
                y={b.ly}
                fontSize={bendLabelSize}
                fontStyle="italic"
                fill="var(--color-accent)"
              >
                {b.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Fret chips */}
        {cols.map((col, c) =>
          col.notes.map((note) => (
            <span
              key={`${c}-${note.string}`}
              className={`absolute z-10 inline-flex -translate-x-1/2 -translate-y-1/2 items-center rounded-md px-1 font-medium tabular-nums text-ink ${surface} ${chipText}`}
              style={{ left: x(c), top: y(note.string) }}
            >
              {note.fret}
            </span>
          )),
        )}

        {/* Whiskey breaks 🥃 — a sip between notes */}
        {cols.map((col, c) =>
          col.whiskey ? (
            <span
              key={`w${c}`}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 leading-none"
              style={{ left: x(c), top: HEAD + staffH / 2, fontSize: compact ? 15 : 22 }}
            >
              🥃
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}
