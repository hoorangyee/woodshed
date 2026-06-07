import { and, eq, like, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { drizzle } from "drizzle-orm/libsql";
import { licks, tags, lickTags } from "./schema";
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
}

export interface LickRecord extends LickInput {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export interface ListFilter {
  q?: string;
  tag?: string;
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
    async create(input: LickInput): Promise<string> {
      const id = nanoid();
      const now = Date.now();
      await db.insert(licks).values({
        id,
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

    async allTags(): Promise<string[]> {
      const rows = await db.select({ name: tags.name }).from(tags);
      return rows.map((r) => r.name);
    },
  };
}

export const licksRepo = makeLicksRepo(defaultDb as unknown as DB);
