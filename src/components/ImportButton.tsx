"use client";
import { useRef } from "react";
import { btnGhost } from "./ui";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function ImportButton({ action }: { action: (formData: FormData) => void }) {
  const { t } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={action}>
      <label className={`${btnGhost} cursor-pointer`}>
        {t.importJson}
        <input
          type="file"
          name="file"
          accept="application/json"
          className="sr-only"
          onChange={() => formRef.current?.requestSubmit()}
        />
      </label>
    </form>
  );
}
