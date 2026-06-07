import { STRING_COUNT, type Column, type Articulation } from "@/lib/tab/types";

// 칩 위에 얹는 작은 기호 (슬라이드는 사선으로 그리므로 제외)
const ARTIC_GLYPH: Partial<Record<Articulation, string>> = {
  h: "h",
  p: "p",
  b: "↗",
  "b½": "↗½",
  "~": "∿",
};

const SLIDES = new Set<Articulation>(["/", "\\"]);

// 위→아래 표시 순서 (고음 e=5 가 맨 위)
const ROWS = Array.from({ length: STRING_COUNT }, (_, i) => STRING_COUNT - 1 - i);

interface Props {
  tab: Column[];
  tuning: string[];
  /** 컨테이너/칩 배경(괘선을 칩 뒤로 가리기 위해 둘이 같아야 함) */
  surface?: string;
  compact?: boolean;
}

/**
 * TAB를 그래픽 보표로 렌더한다. 6개의 현 라인 위에 프렛 칩을 얹고,
 * 슬라이드는 음 사이 사선으로, 벤딩은 칩의 화살표(풀 ↗ / 하프 ↗½)로 표기한다.
 */
export function TabStaff({ tab, tuning, surface = "bg-paper-raised", compact = false }: Props) {
  const cols = tab.length > 0 ? tab : [{ notes: [] }];

  // 좌표계 상수
  const ROW_H = compact ? 22 : 34;
  const COL_W = compact ? 30 : 46;
  const PAD = compact ? 8 : 16;
  const staffW = cols.length * COL_W;
  const staffH = STRING_COUNT * ROW_H;

  const rowIndex = (s: number) => STRING_COUNT - 1 - s;
  const y = (s: number) => rowIndex(s) * ROW_H + ROW_H / 2;
  const x = (c: number) => c * COL_W + COL_W / 2;

  // 슬라이드 라인 계산: 각 슬라이드 음 → 다음 칸의 대상 음으로 사선 연결
  const slides: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const inset = compact ? 7 : 11; // 두 숫자 사이 간격
  const slant = compact ? 4 : 6; // 같은 현일 때 기울기
  cols.forEach((col, c) => {
    for (const note of col.notes) {
      if (!note.artic || !SLIDES.has(note.artic)) continue;
      const nextCol = cols[c + 1];
      // 대상 음: 다음 칸의 같은 현, 없으면 다음 칸의 단일 음
      const target =
        nextCol?.notes.find((n) => n.string === note.string) ??
        (nextCol?.notes.length === 1 ? nextCol.notes[0] : undefined);

      if (target) {
        let y1 = y(note.string);
        let y2 = y(target.string);
        if (y1 === y2) {
          // 같은 현: 방향대로 살짝 기울임
          const up = note.artic === "/";
          y1 += up ? slant : -slant;
          y2 += up ? -slant : slant;
        }
        slides.push({ x1: x(c) + inset, y1, x2: x(c + 1) - inset, y2 });
      } else {
        // 마지막 칸 등 대상 없음: 방향만 보이는 짧은 사선
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

  const chipText = compact ? "text-[11px]" : "text-sm";
  const labelText = compact ? "text-[10px]" : "text-xs";

  return (
    <div className={`flex overflow-x-auto rounded-lg ${surface}`} style={{ padding: PAD }}>
      {/* 현 라벨 */}
      {!compact && (
        <div className="mr-1 flex flex-col" style={{ height: staffH }}>
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
      <div className="relative" style={{ width: staffW, height: staffH }}>
        <svg
          className="absolute inset-0"
          width={staffW}
          height={staffH}
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
              key={i}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke="var(--color-accent)"
              strokeWidth={compact ? 1.25 : 1.75}
              strokeLinecap="round"
            />
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
