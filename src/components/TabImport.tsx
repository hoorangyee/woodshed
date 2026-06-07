"use client";
import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { btnGhost } from "./ui";
import type { Column } from "@/lib/tab/types";

/** Upload a TAB image → gpt-4o-mini converts it → fills the editor (for review). */
export function TabImport({
  onResult,
}: {
  onResult: (r: { tuning: string[]; tab: Column[] }) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    setErr("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("image", file);
      const res = await fetch("/api/tab/convert", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.detail ? `${data.error ?? t.convertFailed} — ${data.detail}` : data?.error || t.convertFailed);
        return;
      }
      onResult({ tuning: data.tuning, tab: data.tab });
    } catch {
      setErr(t.convertFailed);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => ref.current?.click()}
        className={`${btnGhost} text-sm`}
      >
        {busy ? t.converting : t.importFromImage}
      </button>
      {err && <span className="text-xs text-danger">{err}</span>}
    </span>
  );
}
