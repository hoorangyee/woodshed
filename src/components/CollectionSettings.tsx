"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { btnPrimary, btnGhost, inputBase } from "./ui";

/** Owner-only inline editor for a collection's title + visibility. */
export function CollectionSettings({
  title,
  visibility,
  action,
}: {
  title: string;
  visibility: string;
  action: (formData: FormData) => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const visLabel =
    visibility === "public" ? t.visPublic : visibility === "unlisted" ? t.visUnlisted : t.visPrivate;

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="font-serif text-3xl text-ink">{title}</h1>
        <span className="rounded-full border border-rule px-2 py-0.5 text-xs text-ink-soft">
          {visLabel}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm text-ink-faint transition-colors hover:text-accent"
        >
          {t.edit}
        </button>
      </div>
    );
  }

  return (
    <form action={action} onSubmit={() => setEditing(false)} className="flex flex-wrap items-center gap-2">
      <input
        name="title"
        defaultValue={title}
        required
        maxLength={100}
        aria-label={t.collectionTitle}
        className={`${inputBase} min-w-0 flex-1`}
      />
      <select
        name="visibility"
        defaultValue={visibility === "public" ? "public" : "private"}
        aria-label={t.visibilityLabel}
        className="rounded-md border border-rule bg-paper-raised px-2 text-sm text-ink"
      >
        <option value="private">{t.visPrivate}</option>
        <option value="public">{t.visPublic}</option>
      </select>
      <button className={btnPrimary}>{t.save}</button>
      <button type="button" onClick={() => setEditing(false)} className={btnGhost}>
        {t.cancel}
      </button>
    </form>
  );
}
