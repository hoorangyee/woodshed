"use client";
import { useRef } from "react";
import { addComment } from "@/lib/social-actions";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { SubmitButton } from "./SubmitButton";
import { btnPrimary, inputBase } from "./ui";

export function CommentForm({ lickId }: { lickId: string }) {
  const { t } = useI18n();
  const ref = useRef<HTMLFormElement>(null);
  const post = addComment.bind(null, lickId);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        await post(fd);
        ref.current?.reset();
      }}
      className="space-y-2"
    >
      <textarea
        name="body"
        rows={2}
        maxLength={1000}
        required
        placeholder={t.commentPlaceholder}
        aria-label={t.commentPlaceholder}
        className={inputBase}
      />
      <div className="flex justify-end">
        <SubmitButton className={btnPrimary} pendingLabel={t.posting}>
          {t.postComment}
        </SubmitButton>
      </div>
    </form>
  );
}
