"use client";
import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { btnGhost } from "./ui";

const MAX_BYTES = 8 * 1024 * 1024;

export function AudioUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    setErr("");
    if (file.size > MAX_BYTES) {
      setErr(t.audioTooLarge);
      return;
    }
    if (!file.type.startsWith("audio/")) {
      setErr(t.audioBadType);
      return;
    }
    setBusy(true);
    try {
      const res = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        contentType: file.type,
      });
      onChange(res.url);
    } catch {
      setErr(t.audioUploadFailed);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  if (value) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <audio controls src={value} className="h-9 max-w-full" />
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-sm text-danger transition-colors hover:underline"
        >
          {t.removeAudio}
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <button type="button" disabled={busy} onClick={() => ref.current?.click()} className={btnGhost}>
        {busy ? t.uploading : t.uploadAudio}
      </button>
      {err && <p className="mt-1 text-xs text-danger">{err}</p>}
    </div>
  );
}
