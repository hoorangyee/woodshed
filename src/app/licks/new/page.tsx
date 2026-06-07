import { LickForm } from "@/components/LickForm";
import { createLick } from "../actions";

export default function NewLickPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-xl font-semibold">새 릭</h1>
      <LickForm action={createLick} submitLabel="저장" />
    </main>
  );
}
