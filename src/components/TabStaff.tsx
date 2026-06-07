import { STRING_COUNT, type Column, type Articulation } from "@/lib/tab/types";

// 칩 위 작은 글자로 표기하는 주법(슬라이드=사선, 벤딩=곡선화살표, 비브라토=물결선은 별도)
const ARTIC_GLYPH: Partial<Record<Articulation, string>> = {
  h: "h",
  p: "p",
};

const SLIDES = new Set<Articulation>(["/", "\\"]);
const BENDS = new Set<Articulation>(["b", "b½"]);

// 위→아래 표시 순서 (고음 e=5 가 맨 위)
const ROWS = Array.from({ length: STRING_COUNT }, (_, i) => STRING_COUNT - 1 - i);

interface Props {
  tab: Column[];
  tuning: string[];
  /** 컨테이너/칩 배경(괘선을 칩 뒤로 가리기 위해 둘이 같아야 함) */
  surface?: string;
  compact?: boolean;
}

/** 위로 향하는 화살촉 폴리곤 좌표 */
function upArrowhead(x: number, yTip: number, size: number): string {
  return `${x},${yTip} ${x - size},${yTip + size * 1.5} ${x + size},${yTip + size * 1.5}`;
}

/** 음 위 물결선(비브라토) path */
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
 * TAB를 그래픽 보표로 렌더한다. 6개의 현 라인 위에 프렛 칩을 얹고,
 * 슬라이드는 음 사이 사선, 벤딩은 곡선 화살표(풀=full / 하프=½),
 * 비브라토는 음 위 물결선으로 표기한다.
 */
export function TabStaff({ tab, tuning, surface = "bg-paper-raised", compact = false }: Props) {
  const cols = tab.length > 0 ? tab : [{ notes: [] }];

  // 좌표계 상수
  const ROW_H = compact ? 22 : 34;
  const COL_W = compact ? 30 : 46;
  const PAD = compact ? 8 : 16;
  const HEAD = compact ? 14 : 22; // 음 위(벤딩/비브라토) 여백
  const staffH = STRING_COUNT * ROW_H;
  const totalH = HEAD + staffH;
  const staffW = cols.length * COL_W;

  const rowIndex = (s: number) => STRING_COUNT - 1 - s;
  const y = (s: number) => HEAD + rowIndex(s) * ROW_H + ROW_H / 2;
  const x = (c: number) => c * COL_W + COL_W / 2;

  // 슬라이드 사선 계산
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

  // 벤딩 곡선 화살표 + 비브라토 물결선
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

  const chipText = compact ? "text-[11px]" : "text-sm";
  const labelText = compact ? "text-[10px]" : "text-xs";
  const bendLabelSize = compact ? 7 : 9;

  return (
    <div className={`flex overflow-x-auto rounded-lg ${surface}`} style={{ padding: PAD }}>
      {/* 현 라벨 */}
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

      {/* 보표 본문 */}
      <div className="relative" style={{ width: staffW, height: totalH }}>
        <svg
          className="absolute inset-0"
          width={staffW}
          height={totalH}
          aria-hidden="true"
          style={{ overflow: "visible" }}
        >
          {/* 현 라인 */}
          {ROWS.map((s) => (
            <line
              key={s}
              x1={0}
              x2={staffW}
              y1={y(s)}
              y2={y(s)}
              stroke="var(--color-rule)"
              strokeWidth={1}
            />
          ))}
          {/* 슬라이드 사선 */}
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
          {/* 비브라토 물결선 */}
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
          {/* 벤딩 곡선 화살표 */}
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

        {/* 프렛 칩 */}
        {cols.map((col, c) =>
          col.notes.map((note) => {
            const glyph = note.artic ? ARTIC_GLYPH[note.artic] : undefined;
            return (
              <span
                key={`${c}-${note.string}`}
                className={`absolute z-10 inline-flex -translate-x-1/2 -translate-y-1/2 items-center rounded-md px-1 font-medium tabular-nums text-ink ${surface} ${chipText}`}
                style={{ left: x(c), top: y(note.string) }}
              >
                {note.fret}
                {glyph && (
                  <sup className="ml-px font-mono text-[0.6em] font-semibold text-accent">
                    {glyph}
                  </sup>
                )}
              </span>
            );
          }),
        )}
      </div>
    </div>
  );
}
