import { and, eq, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { drizzle } from "drizzle-orm/libsql";
import { reports, licks, comments, users } from "./schema";
import { db as defaultDb } from "./client";

type DB = ReturnType<typeof drizzle>;

export type TargetType = "lick" | "comment";

export interface ReportRow {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  createdAt: number;
  reporterHandle: string | null;
}

export function makeModerationRepo(db: DB) {
  return {
    async createReport(input: {
      targetType: TargetType;
      targetId: string;
      reporterId: string;
      reason: string;
    }): Promise<void> {
      await db.insert(reports).values({
        id: nanoid(),
        targetType: input.targetType,
        targetId: input.targetId,
        reporterId: input.reporterId,
        reason: input.reason,
        status: "open",
        createdAt: Date.now(),
      });
    },

    /** Whether this user already has an open report on this target (dedup). */
    async hasOpenReport(
      reporterId: string,
      targetType: TargetType,
      targetId: string,
    ): Promise<boolean> {
      const rows = await db
        .select({ id: reports.id })
        .from(reports)
        .where(
          and(
            eq(reports.reporterId, reporterId),
            eq(reports.targetType, targetType),
            eq(reports.targetId, targetId),
            eq(reports.status, "open"),
          ),
        )
        .limit(1);
      return rows.length > 0;
    },

    async listReports(status: string = "open"): Promise<ReportRow[]> {
      return db
        .select({
          id: reports.id,
          targetType: reports.targetType,
          targetId: reports.targetId,
          reason: reports.reason,
          status: reports.status,
          createdAt: reports.createdAt,
          reporterHandle: users.handle,
        })
        .from(reports)
        .leftJoin(users, eq(users.id, reports.reporterId))
        .where(eq(reports.status, status))
        .orderBy(desc(reports.createdAt));
    },

    async countOpenReports(): Promise<number> {
      const rows = await db
        .select({ c: sql<number>`count(*)` })
        .from(reports)
        .where(eq(reports.status, "open"));
      return Number(rows[0]?.c ?? 0);
    },

    async setReportStatus(id: string, status: "resolved" | "dismissed" | "open"): Promise<void> {
      await db.update(reports).set({ status }).where(eq(reports.id, id));
    },

    async hideLick(id: string, hidden: boolean): Promise<void> {
      await db.update(licks).set({ hidden: hidden ? 1 : 0 }).where(eq(licks.id, id));
    },

    async hideComment(id: string, hidden: boolean): Promise<void> {
      await db.update(comments).set({ hidden: hidden ? 1 : 0 }).where(eq(comments.id, id));
    },

    /** Display info for a report target (label/hidden/href). null if deleted. */
    async getTargetInfo(
      targetType: TargetType,
      targetId: string,
    ): Promise<{ label: string; hidden: boolean; href: string } | null> {
      if (targetType === "lick") {
        const rows = await db
          .select({ title: licks.title, hidden: licks.hidden })
          .from(licks)
          .where(eq(licks.id, targetId))
          .limit(1);
        if (!rows[0]) return null;
        return { label: rows[0].title, hidden: !!rows[0].hidden, href: `/licks/${targetId}` };
      }
      const rows = await db
        .select({ body: comments.body, hidden: comments.hidden, lickId: comments.lickId })
        .from(comments)
        .where(eq(comments.id, targetId))
        .limit(1);
      if (!rows[0]) return null;
      const body = rows[0].body;
      return {
        label: body.length > 80 ? `${body.slice(0, 80)}…` : body,
        hidden: !!rows[0].hidden,
        href: `/licks/${rows[0].lickId}`,
      };
    },
  };
}

export const moderationRepo = makeModerationRepo(defaultDb as unknown as DB);
