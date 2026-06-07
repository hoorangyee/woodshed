import { ImageResponse } from "next/og";
import { licksRepo } from "@/lib/db/licks";
import { STRING_COUNT, type Column, type Articulation } from "@/lib/tab/types";

export const runtime = "nodejs";
export const alt = "Woodshed — a guitar lick";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SLIDES = new Set<Articulation>(["/", "\\"]);
const BENDS = new Set<Articulation>(["b", "b½"]);
const SURFACE = "#fbf7ec";
const INK = "#2b2417";
const INK_SOFT = "#6a5f4a";
const RULE = "#dbd0b6";
const ACCENT = "#2f6b4f";

function arrowhead(x: number, yTip: number, s: number): string {
  return `${x},${yTip} ${x - s},${yTip + s * 1.5} ${x + s},${yTip + s * 1.5}`;
}
function wavy(cx: number, y: number, width: number, amp: number, wl: number): string {
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

/** Satori-compatible TAB staff (SVG shapes + positioned fret divs). */
function TabBlock({ tab, tuning }: { tab: Column[]; tuning: string[] }) {
  const cols = (tab.length ? tab : [{ notes: [] }]).slice(0, 18);
  const ROW_H = 44;
  const HEAD = 36;
  const inset = 11;
  const slant = 6;
  const bendUp = 22;
  const COL_W = Math.max(46, Math.min(78, Math.floor(980 / cols.length)));
  const staffH = STRING_COUNT * ROW_H;
  const totalH = HEAD + staffH;
  const staffW = cols.length * COL_W;
  const rowIndex = (s: number) => STRING_COUNT - 1 - s;
  const y = (s: number) => HEAD + rowIndex(s) * ROW_H + ROW_H / 2;
  const x = (c: number) => c * COL_W + COL_W / 2;
  const ROWS = Array.from({ length: STRING_COUNT }, (_, i) => STRING_COUNT - 1 - i);

  // Staff shapes are serialized to one SVG data-URI (Satori rasterizes it reliably);
  // fret numbers stay as positioned divs so they render with the default font.
  const parts: string[] = [];
  const chips: React.ReactElement[] = [];
  ROWS.forEach((s) =>
    parts.push(`<line x1="0" x2="${staffW}" y1="${y(s)}" y2="${y(s)}" stroke="${RULE}" stroke-width="1.5"/>`),
  );

  cols.forEach((col, c) => {
    for (const note of col.notes) {
      const glyph = note.artic === "h" || note.artic === "p" ? note.artic : "";
      chips.push(
        <div
          key={`c${c}-${note.string}`}
          style={{
            position: "absolute",
            left: x(c) - 16,
            top: y(note.string) - 15,
            width: 32,
            height: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: SURFACE,
            color: INK,
            fontSize: 21,
            fontWeight: 600,
          }}
        >
          {`${note.fret}${glyph}`}
        </div>,
      );
      if (!note.artic) continue;
      if (SLIDES.has(note.artic)) {
        const next = cols[c + 1];
        const target =
          next?.notes.find((n) => n.string === note.string) ??
          (next?.notes.length === 1 ? next.notes[0] : undefined);
        const x1 = x(c) + inset;
        let y1: number;
        let x2: number;
        let y2: number;
        if (target) {
          y1 = y(note.string);
          y2 = y(target.string);
          if (y1 === y2) {
            const up = note.artic === "/";
            y1 += up ? slant : -slant;
            y2 += up ? -slant : slant;
          }
          x2 = x(c + 1) - inset;
        } else {
          const up = note.artic === "/";
          const yc = y(note.string);
          y1 = yc + (up ? slant : -slant);
          x2 = x1 + COL_W * 0.4;
          y2 = yc + (up ? -slant : slant);
        }
        parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ACCENT}" stroke-width="2" stroke-linecap="round"/>`);
      } else if (BENDS.has(note.artic)) {
        const bx0 = x(c) + 10;
        const by0 = y(note.string) - 3;
        const bx1 = bx0 + 10;
        const by1 = y(note.string) - bendUp;
        parts.push(`<path d="M ${bx0} ${by0} Q ${bx1} ${by0} ${bx1} ${by1}" fill="none" stroke="${ACCENT}" stroke-width="1.75" stroke-linecap="round"/>`);
        parts.push(`<polygon points="${arrowhead(bx1, by1, 3.5)}" fill="${ACCENT}"/>`);
      } else if (note.artic === "~") {
        parts.push(`<path d="${wavy(x(c), y(note.string) - 16, 24, 3.5, 8)}" fill="none" stroke="${ACCENT}" stroke-width="1.5" stroke-linecap="round"/>`);
      }
    }
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${staffW}" height="${totalH}" viewBox="0 0 ${staffW} ${totalH}">${parts.join("")}</svg>`;
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

  return (
    <div style={{ display: "flex", backgroundColor: SURFACE, borderRadius: 18, padding: "20px 24px" }}>
      <div style={{ display: "flex", flexDirection: "column", marginTop: HEAD }}>
        {ROWS.map((s) => (
          <div
            key={`t${s}`}
            style={{ height: ROW_H, width: 26, display: "flex", alignItems: "center", justifyContent: "flex-end", color: INK_SOFT, fontSize: 18 }}
          >
            {tuning[s]}
          </div>
        ))}
      </div>
      <div style={{ position: "relative", display: "flex", width: staffW, height: totalH, marginLeft: 8 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUri} width={staffW} height={totalH} style={{ position: "absolute", left: 0, top: 0 }} alt="" />
        {chips}
      </div>
    </div>
  );
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lick = await licksRepo.get(id).catch(() => null);
  const shareable = !!lick && lick.visibility !== "private" && !lick.hidden;
  const author =
    shareable && lick.ownerId ? await licksRepo.getAuthorById(lick.ownerId).catch(() => null) : null;
  const rawTitle = shareable ? lick.title : "Woodshed";
  const title = rawTitle.length > 52 ? rawTitle.slice(0, 49) + "…" : rawTitle;

  const brand = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <svg width="48" height="48" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="7" fill="#2f6b4f" />
          <path d="M6 15 L16 6.5 L26 15" stroke="#f0e9d9" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 14.5 V25 H23 V14.5" stroke="#f0e9d9" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="16" cy="18.8" r="2.4" stroke="#f0e9d9" strokeWidth="2.4" fill="none" />
        </svg>
        <div style={{ marginLeft: 14, fontSize: 30, fontWeight: 700, color: "#2f6b4f" }}>Woodshed</div>
      </div>
      {author?.handle ? (
        <div style={{ fontSize: 28, color: "#6a5f4a" }}>{`@${author.handle}`}</div>
      ) : null}
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f0e9d9",
          padding: "48px 56px",
          fontFamily: "sans-serif",
        }}
      >
        {brand}
        <div style={{ marginTop: 20, fontSize: 52, fontWeight: 800, color: "#2b2417", lineHeight: 1.05 }}>
          {title}
        </div>
        {shareable ? (
          <div style={{ marginTop: 26, display: "flex", justifyContent: "center" }}>
            <TabBlock tab={lick.tab} tuning={lick.tuning} />
          </div>
        ) : (
          <div style={{ marginTop: 20, fontSize: 30, color: "#a69a80" }}>Woodshed your guitar licks</div>
        )}
      </div>
    ),
    { ...size },
  );
}
