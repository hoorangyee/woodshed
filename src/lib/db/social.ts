import { and, eq, asc, desc, gt, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { drizzle } from "drizzle-orm/libsql";
import { likes, comments, collections, collectionItems, users } from "./schema";
import { db as defaultDb } from "./client";
import type { Visibility } from "./schema";

type DB = ReturnType<typeof drizzle>;

export interface CommentRecord {
  id: string;
  body: string;
  createdAt: number;
  userId: string;
  authorHandle: string | null;
  authorName: string | null;
  authorImage: string | null;
}

export interface CollectionRecord {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  visibility: Visibility;
  createdAt: number;
  updatedAt: number;
  itemCount: number;
}

export function makeSocialRepo(db: DB) {
  return {
    likes: {
      async count(lickId: string): Promise<number> {
        const rows = await db
          .select({ c: sql<number>`count(*)` })
          .from(likes)
          .where(eq(likes.lickId, lickId));
        return Number(rows[0]?.c ?? 0);
      },
      async isLiked(userId: string, lickId: string): Promise<boolean> {
        const rows = await db
          .select({ lickId: likes.lickId })
          .from(likes)
          .where(and(eq(likes.userId, userId), eq(likes.lickId, lickId)))
          .limit(1);
        return rows.length > 0;
      },
      /** 토글 후 좋아요 상태(true=좋아요됨)를 반환. */
      async toggle(userId: string, lickId: string): Promise<boolean> {
        const existing = await db
          .select({ lickId: likes.lickId })
          .from(likes)
          .where(and(eq(likes.userId, userId), eq(likes.lickId, lickId)))
          .limit(1);
        if (existing[0]) {
          await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.lickId, lickId)));
          return false;
        }
        await db.insert(likes).values({ userId, lickId, createdAt: Date.now() });
        return true;
      },
      /** 여러 릭의 좋아요 수(카드 표시용). */
      async countsFor(lickIds: string[]): Promise<Record<string, number>> {
        if (lickIds.length === 0) return {};
        const rows = await db
          .select({ lickId: likes.lickId, c: sql<number>`count(*)` })
          .from(likes)
          .where(inArray(likes.lickId, lickIds))
          .groupBy(likes.lickId);
        return Object.fromEntries(rows.map((r) => [r.lickId, Number(r.c)]));
      },
    },

    comments: {
      async list(lickId: string): Promise<CommentRecord[]> {
        const rows = await db
          .select({
            id: comments.id,
            body: comments.body,
            createdAt: comments.createdAt,
            userId: comments.userId,
            authorHandle: users.handle,
            authorName: users.name,
            authorImage: users.image,
          })
          .from(comments)
          .leftJoin(users, eq(users.id, comments.userId))
          .where(and(eq(comments.lickId, lickId), eq(comments.hidden, 0)))
          .orderBy(asc(comments.createdAt));
        return rows;
      },
      async add(lickId: string, userId: string, body: string): Promise<string> {
        const id = nanoid();
        await db.insert(comments).values({ id, lickId, userId, body, createdAt: Date.now() });
        return id;
      },
      /** 여러 릭의 (숨김 제외) 댓글 수. 정렬·카드 표시용. */
      async countsFor(lickIds: string[]): Promise<Record<string, number>> {
        if (lickIds.length === 0) return {};
        const rows = await db
          .select({ lickId: comments.lickId, c: sql<number>`count(*)` })
          .from(comments)
          .where(and(inArray(comments.lickId, lickIds), eq(comments.hidden, 0)))
          .groupBy(comments.lickId);
        return Object.fromEntries(rows.map((r) => [r.lickId, Number(r.c)]));
      },
      /** 레이트리밋용: sinceMs 이후 해당 사용자의 댓글 수. */
      async recentCountByUser(userId: string, sinceMs: number): Promise<number> {
        const rows = await db
          .select({ c: sql<number>`count(*)` })
          .from(comments)
          .where(and(eq(comments.userId, userId), gt(comments.createdAt, sinceMs)));
        return Number(rows[0]?.c ?? 0);
      },
      async get(id: string): Promise<{ id: string; lickId: string; userId: string } | null> {
        const rows = await db
          .select({ id: comments.id, lickId: comments.lickId, userId: comments.userId })
          .from(comments)
          .where(eq(comments.id, id))
          .limit(1);
        return rows[0] ?? null;
      },
      async remove(id: string): Promise<void> {
        await db.delete(comments).where(eq(comments.id, id));
      },
    },

    collections: {
      async create(
        ownerId: string,
        input: { title: string; description?: string; visibility: Visibility },
      ): Promise<string> {
        const id = nanoid();
        const now = Date.now();
        await db.insert(collections).values({
          id,
          ownerId,
          title: input.title,
          description: input.description ?? "",
          visibility: input.visibility,
          createdAt: now,
          updatedAt: now,
        });
        return id;
      },

      async get(id: string): Promise<CollectionRecord | null> {
        const rows = await db.select().from(collections).where(eq(collections.id, id)).limit(1);
        if (!rows[0]) return null;
        const count = await db
          .select({ c: sql<number>`count(*)` })
          .from(collectionItems)
          .where(eq(collectionItems.collectionId, id));
        return { ...rows[0], visibility: rows[0].visibility as Visibility, itemCount: Number(count[0]?.c ?? 0) };
      },

      async listByOwner(ownerId: string, opts?: { publicOnly?: boolean }): Promise<CollectionRecord[]> {
        const conds = [eq(collections.ownerId, ownerId)];
        if (opts?.publicOnly) conds.push(eq(collections.visibility, "public"));
        const rows = await db
          .select()
          .from(collections)
          .where(and(...conds))
          .orderBy(desc(collections.updatedAt));
        const counts = await db
          .select({ collectionId: collectionItems.collectionId, c: sql<number>`count(*)` })
          .from(collectionItems)
          .groupBy(collectionItems.collectionId);
        const countMap = Object.fromEntries(counts.map((r) => [r.collectionId, Number(r.c)]));
        return rows.map((r) => ({
          ...r,
          visibility: r.visibility as Visibility,
          itemCount: countMap[r.id] ?? 0,
        }));
      },

      /** 컬렉션에 담긴 릭 id를 순서대로 반환. */
      async itemLickIds(collectionId: string): Promise<string[]> {
        const rows = await db
          .select({ lickId: collectionItems.lickId })
          .from(collectionItems)
          .where(eq(collectionItems.collectionId, collectionId))
          .orderBy(asc(collectionItems.position));
        return rows.map((r) => r.lickId);
      },

      async addLick(collectionId: string, lickId: string): Promise<void> {
        const existing = await db
          .select({ lickId: collectionItems.lickId })
          .from(collectionItems)
          .where(and(eq(collectionItems.collectionId, collectionId), eq(collectionItems.lickId, lickId)))
          .limit(1);
        if (existing[0]) return;
        const max = await db
          .select({ m: sql<number>`coalesce(max(position), -1)` })
          .from(collectionItems)
          .where(eq(collectionItems.collectionId, collectionId));
        await db.insert(collectionItems).values({
          collectionId,
          lickId,
          position: Number(max[0]?.m ?? -1) + 1,
          addedAt: Date.now(),
        });
        await db.update(collections).set({ updatedAt: Date.now() }).where(eq(collections.id, collectionId));
      },

      async removeLick(collectionId: string, lickId: string): Promise<void> {
        await db
          .delete(collectionItems)
          .where(and(eq(collectionItems.collectionId, collectionId), eq(collectionItems.lickId, lickId)));
      },

      async remove(id: string): Promise<void> {
        await db.delete(collectionItems).where(eq(collectionItems.collectionId, id));
        await db.delete(collections).where(eq(collections.id, id));
      },

      /** 소유자의 컬렉션 중 특정 릭을 담고 있는 컬렉션 id 집합(추가 UI용). */
      async collectionIdsContaining(ownerId: string, lickId: string): Promise<string[]> {
        const rows = await db
          .select({ id: collections.id })
          .from(collectionItems)
          .innerJoin(collections, eq(collections.id, collectionItems.collectionId))
          .where(and(eq(collections.ownerId, ownerId), eq(collectionItems.lickId, lickId)));
        return rows.map((r) => r.id);
      },
    },
  };
}

export const socialRepo = makeSocialRepo(defaultDb as unknown as DB);
