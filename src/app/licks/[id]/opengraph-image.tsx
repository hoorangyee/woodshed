import { ImageResponse } from "next/og";
import { licksRepo } from "@/lib/db/licks";

export const runtime = "nodejs";
export const alt = "Woodshed — a guitar lick";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lick = await licksRepo.get(id).catch(() => null);
  const shareable = !!lick && lick.visibility !== "private" && !lick.hidden;
  const author =
    shareable && lick.ownerId ? await licksRepo.getAuthorById(lick.ownerId).catch(() => null) : null;
  const rawTitle = shareable ? lick.title : "Woodshed";
  const title = rawTitle.length > 64 ? rawTitle.slice(0, 61) + "…" : rawTitle;
  const tags = shareable ? lick.tags.slice(0, 4) : [];

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#f0e9d9",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <svg width="56" height="56" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="7" fill="#2f6b4f" />
            <path
              d="M6 15 L16 6.5 L26 15"
              stroke="#f0e9d9"
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9 14.5 V25 H23 V14.5"
              stroke="#f0e9d9"
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="16" cy="18.8" r="2.4" stroke="#f0e9d9" strokeWidth="2.4" fill="none" />
          </svg>
          <div style={{ marginLeft: 18, fontSize: 38, fontWeight: 700, color: "#2f6b4f" }}>
            Woodshed
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 80, fontWeight: 800, color: "#2b2417", lineHeight: 1.05 }}>
            {title}
          </div>
          <div style={{ marginTop: 20, fontSize: 36, color: "#6a5f4a" }}>
            {author?.handle ? `@${author.handle}` : "Woodshed your guitar licks"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          {tags.length > 0 ? (
            tags.map((tg) => (
              <div
                key={tg}
                style={{
                  display: "flex",
                  marginRight: 14,
                  fontSize: 28,
                  color: "#2f6b4f",
                  border: "2px solid #dbd0b6",
                  borderRadius: 999,
                  padding: "6px 20px",
                }}
              >
                {tg}
              </div>
            ))
          ) : (
            <div style={{ display: "flex", fontSize: 28, color: "#a69a80" }}>
              guitar lick · tablature
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
