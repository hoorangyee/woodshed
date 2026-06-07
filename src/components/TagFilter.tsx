"use client";
import { useRouter, useSearchParams } from "next/navigation";

export function TagFilter({ tags }: { tags: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("tag");
  function pick(tag: string | null) {
    const next = new URLSearchParams(params.toString());
    if (tag) next.set("tag", tag);
    else next.delete("tag");
    router.push(`/?${next.toString()}`);
  }
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => pick(null)}
        className={`rounded-full px-3 py-1 text-sm ${!active ? "bg-amber-500 text-neutral-900" : "bg-neutral-800"}`}
      >
        전체
      </button>
      {tags.map((t) => (
        <button
          key={t}
          onClick={() => pick(t)}
          className={`rounded-full px-3 py-1 text-sm ${active === t ? "bg-amber-500 text-neutral-900" : "bg-neutral-800"}`}
        >
          #{t}
        </button>
      ))}
    </div>
  );
}
