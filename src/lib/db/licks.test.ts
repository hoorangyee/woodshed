import { describe, it, expect, beforeEach } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { nanoid } from "nanoid";
import * as schema from "./schema";
import { users, licks } from "./schema";
import { makeLicksRepo } from "./licks";

let db: ReturnType<typeof drizzle>;
let repo: ReturnType<typeof makeLicksRepo>;
const A = "user-a";
const B = "user-b";

beforeEach(async () => {
  const client = createClient({ url: ":memory:" });
  db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  await db.insert(users).values([
    { id: A, name: "A", email: "a@example.com", handle: "alice" },
    { id: B, name: "B", email: "b@example.com", handle: "bob" },
  ]);
  repo = makeLicksRepo(db);
});

const sample = {
  title: "BB box bend",
  tuning: ["E", "A", "D", "G", "B", "e"],
  tab: [{ notes: [{ string: 4, fret: 8, artic: "b" as const }] }],
  memo: "from a video",
  source: "youtube.com/x",
  tags: ["blues", "bb-king"],
  visibility: "private" as const,
};

describe("licks repo", () => {
  it("creates and reads back with owner + visibility + tags", async () => {
    const id = await repo.create(sample, A);
    const got = await repo.get(id);
    expect(got?.ownerId).toBe(A);
    expect(got?.visibility).toBe("private");
    expect(got?.tab[0].notes[0].fret).toBe(8);
    expect(got?.tags.sort()).toEqual(["bb-king", "blues"]);
  });

  it("scopes list by owner", async () => {
    await repo.create(sample, A);
    await repo.create({ ...sample, title: "B's lick" }, B);
    const mine = await repo.list({ ownerId: A });
    expect(mine).toHaveLength(1);
    expect(mine[0].title).toBe("BB box bend");
    expect(await repo.list({})).toHaveLength(2);
  });

  it("filters by tag and keyword within an owner", async () => {
    await repo.create(sample, A);
    await repo.create({ ...sample, title: "Pentatonic run", tags: ["rock"] }, A);
    expect(await repo.list({ ownerId: A, tag: "rock" })).toHaveLength(1);
    expect((await repo.list({ ownerId: A, q: "pentatonic" }))[0].title).toBe("Pentatonic run");
  });

  it("updates a lick and replaces tags + visibility", async () => {
    const id = await repo.create(sample, A);
    await repo.update(id, { ...sample, title: "Updated", tags: ["jazz"], visibility: "public" });
    const got = await repo.get(id);
    expect(got?.title).toBe("Updated");
    expect(got?.visibility).toBe("public");
    expect(got?.tags).toEqual(["jazz"]);
  });

  it("deletes a lick", async () => {
    const id = await repo.create(sample, A);
    await repo.remove(id);
    expect(await repo.get(id)).toBeNull();
  });

  it("lists an owner's distinct tags", async () => {
    await repo.create(sample, A);
    await repo.create({ ...sample, tags: ["rock", "blues"] }, A);
    await repo.create({ ...sample, tags: ["solo"] }, B);
    expect((await repo.allTags(A)).sort()).toEqual(["bb-king", "blues", "rock"]);
  });

  it("listPublic returns only public licks with author, newest first", async () => {
    await repo.create({ ...sample, title: "A private" }, A); // private
    await repo.create({ ...sample, title: "A public", visibility: "public" }, A);
    await repo.create({ ...sample, title: "B public", visibility: "public" }, B);
    await repo.create({ ...sample, title: "A unlisted", visibility: "unlisted" }, A);

    const pub = await repo.listPublic({});
    expect(pub.map((l) => l.title).sort()).toEqual(["A public", "B public"]);
    const aPub = pub.find((l) => l.title === "A public");
    expect(aPub?.author?.handle).toBe("alice");
  });

  it("listPublic scopes to one owner (profile) and excludes non-public", async () => {
    await repo.create({ ...sample, title: "A public", visibility: "public" }, A);
    await repo.create({ ...sample, title: "A private" }, A);
    await repo.create({ ...sample, title: "B public", visibility: "public" }, B);
    const profile = await repo.listPublic({ ownerId: A });
    expect(profile.map((l) => l.title)).toEqual(["A public"]);
  });

  it("getUserByHandle resolves a profile", async () => {
    expect((await repo.getUserByHandle("alice"))?.id).toBe(A);
    expect(await repo.getUserByHandle("nope")).toBeNull();
  });

  it("publicTags lists tags used by public licks only", async () => {
    await repo.create({ ...sample, tags: ["secret"] }, A); // private
    await repo.create({ ...sample, tags: ["blues", "rock"], visibility: "public" }, A);
    expect((await repo.publicTags()).sort()).toEqual(["blues", "rock"]);
  });

  it("claims orphan (owner-less) licks for an owner", async () => {
    const id = nanoid();
    const now = Date.now();
    await db.insert(licks).values({
      id,
      ownerId: null,
      visibility: "private",
      title: "legacy",
      tuning: "[]",
      tab: "[]",
      memo: "",
      source: "",
      createdAt: now,
      updatedAt: now,
    });
    expect(await repo.claimOrphans(A)).toBe(1);
    expect((await repo.get(id))?.ownerId).toBe(A);
  });
});
