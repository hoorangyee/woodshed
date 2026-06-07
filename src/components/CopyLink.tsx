"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** Copy the current page (or given path) URL to the clipboard. */
export function CopyLink({ path }: { path?: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const url = path ? new URL(path, window.location.origin).toString() : window.location.href;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="rounded-md border border-rule px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-accent hover:text-accent"
    >
      {/* Reserve the width of the widest label so the text swap doesn't reflow the row */}
      <span className="grid">
        <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-nowrap">
          {t.copyLink}
        </span>
        <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-nowrap">
          {t.linkCopied}
        </span>
        <span className="col-start-1 row-start-1 whitespace-nowrap text-center">
          {copied ? t.linkCopied : t.copyLink}
        </span>
      </span>
    </button>
  );
}
