import { describe, it, expect, beforeEach } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";
import { makeLicksRepo } from "./licks";

function freshDb() {
  const client = createClient({ url: ":memory:" });
  return drizzle(client, { schema });
}

let repo: ReturnType<typeof makeLicksRepo>;

beforeEach(async () => {
  const db = freshDb();
  await migrate(db, { migrationsFolder: "./drizzle" });
  repo = makeLicksRepo(db);
});

const sample = {
  title: "BB box bend",
  tuning: ["E", "A", "D", "G", "B", "e"],
  tab: [{ notes: [{ string: 4, fret: 8, artic: "b" as const }] }],
  memo: "from a video",
  source: "youtube.com/x",
  tags: ["blues", "bb-king"],
};

describe("licks repo", () => {
  it("creates and reads back a lick with tags", async () => {
    const id = await repo.create(sample);
    const got = await repo.get(id);
    expect(got?.title).toBe("BB box bend");
    expect(got?.tab[0].notes[0].fret).toBe(8);
    expect(got?.tags.sort()).toEqual(["bb-king", "blues"]);
  });

  it("lists licks and filters by tag and keyword", async () => {
    await repo.create(sample);
    await repo.create({ ...sample, title: "Pentatonic run", tags: ["rock"] });
    expect(await repo.list({})).toHaveLength(2);
    expect(await repo.list({ tag: "rock" })).toHaveLength(1);
    expect((await repo.list({ q: "pentatonic" }))[0].title).toBe("Pentatonic run");
  });

  it("updates a lick and replaces its tags", async () => {
    const id = await repo.create(sample);
    await repo.update(id, { ...sample, title: "Updated", tags: ["jazz"] });
    const got = await repo.get(id);
    expect(got?.title).toBe("Updated");
    expect(got?.tags).toEqual(["jazz"]);
  });

  it("deletes a lick", async () => {
    const id = await repo.create(sample);
    await repo.remove(id);
    expect(await repo.get(id)).toBeNull();
  });

  it("lists all distinct tags", async () => {
    await repo.create(sample);
    await repo.create({ ...sample, tags: ["rock", "blues"] });
    expect((await repo.allTags()).sort()).toEqual(["bb-king", "blues", "rock"]);
  });
});
