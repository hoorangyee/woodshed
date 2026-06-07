import { describe, it, expect, beforeEach } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";
import { users, licks } from "./schema";
import { makeSocialRepo } from "./social";

let db: ReturnType<typeof drizzle>;
let repo: ReturnType<typeof makeSocialRepo>;
const A = "ua";
const B = "ub";
const L = "lick1";
const L2 = "lick2";

beforeEach(async () => {
  const client = createClient({ url: ":memory:" });
  db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  await db.insert(users).values([
    { id: A, name: "A", email: "a@x", handle: "alice" },
    { id: B, name: "B", email: "b@x", handle: "bob" },
  ]);
  const now = Date.now();
  for (const id of [L, L2]) {
    await db.insert(licks).values({
      id,
      ownerId: A,
      visibility: "public",
      title: id,
      tuning: "[]",
      tab: "[]",
      memo: "",
      source: "",
      createdAt: now,
      updatedAt: now,
    });
  }
  repo = makeSocialRepo(db);
});

describe("likes", () => {
  it("toggles like on and off and counts", async () => {
    expect(await repo.likes.count(L)).toBe(0);
    expect(await repo.likes.toggle(B, L)).toBe(true);
    expect(await repo.likes.count(L)).toBe(1);
    expect(await repo.likes.isLiked(B, L)).toBe(true);
    expect(await repo.likes.toggle(B, L)).toBe(false);
    expect(await repo.likes.count(L)).toBe(0);
  });
});

describe("comments", () => {
  it("adds, lists with author, and removes", async () => {
    const id = await repo.comments.add(L, B, "nice");
    const list = await repo.comments.list(L);
    expect(list).toHaveLength(1);
    expect(list[0].body).toBe("nice");
    expect(list[0].authorHandle).toBe("bob");
    await repo.comments.remove(id);
    expect(await repo.comments.list(L)).toHaveLength(0);
  });

  it("counts comments per lick (batch)", async () => {
    await repo.comments.add(L, A, "a");
    await repo.comments.add(L, B, "b");
    await repo.comments.add(L2, A, "c");
    const counts = await repo.comments.countsFor([L, L2]);
    expect(counts[L]).toBe(2);
    expect(counts[L2]).toBe(1);
  });
});

describe("collections", () => {
  it("creates, adds/removes licks in order, and reports membership", async () => {
    const cid = await repo.collections.create(A, { title: "Faves", visibility: "public" });
    expect((await repo.collections.get(cid))?.itemCount).toBe(0);

    await repo.collections.addLick(cid, L);
    await repo.collections.addLick(cid, L2);
    await repo.collections.addLick(cid, L); // duplicate ignored
    expect(await repo.collections.itemLickIds(cid)).toEqual([L, L2]);
    expect((await repo.collections.get(cid))?.itemCount).toBe(2);
    expect(await repo.collections.collectionIdsContaining(A, L)).toContain(cid);

    await repo.collections.removeLick(cid, L);
    expect(await repo.collections.itemLickIds(cid)).toEqual([L2]);

    const list = await repo.collections.listByOwner(A);
    expect(list).toHaveLength(1);
    expect(list[0].itemCount).toBe(1);

    await repo.collections.remove(cid);
    expect(await repo.collections.get(cid)).toBeNull();
  });

  it("lists only public collections when publicOnly", async () => {
    await repo.collections.create(A, { title: "Pub", visibility: "public" });
    await repo.collections.create(A, { title: "Priv", visibility: "private" });
    expect(await repo.collections.listByOwner(A, { publicOnly: true })).toHaveLength(1);
    expect(await repo.collections.listByOwner(A)).toHaveLength(2);
  });
});
