import Link from "next/link";
import { licksRepo } from "@/lib/db/licks";
import { LickCard } from "@/components/LickCard";
import { TagFilter } from "@/components/TagFilter";
import { ImportButton } from "@/components/ImportButton";
import { Wordmark, btnPrimary, btnGhost, inputBase } from "@/components/ui";
import { importLicks } from "@/app/licks/import/actions";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;
  const [licks, tags] = await Promise.all([licksRepo.list({ q, tag }), licksRepo.allTags()]);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-5">
        <div>
          <Wordmark className="text-4xl" />
          <p className="mt-1 text-sm text-ink-soft">모아둔 기타 릭 {licks.length}개</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/export" className={btnGhost}>
            내보내기
          </a>
          <ImportButton action={importLicks} />
          <Link href="/licks/new" className={btnPrimary}>
            + 새 릭
          </Link>
        </div>
      </header>

      <form className="mb-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="제목·메모·태그 검색…"
          aria-label="릭 검색"
          className={inputBase}
        />
      </form>

      {tags.length > 0 && (
        <div className="mb-2">
          <TagFilter tags={tags} />
        </div>
      )}

      {licks.length === 0 ? (
        <EmptyState filtered={Boolean(q || tag)} />
      ) : (
        <ul className="divide-y divide-dotted divide-rule">
          {licks.map((l) => (
            <li key={l.id}>
              <LickCard lick={l} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div role="status" className="rounded-lg border border-dashed border-rule px-6 py-16 text-center">
      <p className="font-serif text-2xl text-ink">{filtered ? "결과가 없어요" : "아직 비어 있어요"}</p>
      <p className="mt-2 text-sm text-ink-soft">
        {filtered ? "검색어나 태그를 바꿔보세요." : "마음에 든 릭을 한 줄씩 적어두세요."}
      </p>
      {!filtered && (
        <Link href="/licks/new" className={`${btnPrimary} mt-5`}>
          + 첫 릭 적기
        </Link>
      )}
    </div>
  );
}
