import Link from "next/link";
import { licksRepo } from "@/lib/db/licks";
import { LickCard } from "@/components/LickCard";
import { TagFilter } from "@/components/TagFilter";
import { importLicks } from "@/app/licks/import/actions";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;
  const [licks, tags] = await Promise.all([
    licksRepo.list({ q, tag }),
    licksRepo.allTags(),
  ]);
  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Licks</h1>
        <div className="flex items-center gap-2">
          <a href="/api/export" className="rounded bg-neutral-800 px-3 py-2 text-sm">
            내보내기
          </a>
          <form action={importLicks} className="flex items-center">
            <input
              type="file"
              name="file"
              accept="application/json"
              className="w-32 text-xs file:mr-2 file:rounded file:border-0 file:bg-neutral-700 file:px-2 file:py-1"
            />
            <button className="rounded bg-neutral-800 px-3 py-2 text-sm">가져오기</button>
          </form>
          <Link
            href="/licks/new"
            className="rounded bg-amber-500 px-4 py-2 font-medium text-neutral-900"
          >
            + 새 릭
          </Link>
        </div>
      </div>
      <form className="mb-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="제목·메모·태그 검색"
          className="w-full rounded bg-neutral-800 px-3 py-2 outline-none"
        />
      </form>
      <div className="mb-6">
        <TagFilter tags={tags} />
      </div>
      {licks.length === 0 ? (
        <p className="text-neutral-500">아직 릭이 없습니다. 첫 릭을 추가해보세요.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {licks.map((l) => (
            <LickCard key={l.id} lick={l} />
          ))}
        </div>
      )}
    </main>
  );
}
