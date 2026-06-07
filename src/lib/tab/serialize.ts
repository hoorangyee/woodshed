import { STRING_COUNT, type Column, type Note } from "./types";

/** 한 음표 셀을 토큰 문자열로 (예: "8b", "12"). */
export function cellToken(note: Note): string {
  return `${note.fret}${note.artic ?? ""}`;
}

/**
 * 구조화 TAB(Column[])을 ASCII 6줄 문자열로 변환한다.
 * 고음 줄(index 5)이 맨 위, 저음(index 0)이 맨 아래로 표시된다.
 * 각 칸은 그 칸에서 가장 넓은 토큰 폭에 맞춰 '-'로 패딩한다.
 */
export function toAscii(tab: Column[], tuning: string[]): string {
  // 칸별 폭 계산
  const widths = tab.map((col) => {
    let w = 1;
    for (const n of col.notes) w = Math.max(w, cellToken(n).length);
    return w;
  });

  const rows: string[] = [];
  for (let s = STRING_COUNT - 1; s >= 0; s--) {
    const label = (tuning[s] ?? "?").padStart(1, " ");
    let line = `${label}|`;
    tab.forEach((col, c) => {
      const note = col.notes.find((n) => n.string === s);
      const token = note ? cellToken(note) : "";
      const w = widths[c];
      // '-' 한 칸을 셀 앞에 두어 가독성 확보 후 폭 패딩
      line += "-" + token.padEnd(w, "-");
    });
    line += "-|";
    rows.push(line);
  }
  return rows.join("\n");
}
