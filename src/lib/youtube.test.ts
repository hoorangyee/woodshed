import { describe, it, expect } from "vitest";
import { parseYouTube, isYouTubeUrl } from "./youtube";

describe("parseYouTube", () => {
  it("parses watch URLs", () => {
    expect(parseYouTube("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      id: "dQw4w9WgXcQ",
      start: 0,
    });
  });

  it("parses youtu.be short links", () => {
    expect(parseYouTube("https://youtu.be/dQw4w9WgXcQ")?.id).toBe("dQw4w9WgXcQ");
  });

  it("parses shorts, embed, live", () => {
    expect(parseYouTube("https://www.youtube.com/shorts/dQw4w9WgXcQ")?.id).toBe("dQw4w9WgXcQ");
    expect(parseYouTube("https://www.youtube.com/embed/dQw4w9WgXcQ")?.id).toBe("dQw4w9WgXcQ");
    expect(parseYouTube("https://youtube.com/live/dQw4w9WgXcQ")?.id).toBe("dQw4w9WgXcQ");
  });

  it("reads start time (seconds and h/m/s forms)", () => {
    expect(parseYouTube("https://youtu.be/dQw4w9WgXcQ?t=90")?.start).toBe(90);
    expect(parseYouTube("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=2m30s")?.start).toBe(150);
    expect(parseYouTube("https://youtu.be/dQw4w9WgXcQ?t=1h1m1s")?.start).toBe(3661);
    expect(parseYouTube("https://www.youtube.com/watch?v=dQw4w9WgXcQ&start=45")?.start).toBe(45);
  });

  it("rejects non-YouTube and malformed URLs", () => {
    expect(parseYouTube("https://vimeo.com/123")).toBeNull();
    expect(parseYouTube("https://www.youtube.com/watch?v=tooShort")).toBeNull();
    expect(parseYouTube("not a url")).toBeNull();
    expect(parseYouTube("")).toBeNull();
  });

  it("isYouTubeUrl reflects parseability", () => {
    expect(isYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
    expect(isYouTubeUrl("https://example.com")).toBe(false);
  });
});
