import Link from "next/link";
import { notFound } from "next/navigation";
import { licksRepo } from "@/lib/db/licks";
import { socialRepo } from "@/lib/db/social";
import { TabView } from "@/components/TabView";
import { DeleteButton } from "@/components/DeleteButton";
import { CopyLink } from "@/components/CopyLink";
import { LikeButton } from "@/components/LikeButton";
import { CommentForm } from "@/components/CommentForm";
import { AddToCollection } from "@/components/AddToCollection";
import { ReportButton } from "@/components/ReportButton";
import { InkLink, btnGhost } from "@/components/ui";
import { deleteLick } from "../actions";
import { deleteComment } from "@/lib/social-actions";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { currentUser, isAdmin } from "@/lib/auth/current-user";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const lick = await licksRepo.get(id);
  // Don't leak title/memo of private or moderator-hidden licks in link previews.
  if (!lick || lick.visibility === "private" || lick.hidden) {
    return { title: "Woodshed" };
  }
  const author = lick.ownerId ? await licksRepo.getAuthorById(lick.ownerId) : null;
  const desc =
    lick.memo?.trim().slice(0, 160) ||
    `A guitar lick${author?.handle ? ` by @${author.handle}` : ""} on Woodshed.`;
  return {
    title: `${lick.title} · Woodshed`,
    description: desc,
    openGraph: { title: lick.title, description: desc, type: "article" },
    twitter: { card: "summary_large_image", title: lick.title, description: desc },
  };
}

export default async function LickDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = getDictionary(await getLocale());
  const [lick, user] = await Promise.all([licksRepo.get(id), currentUser()]);
  if (!lick) notFound();

  const isOwner = !!user && user.id === lick.ownerId;
  const admin = isAdmin(user);
  // Private licks are viewable by the owner only
  if (lick.visibility === "private" && !isOwner) notFound();
  // Moderator-hidden licks are viewable only by the owner or an admin
  if (lick.hidden && !isOwner && !admin) notFound();

  const [author, likeCount, liked, comments] = await Promise.all([
    lick.ownerId ? licksRepo.getAuthorById(lick.ownerId) : Promise.resolve(null),
    socialRepo.likes.count(id),
    user ? socialRepo.likes.isLiked(user.id, id) : Promise.resolve(false),
    socialRepo.comments.list(id),
  ]);

  const myCollections = user ? await socialRepo.collections.listByOwner(user.id) : [];
  const containedIds = user
    ? await socialRepo.collections.collectionIdsContaining(user.id, id)
    : [];

  const shareable = lick.visibility !== "private";
  const del = deleteLick.bind(null, id);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <InkLink href="/" className="text-sm">
        ← {t.back}
      </InkLink>

      <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-5">
        <div className="min-w-0">
          <h1 className="font-serif text-3xl text-ink">{lick.title}</h1>
          {author?.handle && (
            <p className="mt-1 text-sm text-ink-soft">
              {t.byAuthor}{" "}
              <Link href={`/u/${author.handle}`} className="text-accent hover:underline">
                @{author.handle}
              </Link>
            </p>
          )}
          {lick.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
              {lick.tags.map((tag, i) => (
                <span key={tag}>
                  {i > 0 && <span className="mr-2 text-ink-faint">·</span>}
                  <Link
                    href={`/?tag=${encodeURIComponent(tag)}`}
                    className="no-underline transition-colors hover:text-accent"
                  >
                    {tag}
                  </Link>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LikeButton lickId={id} initialLiked={liked} initialCount={likeCount} canLike={!!user} />
          {user && (
            <AddToCollection
              lickId={id}
              collections={myCollections.map((c) => ({ id: c.id, title: c.title }))}
              containedIds={containedIds}
            />
          )}
          {shareable && <CopyLink />}
          {user && !isOwner && <ReportButton targetType="lick" targetId={id} />}
          {isOwner && (
            <>
              <Link href={`/licks/${id}/edit`} className={btnGhost}>
                {t.edit}
              </Link>
              <DeleteButton action={del} />
            </>
          )}
        </div>
      </div>

      {lick.hidden ? (
        <p className="mb-4 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
          {t.hiddenByMod}
        </p>
      ) : null}

      <TabView tab={lick.tab} tuning={lick.tuning} />

      {(lick.source || lick.memo) && (
        <dl className="mt-6 space-y-4">
          {lick.source && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                {t.sourceLabel}
              </dt>
              <dd className="mt-1 text-ink">{lick.source}</dd>
            </div>
          )}
          {lick.memo && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                {t.memoLabel}
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-ink">{lick.memo}</dd>
            </div>
          )}
        </dl>
      )}

      <section className="mt-10 border-t border-rule pt-6">
        <h2 className="mb-4 font-serif text-xl text-ink">
          {t.comments} <span className="text-ink-faint">{comments.length}</span>
        </h2>
        {user ? (
          <CommentForm lickId={id} />
        ) : (
          <p className="text-sm text-ink-soft">{t.signInToComment}</p>
        )}
        {comments.length === 0 ? (
          <p className="mt-5 text-sm text-ink-faint">{t.noComments}</p>
        ) : (
          <ul className="mt-5 space-y-4">
            {comments.map((c) => {
              const canDelete = !!user && (c.userId === user.id || isOwner);
              const delComment = deleteComment.bind(null, c.id, id);
              return (
                <li key={c.id} className="rounded-lg border border-rule bg-paper-raised p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      {c.authorHandle ? (
                        <Link href={`/u/${c.authorHandle}`} className="text-accent hover:underline">
                          @{c.authorHandle}
                        </Link>
                      ) : (
                        <span className="text-ink-soft">{c.authorName ?? "?"}</span>
                      )}
                      <span className="ml-2 text-xs text-ink-faint">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {user && c.userId !== user.id && (
                        <ReportButton targetType="comment" targetId={c.id} variant="link" />
                      )}
                      {canDelete && (
                        <form action={delComment}>
                          <button
                            aria-label={t.deleteCommentAria}
                            className="text-xs text-ink-faint transition-colors hover:text-accent"
                          >
                            ✕
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-ink">{c.body}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
