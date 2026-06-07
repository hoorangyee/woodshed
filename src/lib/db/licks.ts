import { and, eq, like, inArray, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { drizzle } from "drizzle-orm/libsql";
import { licks, tags, lickTags, users, type Visibility } from "./schema";
import type { Column } from "@/lib/tab/types";
import { db as defaultDb } from "./client";

type DB = ReturnType<typeof drizzle>;

export interface LickInput {
  title: string;
  tuning: string[];
  tab: Column[];
  memo: string;
  source: string;
  tags: string[];
  visibility: Visibility;
}

export interface LickRecord extends LickInput {
  id: string;
  ownerId: string | null;
  hidden: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ListFilter {
  q?: string;
  tag?: string;
  ownerId?: string;
}

export interface Author {
  handle: string | null;
  name: string | null;
  image: string | null;
}
export interface LickWithAuthor extends LickRecord {
  author: Author | null;
}
export interface UserProfile {
  id: string;
  handle: string | null;
  name: string | null;
  image: string | null;
}

export function makeLicksRepo(db: DB) {
  async function tagIds(names: string[]): Promise<string[]> {
    const ids: string[] = [];
    for (const name of names.map((n) => n.trim()).filter(Boolean)) {
      const existing = await db.select().from(tags).where(eq(tags.name, name)).limit(1);
      if (existing[0]) {
        ids.push(existing[0].id);
      } else {
        const id = nanoid();
        await db.insert(tags).values({ id, name });
        ids.push(id);
      }
    }
    return ids;
  }

  async function tagsFor(lickId: string): Promise<string[]> {
    const rows = await db
      .select({ name: tags.name })
      .from(lickTags)
      .innerJoin(tags, eq(lickTags.tagId, tags.id))
      .where(eq(lickTags.lickId, lickId));
    return rows.map((r) => r.name);
  }

  async function rowToRecord(row: typeof licks.$inferSelect): Promise<LickRecord> {
    return {
      id: row.id,
      ownerId: row.ownerId,
      hidden: !!row.hidden,
      visibility: row.visibility as Visibility,
      title: row.title,
      tuning: JSON.parse(row.tuning),
      tab: JSON.parse(row.tab),
      memo: row.memo,
      source: row.source,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      tags: await tagsFor(row.id),
    };
  }

  return {
    async create(input: LickInput, ownerId: string): Promise<string> {
      const id = nanoid();
      const now = Date.now();
      await db.insert(licks).values({
        id,
        ownerId,
        visibility: input.visibility,
        title: input.title,
        tuning: JSON.stringify(input.tuning),
        tab: JSON.stringify(input.tab),
        memo: input.memo,
        source: input.source,
        createdAt: now,
        updatedAt: now,
      });
      for (const tagId of await tagIds(input.tags)) {
        await db.insert(lickTags).values({ lickId: id, tagId });
      }
      return id;
    },

    async get(id: string): Promise<LickRecord | null> {
      const row = await db.select().from(licks).where(eq(licks.id, id)).limit(1);
      return row[0] ? rowToRecord(row[0]) : null;
    },

    async list(filter: ListFilter): Promise<LickRecord[]> {
      let ids: string[] | null = null;
      if (filter.tag) {
        const tagRow = await db.select().from(tags).where(eq(tags.name, filter.tag)).limit(1);
        if (!tagRow[0]) return [];
        const links = await db
          .select({ lickId: lickTags.lickId })
          .from(lickTags)
          .where(eq(lickTags.tagId, tagRow[0].id));
        ids = links.map((l) => l.lickId);
        if (ids.length === 0) return [];
      }
      const conditions = [];
      if (filter.ownerId) conditions.push(eq(licks.ownerId, filter.ownerId));
      if (ids) conditions.push(inArray(licks.id, ids));
      if (filter.q) conditions.push(like(licks.title, `%${filter.q}%`));
      const rows = await db
        .select()
        .from(licks)
        .where(conditions.length ? and(...conditions) : undefined);
      const records = await Promise.all(rows.map(rowToRecord));
      // 메모/태그까지 포함한 키워드 매칭(제목 LIKE 외 보강)
      const q = filter.q?.toLowerCase();
      const filtered = q
        ? records.filter(
            (r) =>
              r.title.toLowerCase().includes(q) ||
              r.memo.toLowerCase().includes(q) ||
              r.tags.some((t) => t.toLowerCase().includes(q)),
          )
        : records;
      return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
    },

    async update(id: string, input: LickInput): Promise<void> {
      await db
        .update(licks)
        .set({
          visibility: input.visibility,
          title: input.title,
          tuning: JSON.stringify(input.tuning),
          tab: JSON.stringify(input.tab),
          memo: input.memo,
          source: input.source,
          updatedAt: Date.now(),
        })
        .where(eq(licks.id, id));
      await db.delete(lickTags).where(eq(lickTags.lickId, id));
      for (const tagId of await tagIds(input.tags)) {
        await db.insert(lickTags).values({ lickId: id, tagId });
      }
    },

    async remove(id: string): Promise<void> {
      await db.delete(lickTags).where(eq(lickTags.lickId, id));
      await db.delete(licks).where(eq(licks.id, id));
    },

    /** 소유자 미지정 레거시 릭을 운영자 계정으로 일괄 귀속(1회성 마이그레이션). */
    async claimOrphans(ownerId: string): Promise<number> {
      const orphans = await db.select({ id: licks.id }).from(licks).where(isNull(licks.ownerId));
      if (orphans.length === 0) return 0;
      await db.update(licks).set({ ownerId }).where(isNull(licks.ownerId));
      return orphans.length;
    },

    /** 공개(public) 릭 피드. ownerId 지정 시 해당 사용자의 공개 릭만(프로필용). 최신순. */
    async listPublic(filter: { q?: string; tag?: string; ownerId?: string }): Promise<LickWithAuthor[]> {
      let ids: string[] | null = null;
      if (filter.tag) {
        const tagRow = await db.select().from(tags).where(eq(tags.name, filter.tag)).limit(1);
        if (!tagRow[0]) return [];
        const links = await db
          .select({ lickId: lickTags.lickId })
          .from(lickTags)
          .where(eq(lickTags.tagId, tagRow[0].id));
        ids = links.map((l) => l.lickId);
        if (ids.length === 0) return [];
      }
      const conditions = [eq(licks.visibility, "public"), eq(licks.hidden, 0)];
      if (filter.ownerId) conditions.push(eq(licks.ownerId, filter.ownerId));
      if (ids) conditions.push(inArray(licks.id, ids));
      if (filter.q) conditions.push(like(licks.title, `%${filter.q}%`));
      const rows = await db
        .select({
          lick: licks,
          handle: users.handle,
          name: users.name,
          image: users.image,
        })
        .from(licks)
        .leftJoin(users, eq(users.id, licks.ownerId))
        .where(and(...conditions));
      let records: LickWithAuthor[] = await Promise.all(
        rows.map(async (r) => ({
          ...(await rowToRecord(r.lick)),
          author: { handle: r.handle, name: r.name, image: r.image },
        })),
      );
      const q = filter.q?.toLowerCase();
      if (q) {
        records = records.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.memo.toLowerCase().includes(q) ||
            r.tags.some((t) => t.toLowerCase().includes(q)),
        );
      }
      return records.sort((a, b) => b.createdAt - a.createdAt);
    },

    async getUserByHandle(handle: string): Promise<UserProfile | null> {
      const rows = await db
        .select({ id: users.id, handle: users.handle, name: users.name, image: users.image })
        .from(users)
        .where(eq(users.handle, handle))
        .limit(1);
      return rows[0] ?? null;
    },

    async getAuthorById(id: string): Promise<Author | null> {
      const rows = await db
        .select({ handle: users.handle, name: users.name, image: users.image })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return rows[0] ?? null;
    },

    /** 공개 릭에 쓰인 태그(Explore 필터용). */
    async publicTags(): Promise<string[]> {
      const rows = await db
        .selectDistinct({ name: tags.name })
        .from(tags)
        .innerJoin(lickTags, eq(lickTags.tagId, tags.id))
        .innerJoin(licks, eq(lickTags.lickId, licks.id))
        .where(eq(licks.visibility, "public"));
      return rows.map((r) => r.name);
    },

    async allTags(ownerId?: string): Promise<string[]> {
      if (ownerId) {
        const rows = await db
          .selectDistinct({ name: tags.name })
          .from(tags)
          .innerJoin(lickTags, eq(lickTags.tagId, tags.id))
          .innerJoin(licks, eq(lickTags.lickId, licks.id))
          .where(eq(licks.ownerId, ownerId));
        return rows.map((r) => r.name);
      }
      const rows = await db.select({ name: tags.name }).from(tags);
      return rows.map((r) => r.name);
    },
  };
}

export const licksRepo = makeLicksRepo(defaultDb as unknown as DB);
