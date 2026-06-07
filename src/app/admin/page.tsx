import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-user";
import { moderationRepo, type TargetType } from "@/lib/db/moderation";
import { InkLink } from "@/components/ui";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import {
  adminHideLick,
  adminHideComment,
  adminSetReport,
} from "@/lib/moderation-actions";

export default async function AdminPage() {
  await requireAdmin();
  const t = getDictionary(await getLocale());
  const reports = await moderationRepo.listReports("open");
  const targets = await Promise.all(
    reports.map((r) => moderationRepo.getTargetInfo(r.targetType as TargetType, r.targetId)),
  );

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-6">
        <InkLink href="/" className="text-sm">
          ← {t.myLicks}
        </InkLink>
        <h1 className="mt-3 font-serif text-3xl text-ink">{t.reportsQueue}</h1>
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-ink-soft">{t.noReports}</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r, i) => {
            const target = targets[i];
            const hideAction =
              r.targetType === "comment"
                ? adminHideComment.bind(null, r.targetId, !(target?.hidden ?? false))
                : adminHideLick.bind(null, r.targetId, !(target?.hidden ?? false));
            const resolve = adminSetReport.bind(null, r.id, "resolved");
            const dismiss = adminSetReport.bind(null, r.id, "dismissed");
            return (
              <li key={r.id} className="rounded-lg border border-rule bg-paper-raised p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-ink-faint">
                      {r.targetType} · {r.reason}
                      {r.reporterHandle && <> · @{r.reporterHandle}</>}
                    </div>
                    {target ? (
                      <Link href={target.href} className="mt-1 block truncate text-ink hover:text-accent">
                        {target.label}
                        {target.hidden && (
                          <span className="ml-2 text-xs text-accent">({t.hiddenByMod})</span>
                        )}
                      </Link>
                    ) : (
                      <p className="mt-1 text-sm text-ink-faint">—</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {target && (
                      <form action={hideAction}>
                        <button className="rounded-md border border-rule px-2.5 py-1 text-xs text-ink-soft hover:border-accent hover:text-accent">
                          {target.hidden ? t.unhide : t.hide}
                        </button>
                      </form>
                    )}
                    <form action={resolve}>
                      <button className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-paper-raised hover:bg-accent-ink">
                        {t.resolve}
                      </button>
                    </form>
                    <form action={dismiss}>
                      <button className="rounded-md border border-rule px-2.5 py-1 text-xs text-ink-soft hover:text-ink">
                        {t.dismiss}
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
