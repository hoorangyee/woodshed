import { describe, it, expect, beforeEach } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";
import { users } from "./schema";
import { makeLicksRepo } from "./licks";
import { makeSocialRepo } from "./social";
import { makeModerationRepo } from "./moderation";

let db: ReturnType<typeof drizzle>;
let licksRepo: ReturnType<typeof makeLicksRepo>;
let social: ReturnType<typeof makeSocialRepo>;
let mod: ReturnType<typeof makeModerationRepo>;
const A = "ua";
const B = "ub";

const sample = {
  title: "public lick",
  tuning: ["E", "A", "D", "G", "B", "e"],
  tab: [{ notes: [{ string: 4, fret: 8 }] }],
  memo: "",
  source: "",
  tags: [] as string[],
  visibility: "public" as const,
};

beforeEach(async () => {
  const client = createClient({ url: ":memory:" });
  db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  await db.insert(users).values([
    { id: A, name: "A", email: "a@x", handle: "alice" },
    { id: B, name: "B", email: "b@x", handle: "bob" },
  ]);
  licksRepo = makeLicksRepo(db);
  social = makeSocialRepo(db);
  mod = makeModerationRepo(db);
});

describe("reports", () => {
  it("creates, lists open with reporter, and transitions status", async () => {
    const lickId = await licksRepo.create(sample, A);
    await mod.createReport({ targetType: "lick", targetId: lickId, reporterId: B, reason: "Spam" });
    const open = await mod.listReports("open");
    expect(open).toHaveLength(1);
    expect(open[0].reporterHandle).toBe("bob");
    expect(await mod.countOpenReports()).toBe(1);

    await mod.setReportStatus(open[0].id, "resolved");
    expect(await mod.listReports("open")).toHaveLength(0);
    expect(await mod.listReports("resolved")).toHaveLength(1);
  });

  it("detects an existing open report (dedup)", async () => {
    const lickId = await licksRepo.create(sample, A);
    await mod.createReport({ targetType: "lick", targetId: lickId, reporterId: B, reason: "Spam" });
    expect(await mod.hasOpenReport(B, "lick", lickId)).toBe(true);
    expect(await mod.hasOpenReport(A, "lick", lickId)).toBe(false);
  });
});

describe("hiding", () => {
  it("hides a lick → excluded from public feed; unhide restores", async () => {
    const lickId = await licksRepo.create(sample, A);
    expect(await licksRepo.listPublic({})).toHaveLength(1);

    await mod.hideLick(lickId, true);
    expect(await licksRepo.listPublic({})).toHaveLength(0);
    const info = await mod.getTargetInfo("lick", lickId);
    expect(info?.hidden).toBe(true);
    expect(info?.href).toBe(`/licks/${lickId}`);

    await mod.hideLick(lickId, false);
    expect(await licksRepo.listPublic({})).toHaveLength(1);
  });

  it("hides a comment → excluded from comment list", async () => {
    const lickId = await licksRepo.create(sample, A);
    const cid = await social.comments.add(lickId, B, "rude words");
    expect(await social.comments.list(lickId)).toHaveLength(1);
    await mod.hideComment(cid, true);
    expect(await social.comments.list(lickId)).toHaveLength(0);
    const info = await mod.getTargetInfo("comment", cid);
    expect(info?.label).toContain("rude");
  });
});

describe("comment rate limiting", () => {
  it("counts recent comments by a user", async () => {
    const lickId = await licksRepo.create(sample, A);
    await social.comments.add(lickId, B, "one");
    await social.comments.add(lickId, B, "two");
    expect(await social.comments.recentCountByUser(B, Date.now() - 60_000)).toBe(2);
    expect(await social.comments.recentCountByUser(B, Date.now() + 1000)).toBe(0);
  });
});
