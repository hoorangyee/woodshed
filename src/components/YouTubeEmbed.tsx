"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** Lightweight YouTube embed: shows the thumbnail, loads the iframe only on click. */
export function YouTubeEmbed({ id, start = 0 }: { id: string; start?: number }) {
  const { t } = useI18n();
  const [play, setPlay] = useState(false);
  const thumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1${start ? `&start=${start}` : ""}`;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-rule bg-paper-sunk">
      {play ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={src}
          title="YouTube"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlay(true)}
          aria-label={t.playOnYouTube}
          className="group absolute inset-0 h-full w-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt="" className="h-full w-full object-cover" />
          <span className="absolute inset-0 grid place-items-center bg-ink/10 transition-colors group-hover:bg-ink/0">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-danger/90 shadow-md transition-transform group-hover:scale-110">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#fbf7ec" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
