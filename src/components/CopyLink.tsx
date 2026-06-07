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
      {copied ? t.linkCopied : t.copyLink}
    </button>
  );
}
