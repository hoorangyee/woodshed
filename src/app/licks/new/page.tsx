import { LickForm } from "@/components/LickForm";
import { InkLink } from "@/components/ui";
import { createLick } from "../actions";

export default function NewLickPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-6">
        <InkLink href="/" className="text-sm">
          ← 노트로
        </InkLink>
        <h1 className="mt-3 font-serif text-3xl text-ink">새 릭</h1>
      </div>
      <LickForm action={createLick} submitLabel="저장하기" />
    </main>
  );
}
