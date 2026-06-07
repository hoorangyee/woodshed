import { STRING_COUNT, type Column, type Note } from "./types";

/** A single note cell as a token string (e.g. "8b", "12"). */
export function cellToken(note: Note): string {
  return `${note.fret}${note.artic ?? ""}`;
}

/**
 * Converts structured TAB (Column[]) into a 6-line ASCII string.
 * The high string (index 5) is on top, the low string (index 0) at the bottom.
 * Each column is padded with '-' to the widest token in that column.
 */
export function toAscii(tab: Column[], tuning: string[]): string {
  // Compute per-column widths
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
      if (col.whiskey) {
        // A whiskey break — same glyph on every line so it reads as a "sip here" column.
        line += "-🥃";
        return;
      }
      const note = col.notes.find((n) => n.string === s);
      const token = note ? cellToken(note) : "";
      const w = widths[c];
      // Lead with one '-' before the cell for readability, then pad to width
      line += "-" + token.padEnd(w, "-");
    });
    line += "-|";
    rows.push(line);
  }
  return rows.join("\n");
}
