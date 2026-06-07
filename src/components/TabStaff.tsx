import { STRING_COUNT, type Column, type Articulation } from "@/lib/tab/types";

/** 주법 → 칩에 얹는 작은 기호 */
const ARTIC_GLYPH: Record<Articulation, string> = {
  h: "h",
  p: "p",
  "/": "╱",
  "\\": "╲",
  b: "↗",
  "~": "∿",
};

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
 * TAB를 그래픽 보표로 렌더한다. 6개의 현 라인 위에
 * 프렛 칩(숫자 + 주법 기호)을 얹어 악보처럼 보이게 한다.
 */
export function TabStaff({ tab, tuning, surface = "bg-paper-raised", compact = false }: Props) {
  const cols = tab.length > 0 ? tab : [{ notes: [] }];
  const rowH = compact ? "h-6" : "h-9";
  const colW = compact ? "min-w-7" : "min-w-10";
  const chipText = compact ? "text-[11px]" : "text-sm";
  const labelText = compact ? "text-[10px]" : "text-xs";

  return (
    <div className={`flex overflow-x-auto rounded-lg ${surface} ${compact ? "p-2" : "p-4"}`}>
      {/* 현 라벨 */}
      {!compact && (
        <div className="sticky left-0 z-20 mr-1 flex flex-col pr-1">
          {ROWS.map((s) => (
            <div
              key={s}
              className={`flex ${rowH} items-center justify-end font-mono ${labelText} font-medium text-ink-soft`}
            >
              {tuning[s]}
            </div>
          ))}
        </div>
      )}

      {/* 보표 본문 */}
      <div className="flex flex-1">
        {cols.map((col, c) => (
          <div key={c} className={`flex flex-1 flex-col ${colW}`}>
            {ROWS.map((s) => {
              const note = col.notes.find((n) => n.string === s);
              return (
                <div key={s} className={`relative flex ${rowH} items-center justify-center`}>
                  {/* 현 라인 */}
                  <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-rule" />
                  {note && (
                    <span
                      className={`relative z-10 inline-flex items-center rounded-md px-1.5 font-medium tabular-nums text-ink ${surface} ${chipText}`}
                    >
                      {note.fret}
                      {note.artic && (
                        <sup className="ml-px font-mono text-[0.65em] font-semibold text-accent">
                          {ARTIC_GLYPH[note.artic]}
                        </sup>
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
