/** Parse a YouTube URL into { id, start(seconds) }. Returns null if it isn't a YouTube URL. */
export function parseYouTube(url: string): { id: string; start: number } | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  let id = "";
  if (host === "youtu.be") {
    id = u.pathname.slice(1);
  } else if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    if (u.pathname === "/watch") id = u.searchParams.get("v") ?? "";
    else if (u.pathname.startsWith("/embed/")) id = u.pathname.slice(7);
    else if (u.pathname.startsWith("/shorts/")) id = u.pathname.slice(8);
    else if (u.pathname.startsWith("/live/")) id = u.pathname.slice(6);
  } else {
    return null;
  }
  id = id.split("/")[0];
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return null;
  const start = parseStart(u.searchParams.get("t") ?? u.searchParams.get("start") ?? "");
  return { id, start };
}

/** "90", "90s", "2m30s", "1h2m3s" → seconds. */
function parseStart(t: string): number {
  if (!t) return 0;
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m || !m[0]) return 0;
  return (+(m[1] ?? 0)) * 3600 + (+(m[2] ?? 0)) * 60 + +(m[3] ?? 0);
}

export function isYouTubeUrl(url: string): boolean {
  return parseYouTube(url) !== null;
}
