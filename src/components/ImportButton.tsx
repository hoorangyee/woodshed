"use client";
import { useRef } from "react";
import { btnGhost } from "./ui";

export function ImportButton({ action }: { action: (formData: FormData) => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={action}>
      <label className={`${btnGhost} cursor-pointer`}>
        가져오기
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
