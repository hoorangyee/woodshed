# Licks — 기타 릭 TAB 라이브러리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기타 릭을 프렛 클릭 에디터로 입력하고 TAB로 저장·검색하는 개인용 Next.js 웹앱을 구현한다.

**Architecture:** Next.js(App Router) 한 덩어리. 읽기는 Server Component, 쓰기는 Server Action. Drizzle ORM + libSQL(개발=로컬 SQLite 파일, 운영=Turso). 단일 비밀번호 세션(JWT 쿠키) + middleware 보호. TAB는 구조화 JSON으로 저장하고 ASCII로 렌더.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Drizzle ORM 0.45 + @libsql/client 0.17, drizzle-kit 0.31, jose 6(JWT), nanoid 5, zod 4, Vitest 4 + @testing-library/react.

상세 설계: `docs/superpowers/specs/2026-06-07-licks-tab-library-design.md`

---

## File Structure

```
src/
  lib/
    tab/
      types.ts          # Note, Column, Articulation, Lick 타입
      serialize.ts      # toAscii(columns, tuning) — JSON → ASCII TAB
      editor-ops.ts     # 에디터 순수 조작 함수(칸 추가/삭제, 음표 set, 주법 토글)
    db/
      schema.ts         # Drizzle 테이블 정의 (licks, tags, lick_tags)
      client.ts         # libSQL 클라이언트 + drizzle 인스턴스
      licks.ts          # 데이터 접근(create/get/list/update/delete + 태그)
    auth/
      session.ts        # JWT 생성/검증 (jose)
    search.ts           # 검색/태그 필터 쿼리 빌더
  app/
    layout.tsx          # 루트 레이아웃
    globals.css         # Tailwind
    page.tsx            # 라이브러리(홈) — 목록 + 검색 + 태그 필터
    login/page.tsx      # 로그인
    licks/
      actions.ts        # Server Actions (create/update/delete/import)
      new/page.tsx      # 새 릭
      [id]/page.tsx     # 릭 상세
      [id]/edit/page.tsx# 릭 편집
  components/
    TabEditor.tsx       # 6줄 그리드 프렛 클릭 에디터 (client)
    TabView.tsx         # ASCII TAB 렌더 + 복사 버튼
    LickForm.tsx        # 에디터 + 메타 폼 (client)
    LickCard.tsx        # 목록 카드
    TagFilter.tsx       # 태그 칩 필터 (client)
  middleware.ts         # 인증 가드
drizzle/                # 마이그레이션 산출물
drizzle.config.ts
vitest.config.ts
.env.example
```

테스트는 소스 옆 `*.test.ts(x)`로 둔다 (Vitest 기본 글롭).

---

## Task 1: 프로젝트 스캐폴드

**Files:**
- Create: 프로젝트 전체 (create-next-app)
- Create: `.env.example`

- [ ] **Step 1: Next.js 앱 생성 (현재 디렉토리에)**

기존 git/docs를 보존하기 위해 임시 폴더에 생성 후 옮긴다.

Run:
```bash
cd /Users/parkminhoo/dev/licks
npx --yes create-next-app@16 _scaffold --ts --tailwind --app --eslint --src-dir --no-turbopack --import-alias "@/*" --use-npm
# 산출물을 루트로 이동 (docs/.git/.gitignore 보존)
rsync -a _scaffold/ ./ --exclude .git --exclude .gitignore
rm -rf _scaffold
```
Expected: `src/app/page.tsx`, `package.json`, `next.config.ts`, `tsconfig.json` 생성됨.

- [ ] **Step 2: 추가 의존성 설치**

Run:
```bash
npm install drizzle-orm @libsql/client jose nanoid zod
npm install -D drizzle-kit vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```
Expected: 설치 성공, `package.json` dependencies 갱신.

- [ ] **Step 3: Vitest 설정 작성**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

Run: `npm install -D @vitejs/plugin-react`

Create `vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: package.json 스크립트 추가**

`package.json`의 `scripts`에 추가:
```json
"test": "vitest run",
"test:watch": "vitest",
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate"
```

- [ ] **Step 5: .env.example 작성**

Create `.env.example`:
```
# 개발: 로컬 파일. 운영: libsql://<db>.turso.io
TURSO_DATABASE_URL=file:./local.db
TURSO_AUTH_TOKEN=
APP_PASSWORD=changeme
SESSION_SECRET=dev-secret-please-change-min-32-bytes-long
```

그리고 로컬 개발용 `.env` 생성(.gitignore에 이미 포함):
```bash
cp .env.example .env
```

- [ ] **Step 6: 빌드 확인 후 커밋**

Run: `npm run build`
Expected: 빌드 성공.

```bash
git add -A
git commit -m "chore: scaffold Next.js app with deps and test config"
```

---

## Task 2: TAB 타입 + ASCII 직렬화 (TDD, 순수 로직)

**Files:**
- Create: `src/lib/tab/types.ts`
- Create: `src/lib/tab/serialize.ts`
- Test: `src/lib/tab/serialize.test.ts`

- [ ] **Step 1: 타입 정의**

Create `src/lib/tab/types.ts`:
```ts
export type Articulation = "h" | "p" | "/" | "\\" | "b" | "~";
export const ARTICULATIONS: Articulation[] = ["h", "p", "/", "\\", "b", "~"];

export interface Note {
  string: number; // 0 = 저음 E ... 5 = 고음 e
  fret: number;   // 0..24
  artic?: Articulation;
}

export interface Column {
  notes: Note[];
}

export interface Lick {
  id: string;
  title: string;
  tuning: string[]; // 길이 6, index 0 = 저음
  tab: Column[];
  memo: string;
  source: string;
  createdAt: number;
  updatedAt: number;
}

export const STANDARD_TUNING: string[] = ["E", "A", "D", "G", "B", "e"];
export const STRING_COUNT = 6;
```

- [ ] **Step 2: 직렬화 실패 테스트 작성**

Create `src/lib/tab/serialize.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { toAscii, cellToken } from "./serialize";
import { STANDARD_TUNING, type Column } from "./types";

describe("cellToken", () => {
  it("renders fret number", () => {
    expect(cellToken({ string: 0, fret: 5 })).toBe("5");
  });
  it("appends articulation", () => {
    expect(cellToken({ string: 0, fret: 7, artic: "b" })).toBe("7b");
  });
});

describe("toAscii", () => {
  it("renders empty tab as six dashed lines with labels", () => {
    const out = toAscii([], STANDARD_TUNING);
    const lines = out.split("\n");
    expect(lines).toHaveLength(6);
    expect(lines[0].startsWith("e|")).toBe(true); // 고음이 맨 위
    expect(lines[5].startsWith("E|")).toBe(true);
  });

  it("places notes on the correct string and pads columns to equal width", () => {
    const tab: Column[] = [
      { notes: [{ string: 1, fret: 8, artic: "b" }] }, // B string, 2 chars wide
      { notes: [{ string: 2, fret: 7 }] },             // G string
    ];
    const out = toAscii(tab, STANDARD_TUNING);
    const lines = out.split("\n");
    // 줄 라벨: index 0=E(저음) → 맨아래, index5=e → 맨위. B는 위에서 두번째.
    const bLine = lines[1]; // B
    const gLine = lines[2]; // G
    expect(bLine).toContain("8b");
    expect(gLine).toContain("7");
    // 모든 줄 길이가 동일(칸 폭 정렬)
    const lens = new Set(lines.map((l) => l.length));
    expect(lens.size).toBe(1);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- serialize`
Expected: FAIL ("toAscii is not a function" 등).

- [ ] **Step 4: 직렬화 구현**

Create `src/lib/tab/serialize.ts`:
```ts
import { STRING_COUNT, type Column, type Note } from "./types";

/** 한 음표 셀을 토큰 문자열로 (예: "8b", "12"). */
export function cellToken(note: Note): string {
  return `${note.fret}${note.artic ?? ""}`;
}

/**
 * 구조화 TAB(Column[])을 ASCII 6줄 문자열로 변환한다.
 * 고음 줄(index 5)이 맨 위, 저음(index 0)이 맨 아래로 표시된다.
 * 각 칸은 그 칸에서 가장 넓은 토큰 폭에 맞춰 '-'로 패딩한다.
 */
export function toAscii(tab: Column[], tuning: string[]): string {
  // 칸별 폭 계산
  const widths = tab.map((col) => {
    let w = 1;
    for (const n of col.notes) w = Math.max(w, cellToken(n).length);
    return w;
  });

  const rows: string[] = [];
  for (let s = STRING_COUNT - 1; s >= 0; s--) {
    const label = (tuning[s] ?? "?").padStart(1, " ");
    let line = `${label}|`;
    tab.forEach((col, c) => {
      const note = col.notes.find((n) => n.string === s);
      const token = note ? cellToken(note) : "";
      const w = widths[c];
      // '-' 한 칸을 셀 앞에 두어 가독성 확보 후 폭 패딩
      line += "-" + token.padEnd(w, "-");
    });
    line += "-|";
    rows.push(line);
  }
  return rows.join("\n");
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- serialize`
Expected: PASS (모든 테스트).

- [ ] **Step 6: 커밋**

```bash
git add src/lib/tab/types.ts src/lib/tab/serialize.ts src/lib/tab/serialize.test.ts
git commit -m "feat: TAB types and ASCII serialization with round-trip tests"
```

---

## Task 3: 에디터 순수 조작 함수 (TDD)

**Files:**
- Create: `src/lib/tab/editor-ops.ts`
- Test: `src/lib/tab/editor-ops.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

Create `src/lib/tab/editor-ops.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { addColumn, removeColumn, setNote, clearNote, toggleArtic } from "./editor-ops";
import type { Column } from "./types";

const base: Column[] = [{ notes: [] }];

describe("addColumn / removeColumn", () => {
  it("adds an empty column at end", () => {
    expect(addColumn(base)).toHaveLength(2);
    expect(addColumn(base)[1].notes).toEqual([]);
  });
  it("removes the column at index", () => {
    const two: Column[] = [{ notes: [{ string: 0, fret: 1 }] }, { notes: [] }];
    expect(removeColumn(two, 0)).toHaveLength(1);
    expect(removeColumn(two, 0)[0].notes).toEqual([]);
  });
});

describe("setNote / clearNote", () => {
  it("sets a note on a string, replacing any existing note on that string", () => {
    let cols = setNote(base, 0, { string: 2, fret: 5 });
    expect(cols[0].notes).toEqual([{ string: 2, fret: 5 }]);
    cols = setNote(cols, 0, { string: 2, fret: 7 });
    expect(cols[0].notes).toEqual([{ string: 2, fret: 7 }]);
  });
  it("clears the note on a string", () => {
    const cols = setNote(base, 0, { string: 2, fret: 5 });
    expect(clearNote(cols, 0, 2)[0].notes).toEqual([]);
  });
});

describe("toggleArtic", () => {
  it("sets then unsets articulation on a note", () => {
    let cols = setNote(base, 0, { string: 2, fret: 5 });
    cols = toggleArtic(cols, 0, 2, "b");
    expect(cols[0].notes[0].artic).toBe("b");
    cols = toggleArtic(cols, 0, 2, "b");
    expect(cols[0].notes[0].artic).toBeUndefined();
  });
  it("replaces a different articulation", () => {
    let cols = setNote(base, 0, { string: 2, fret: 5, artic: "h" });
    cols = toggleArtic(cols, 0, 2, "b");
    expect(cols[0].notes[0].artic).toBe("b");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- editor-ops`
Expected: FAIL.

- [ ] **Step 3: 구현 (불변 업데이트)**

Create `src/lib/tab/editor-ops.ts`:
```ts
import type { Articulation, Column, Note } from "./types";

export function addColumn(cols: Column[]): Column[] {
  return [...cols, { notes: [] }];
}

export function removeColumn(cols: Column[], index: number): Column[] {
  return cols.filter((_, i) => i !== index);
}

export function setNote(cols: Column[], colIndex: number, note: Note): Column[] {
  return cols.map((col, i) => {
    if (i !== colIndex) return col;
    const others = col.notes.filter((n) => n.string !== note.string);
    return { notes: [...others, note].sort((a, b) => a.string - b.string) };
  });
}

export function clearNote(cols: Column[], colIndex: number, string: number): Column[] {
  return cols.map((col, i) =>
    i === colIndex ? { notes: col.notes.filter((n) => n.string !== string) } : col,
  );
}

export function toggleArtic(
  cols: Column[],
  colIndex: number,
  string: number,
  artic: Articulation,
): Column[] {
  return cols.map((col, i) => {
    if (i !== colIndex) return col;
    return {
      notes: col.notes.map((n) =>
        n.string === string ? { ...n, artic: n.artic === artic ? undefined : artic } : n,
      ),
    };
  });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- editor-ops`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/tab/editor-ops.ts src/lib/tab/editor-ops.test.ts
git commit -m "feat: pure editor operations for TAB columns"
```

---

## Task 4: DB 스키마 + 클라이언트 + 마이그레이션

**Files:**
- Create: `src/lib/db/schema.ts`
- Create: `src/lib/db/client.ts`
- Create: `drizzle.config.ts`

- [ ] **Step 1: 스키마 정의**

Create `src/lib/db/schema.ts`:
```ts
import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

export const licks = sqliteTable("licks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  tuning: text("tuning").notNull(),   // JSON string[]
  tab: text("tab").notNull(),         // JSON Column[]
  memo: text("memo").notNull().default(""),
  source: text("source").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const lickTags = sqliteTable(
  "lick_tags",
  {
    lickId: text("lick_id")
      .notNull()
      .references(() => licks.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.lickId, t.tagId] })],
);
```

- [ ] **Step 2: 클라이언트 정의**

Create `src/lib/db/client.ts`:
```ts
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:./local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
```

- [ ] **Step 3: drizzle 설정**

Create `drizzle.config.ts`:
```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? "file:./local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
```

- [ ] **Step 4: 마이그레이션 생성 및 적용**

Run:
```bash
npm run db:generate
npm run db:migrate
```
Expected: `drizzle/0000_*.sql` 생성, 로컬 `local.db`에 테이블 생성 성공.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/db drizzle.config.ts drizzle/
git commit -m "feat: drizzle schema, libsql client, initial migration"
```

---

## Task 5: 데이터 접근 계층 (TDD, 로컬 DB)

**Files:**
- Create: `src/lib/db/licks.ts`
- Test: `src/lib/db/licks.test.ts`

데이터 접근 함수는 실제 로컬 libSQL(`file::memory:`)로 검증한다.

- [ ] **Step 1: 실패 테스트 작성**

Create `src/lib/db/licks.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";
import { makeLicksRepo } from "./licks";

function freshDb() {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });
  return db;
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
  tab: [{ notes: [{ string: 1, fret: 8, artic: "b" as const }] }],
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- db/licks`
Expected: FAIL ("makeLicksRepo is not a function").

- [ ] **Step 3: 구현**

Create `src/lib/db/licks.ts`:
```ts
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

// nanoid는 비결정적이라 테스트에서 시드 불가 → id는 호출부에서 생성하지 않고 여기서만.
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- db/licks`
Expected: PASS (5개 테스트).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/db/licks.ts src/lib/db/licks.test.ts
git commit -m "feat: licks repository with tags, search, CRUD (tested on in-memory libsql)"
```

---

## Task 6: 세션/인증 (TDD + middleware)

**Files:**
- Create: `src/lib/auth/session.ts`
- Test: `src/lib/auth/session.test.ts`
- Create: `src/middleware.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/actions.ts`

- [ ] **Step 1: 세션 실패 테스트**

Create `src/lib/auth/session.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { createSessionToken, verifySessionToken } from "./session";

const secret = "test-secret-at-least-32-bytes-long-xxxxx";

describe("session token", () => {
  it("round-trips a valid token", async () => {
    const token = await createSessionToken(secret);
    expect(await verifySessionToken(token, secret)).toBe(true);
  });
  it("rejects a tampered token", async () => {
    const token = await createSessionToken(secret);
    expect(await verifySessionToken(token + "x", secret)).toBe(false);
  });
  it("rejects a token signed with another secret", async () => {
    const token = await createSessionToken(secret);
    expect(await verifySessionToken(token, "another-secret-32-bytes-xxxxxxxxxxx")).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- session`
Expected: FAIL.

- [ ] **Step 3: 세션 구현**

Create `src/lib/auth/session.ts`:
```ts
import { SignJWT, jwtVerify } from "jose";

const key = (secret: string) => new TextEncoder().encode(secret);

export async function createSessionToken(secret: string): Promise<string> {
  return new SignJWT({ sub: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key(secret));
}

export async function verifySessionToken(token: string, secret: string): Promise<boolean> {
  try {
    await jwtVerify(token, key(secret));
    return true;
  } catch {
    return false;
  }
}

export const SESSION_COOKIE = "licks_session";
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- session`
Expected: PASS.

- [ ] **Step 5: middleware 작성**

Create `src/middleware.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const ok = token
    ? await verifySessionToken(token, process.env.SESSION_SECRET ?? "")
    : false;
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // 로그인/정적자산/_next 제외 전부 보호
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 6: 로그인 액션 + 페이지**

Create `src/app/login/actions.ts`:
```ts
"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

export async function login(_prev: unknown, formData: FormData): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  if (password !== process.env.APP_PASSWORD) {
    return { error: "비밀번호가 올바르지 않습니다." };
  }
  const token = await createSessionToken(process.env.SESSION_SECRET ?? "");
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  redirect("/");
}
```

Create `src/app/login/page.tsx`:
```tsx
"use client";
import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <main className="min-h-screen grid place-items-center bg-neutral-950 text-neutral-100">
      <form action={action} className="w-72 space-y-4">
        <h1 className="text-xl font-semibold">Licks</h1>
        <input
          type="password"
          name="password"
          placeholder="비밀번호"
          autoFocus
          className="w-full rounded bg-neutral-800 px-3 py-2 outline-none"
        />
        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
        <button
          disabled={pending}
          className="w-full rounded bg-amber-500 px-3 py-2 font-medium text-neutral-900 disabled:opacity-50"
        >
          {pending ? "확인 중..." : "로그인"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 7: 빌드 + 커밋**

Run: `npm run build`
Expected: 빌드 성공.

```bash
git add src/lib/auth src/middleware.ts src/app/login
git commit -m "feat: single-password session auth with middleware guard"
```

---

## Task 7: TabView + TabEditor 컴포넌트 (TDD 컴포넌트)

**Files:**
- Create: `src/components/TabView.tsx`
- Create: `src/components/TabEditor.tsx`
- Test: `src/components/TabEditor.test.tsx`

- [ ] **Step 1: TabView 구현 (표시 전용)**

Create `src/components/TabView.tsx`:
```tsx
"use client";
import { useState } from "react";
import { toAscii } from "@/lib/tab/serialize";
import type { Column } from "@/lib/tab/types";

export function TabView({ tab, tuning }: { tab: Column[]; tuning: string[] }) {
  const [copied, setCopied] = useState(false);
  const ascii = toAscii(tab, tuning);
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded bg-neutral-900 p-3 font-mono text-sm leading-5 text-neutral-100">
        {ascii}
      </pre>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(ascii);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="absolute right-2 top-2 rounded bg-neutral-700 px-2 py-1 text-xs"
      >
        {copied ? "복사됨" : "복사"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: TabEditor 실패 테스트**

Create `src/components/TabEditor.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { TabEditor } from "./TabEditor";
import { STANDARD_TUNING, type Column } from "@/lib/tab/types";

function Harness() {
  const [tab, setTab] = useState<Column[]>([{ notes: [] }]);
  return <TabEditor tab={tab} tuning={STANDARD_TUNING} onChange={setTab} />;
}

describe("TabEditor", () => {
  it("adds a column when '+' is clicked", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    // 초기 1칸 → 셀 버튼 6개(6줄). + 누르면 12개.
    await user.click(screen.getByRole("button", { name: "칸 추가" }));
    const cells = screen.getAllByRole("button", { name: /string-\d-col-\d/ });
    expect(cells.length).toBe(12);
  });

  it("calls onChange when a fret is entered into a cell", async () => {
    const onChange = vi.fn();
    render(<TabEditor tab={[{ notes: [] }]} tuning={STANDARD_TUNING} onChange={onChange} />);
    const cell = screen.getByRole("button", { name: "string-2-col-0" });
    await userEvent.setup().click(cell);
    await userEvent.setup().keyboard("7");
    expect(onChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- TabEditor`
Expected: FAIL.

- [ ] **Step 4: TabEditor 구현**

Create `src/components/TabEditor.tsx`:
```tsx
"use client";
import { useState } from "react";
import { STRING_COUNT, ARTICULATIONS, type Column, type Articulation } from "@/lib/tab/types";
import {
  addColumn,
  removeColumn,
  setNote,
  clearNote,
  toggleArtic,
} from "@/lib/tab/editor-ops";
import { cellToken } from "@/lib/tab/serialize";

interface Props {
  tab: Column[];
  tuning: string[];
  onChange: (next: Column[]) => void;
}

export function TabEditor({ tab, tuning, onChange }: Props) {
  const [active, setActive] = useState<{ col: number; string: number } | null>(null);
  const [buffer, setBuffer] = useState("");

  function commitFret(col: number, string: number) {
    if (buffer === "") return;
    const fret = Math.min(24, Math.max(0, parseInt(buffer, 10)));
    onChange(setNote(tab, col, { string, fret }));
    setBuffer("");
  }

  function handleKey(e: React.KeyboardEvent, col: number, string: number) {
    if (/^[0-9]$/.test(e.key)) {
      const next = (buffer + e.key).slice(-2);
      setBuffer(next);
    } else if (e.key === "Enter" || e.key === " ") {
      commitFret(col, string);
    } else if (e.key === "Backspace" || e.key === "Delete") {
      onChange(clearNote(tab, col, string));
      setBuffer("");
    } else if (ARTICULATIONS.includes(e.key as Articulation)) {
      onChange(toggleArtic(tab, col, string, e.key as Articulation));
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-stretch gap-2 overflow-x-auto rounded bg-neutral-900 p-2 font-mono">
        <div className="flex flex-col justify-between py-1 text-neutral-400">
          {Array.from({ length: STRING_COUNT }, (_, i) => STRING_COUNT - 1 - i).map((s) => (
            <span key={s} className="h-7 leading-7">{tuning[s]}</span>
          ))}
        </div>
        {tab.map((col, c) => (
          <div key={c} className="flex flex-col gap-0">
            {Array.from({ length: STRING_COUNT }, (_, i) => STRING_COUNT - 1 - i).map((s) => {
              const note = col.notes.find((n) => n.string === s);
              const isActive = active?.col === c && active?.string === s;
              return (
                <button
                  key={s}
                  type="button"
                  aria-label={`string-${s}-col-${c}`}
                  onClick={() => {
                    setActive({ col: c, string: s });
                    setBuffer("");
                  }}
                  onKeyDown={(e) => handleKey(e, c, s)}
                  onBlur={() => commitFret(c, s)}
                  className={`h-7 w-8 text-center text-sm tabular-nums ${
                    isActive ? "bg-amber-500/30 ring-1 ring-amber-400" : "hover:bg-neutral-800"
                  }`}
                >
                  {note ? cellToken(note) : <span className="text-neutral-600">-</span>}
                </button>
              );
            })}
            <button
              type="button"
              aria-label={`칸 삭제 ${c}`}
              onClick={() => onChange(removeColumn(tab, c))}
              className="mt-1 text-xs text-neutral-500 hover:text-red-400"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          aria-label="칸 추가"
          onClick={() => onChange(addColumn(tab))}
          className="self-center rounded bg-neutral-700 px-2 py-1 text-lg"
        >
          +
        </button>
      </div>
      <p className="text-xs text-neutral-500">
        칸 클릭 후 숫자 입력(0–24). 주법: h p / \ b ~ · 삭제: Backspace
      </p>
    </div>
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- TabEditor`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/components/TabView.tsx src/components/TabEditor.tsx src/components/TabEditor.test.tsx
git commit -m "feat: TabView (ASCII + copy) and interactive TabEditor"
```

---

## Task 8: LickForm + Server Actions + 새/편집 페이지

**Files:**
- Create: `src/components/LickForm.tsx`
- Create: `src/app/licks/actions.ts`
- Create: `src/app/licks/new/page.tsx`
- Create: `src/app/licks/[id]/edit/page.tsx`

- [ ] **Step 1: Server Actions 작성**

Create `src/app/licks/actions.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { licksRepo, type LickInput } from "@/lib/db/licks";

const noteSchema = z.object({
  string: z.number().int().min(0).max(5),
  fret: z.number().int().min(0).max(24),
  artic: z.enum(["h", "p", "/", "\\", "b", "~"]).optional(),
});
const inputSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력하세요"),
  tuning: z.array(z.string()).length(6),
  tab: z.array(z.object({ notes: z.array(noteSchema) })),
  memo: z.string(),
  source: z.string(),
  tags: z.array(z.string()),
});

function parsePayload(formData: FormData): LickInput {
  const raw = JSON.parse(String(formData.get("payload") ?? "{}"));
  return inputSchema.parse(raw);
}

export async function createLick(formData: FormData) {
  const input = parsePayload(formData);
  const id = await licksRepo.create(input);
  revalidatePath("/");
  redirect(`/licks/${id}`);
}

export async function updateLick(id: string, formData: FormData) {
  const input = parsePayload(formData);
  await licksRepo.update(id, input);
  revalidatePath("/");
  revalidatePath(`/licks/${id}`);
  redirect(`/licks/${id}`);
}

export async function deleteLick(id: string) {
  await licksRepo.remove(id);
  revalidatePath("/");
  redirect("/");
}
```

- [ ] **Step 2: LickForm 구현 (client)**

Create `src/components/LickForm.tsx`:
```tsx
"use client";
import { useState } from "react";
import { TabEditor } from "./TabEditor";
import { TabView } from "./TabView";
import { STANDARD_TUNING, type Column } from "@/lib/tab/types";

const TUNINGS: Record<string, string[]> = {
  Standard: ["E", "A", "D", "G", "B", "e"],
  "Drop D": ["D", "A", "D", "G", "B", "e"],
};

export interface LickFormValue {
  title: string;
  tuning: string[];
  tab: Column[];
  memo: string;
  source: string;
  tags: string[];
}

interface Props {
  initial?: Partial<LickFormValue>;
  action: (formData: FormData) => void;
  submitLabel: string;
}

export function LickForm({ initial, action, submitLabel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [tuning, setTuning] = useState<string[]>(initial?.tuning ?? STANDARD_TUNING);
  const [tab, setTab] = useState<Column[]>(initial?.tab ?? [{ notes: [] }]);
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));

  function submit(formData: FormData) {
    const value: LickFormValue = {
      title,
      tuning,
      tab,
      memo,
      source,
      tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
    };
    formData.set("payload", JSON.stringify(value));
    action(formData);
  }

  const input = "w-full rounded bg-neutral-800 px-3 py-2 outline-none";
  return (
    <form action={submit} className="space-y-4">
      <input className={input} placeholder="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="flex items-center gap-2 text-sm">
        <label className="text-neutral-400">튜닝</label>
        <select
          className="rounded bg-neutral-800 px-2 py-1"
          value={Object.keys(TUNINGS).find((k) => TUNINGS[k].join() === tuning.join()) ?? "Standard"}
          onChange={(e) => setTuning(TUNINGS[e.target.value])}
        >
          {Object.keys(TUNINGS).map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </div>
      <TabEditor tab={tab} tuning={tuning} onChange={setTab} />
      <TabView tab={tab} tuning={tuning} />
      <input className={input} placeholder="태그 (쉼표로 구분)" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
      <input className={input} placeholder="출처 (곡명 / 링크)" value={source} onChange={(e) => setSource(e.target.value)} />
      <textarea className={input} placeholder="메모" rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} />
      <button className="rounded bg-amber-500 px-4 py-2 font-medium text-neutral-900">{submitLabel}</button>
    </form>
  );
}
```

- [ ] **Step 3: 새 릭 페이지**

Create `src/app/licks/new/page.tsx`:
```tsx
import { LickForm } from "@/components/LickForm";
import { createLick } from "../actions";

export default function NewLickPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-xl font-semibold">새 릭</h1>
      <LickForm action={createLick} submitLabel="저장" />
    </main>
  );
}
```

- [ ] **Step 4: 편집 페이지**

Create `src/app/licks/[id]/edit/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { LickForm } from "@/components/LickForm";
import { licksRepo } from "@/lib/db/licks";
import { updateLick } from "../../actions";

export default async function EditLickPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lick = await licksRepo.get(id);
  if (!lick) notFound();
  const action = updateLick.bind(null, id);
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-xl font-semibold">릭 편집</h1>
      <LickForm initial={lick} action={action} submitLabel="수정" />
    </main>
  );
}
```

- [ ] **Step 5: 빌드 + 커밋**

Run: `npm run build`
Expected: 빌드 성공.

```bash
git add src/components/LickForm.tsx src/app/licks
git commit -m "feat: lick create/edit forms wired to server actions"
```

---

## Task 9: 라이브러리(홈) + 상세 페이지

**Files:**
- Create: `src/components/LickCard.tsx`
- Create: `src/components/TagFilter.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/app/licks/[id]/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: LickCard**

Create `src/components/LickCard.tsx`:
```tsx
import Link from "next/link";
import { toAscii } from "@/lib/tab/serialize";
import type { LickRecord } from "@/lib/db/licks";

export function LickCard({ lick }: { lick: LickRecord }) {
  const preview = toAscii(lick.tab.slice(0, 8), lick.tuning);
  return (
    <Link
      href={`/licks/${lick.id}`}
      className="block rounded-lg border border-neutral-800 bg-neutral-900 p-4 hover:border-amber-500/50"
    >
      <h3 className="mb-2 font-medium">{lick.title}</h3>
      <pre className="mb-2 max-h-24 overflow-hidden font-mono text-xs text-neutral-400">{preview}</pre>
      <div className="flex flex-wrap gap-1">
        {lick.tags.map((t) => (
          <span key={t} className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-amber-300">
            #{t}
          </span>
        ))}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: TagFilter (client)**

Create `src/components/TagFilter.tsx`:
```tsx
"use client";
import { useRouter, useSearchParams } from "next/navigation";

export function TagFilter({ tags }: { tags: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("tag");
  function pick(tag: string | null) {
    const next = new URLSearchParams(params.toString());
    if (tag) next.set("tag", tag);
    else next.delete("tag");
    router.push(`/?${next.toString()}`);
  }
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => pick(null)}
        className={`rounded-full px-3 py-1 text-sm ${!active ? "bg-amber-500 text-neutral-900" : "bg-neutral-800"}`}
      >
        전체
      </button>
      {tags.map((t) => (
        <button
          key={t}
          onClick={() => pick(t)}
          className={`rounded-full px-3 py-1 text-sm ${active === t ? "bg-amber-500 text-neutral-900" : "bg-neutral-800"}`}
        >
          #{t}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 홈 페이지**

Replace `src/app/page.tsx`:
```tsx
import Link from "next/link";
import { licksRepo } from "@/lib/db/licks";
import { LickCard } from "@/components/LickCard";
import { TagFilter } from "@/components/TagFilter";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;
  const [licks, tags] = await Promise.all([
    licksRepo.list({ q, tag }),
    licksRepo.allTags(),
  ]);
  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Licks</h1>
        <Link href="/licks/new" className="rounded bg-amber-500 px-4 py-2 font-medium text-neutral-900">
          + 새 릭
        </Link>
      </div>
      <form className="mb-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="제목·메모·태그 검색"
          className="w-full rounded bg-neutral-800 px-3 py-2 outline-none"
        />
      </form>
      <div className="mb-6">
        <TagFilter tags={tags} />
      </div>
      {licks.length === 0 ? (
        <p className="text-neutral-500">아직 릭이 없습니다. 첫 릭을 추가해보세요.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {licks.map((l) => (
            <LickCard key={l.id} lick={l} />
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 4: 상세 페이지 (삭제 버튼 포함)**

Create `src/app/licks/[id]/page.tsx`:
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { licksRepo } from "@/lib/db/licks";
import { TabView } from "@/components/TabView";
import { deleteLick } from "../actions";

export default async function LickDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lick = await licksRepo.get(id);
  if (!lick) notFound();
  const del = deleteLick.bind(null, id);
  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{lick.title}</h1>
        <div className="flex gap-2">
          <Link href={`/licks/${id}/edit`} className="rounded bg-neutral-700 px-3 py-1 text-sm">편집</Link>
          <form action={del}>
            <button className="rounded bg-red-600 px-3 py-1 text-sm">삭제</button>
          </form>
        </div>
      </div>
      <TabView tab={lick.tab} tuning={lick.tuning} />
      {lick.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1">
          {lick.tags.map((t) => (
            <Link key={t} href={`/?tag=${encodeURIComponent(t)}`} className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-amber-300">#{t}</Link>
          ))}
        </div>
      )}
      {lick.source && (
        <p className="mt-4 text-sm text-neutral-400">출처: {lick.source}</p>
      )}
      {lick.memo && <p className="mt-2 whitespace-pre-wrap text-neutral-300">{lick.memo}</p>}
      <Link href="/" className="mt-6 inline-block text-sm text-neutral-500">← 목록</Link>
    </main>
  );
}
```

- [ ] **Step 5: 레이아웃 다듬기**

Replace `src/app/layout.tsx` body 클래스에 다크 배경 적용 (기존 파일 기준 `<body>`에 className 추가):
```tsx
// metadata title을 "Licks"로 바꾸고 body에 다음 클래스 적용
<body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
```

- [ ] **Step 6: 빌드 + 커밋**

Run: `npm run build`
Expected: 빌드 성공.

```bash
git add src/components/LickCard.tsx src/components/TagFilter.tsx src/app/page.tsx src/app/licks/\[id\]/page.tsx src/app/layout.tsx
git commit -m "feat: library home with search/tag filter and lick detail page"
```

---

## Task 10: JSON 내보내기/가져오기 + 수동 검증 + 배포 문서

**Files:**
- Create: `src/app/api/export/route.ts`
- Create: `src/app/licks/import/actions.ts`
- Modify: `src/app/page.tsx` (내보내기/가져오기 링크)
- Create: `README.md`

- [ ] **Step 1: 내보내기 라우트**

Create `src/app/api/export/route.ts`:
```ts
import { NextResponse } from "next/server";
import { licksRepo } from "@/lib/db/licks";

export async function GET() {
  const licks = await licksRepo.list({});
  return new NextResponse(JSON.stringify({ version: 1, licks }, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="licks-export.json"',
    },
  });
}
```

- [ ] **Step 2: 가져오기 액션**

Create `src/app/licks/import/actions.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { licksRepo, type LickInput } from "@/lib/db/licks";

export async function importLicks(formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file) redirect("/");
  const data = JSON.parse(await file.text()) as { licks: (LickInput & { id?: string })[] };
  for (const lick of data.licks ?? []) {
    await licksRepo.create({
      title: lick.title,
      tuning: lick.tuning,
      tab: lick.tab,
      memo: lick.memo ?? "",
      source: lick.source ?? "",
      tags: lick.tags ?? [],
    });
  }
  revalidatePath("/");
  redirect("/");
}
```

- [ ] **Step 3: 홈에 백업 UI 추가**

`src/app/page.tsx`의 헤더 `<div className="mb-6 flex ...">` 안, "+ 새 릭" 옆에 추가:
```tsx
import { importLicks } from "@/app/licks/import/actions";
// ...헤더 우측 영역에:
<div className="flex items-center gap-2">
  <a href="/api/export" className="rounded bg-neutral-800 px-3 py-2 text-sm">내보내기</a>
  <form action={importLicks} className="flex items-center">
    <input type="file" name="file" accept="application/json"
      className="w-32 text-xs file:mr-2 file:rounded file:border-0 file:bg-neutral-700 file:px-2 file:py-1" />
    <button className="rounded bg-neutral-800 px-3 py-2 text-sm">가져오기</button>
  </form>
  <Link href="/licks/new" className="rounded bg-amber-500 px-4 py-2 font-medium text-neutral-900">+ 새 릭</Link>
</div>
```
(기존 단독 "+ 새 릭" Link는 이 블록으로 대체)

- [ ] **Step 4: 전체 테스트 + 빌드**

Run: `npm test && npm run build`
Expected: 모든 테스트 PASS, 빌드 성공.

- [ ] **Step 5: 수동 검증 (dev 서버)**

Run: `npm run dev` 후 브라우저에서:
1. `/` 접근 → `/login`으로 리다이렉트 확인.
2. `APP_PASSWORD`로 로그인 → 홈 진입.
3. "새 릭" → 칸 클릭·숫자·주법 입력 → ASCII 미리보기 갱신 확인 → 저장.
4. 홈에서 카드·검색·태그 필터 동작 확인.
5. 상세 → 편집 → 수정 반영 확인. 삭제 확인.
6. "내보내기" JSON 다운로드 → "가져오기"로 복원 확인.

체크 후 dev 서버 종료.

- [ ] **Step 6: README + 배포 안내 작성**

Create `README.md`:
```markdown
# Licks — 기타 릭 TAB 라이브러리

개인용. 프렛 클릭 에디터로 릭을 입력하고 TAB로 저장·검색.

## 로컬 개발
1. `cp .env.example .env` 후 `APP_PASSWORD`, `SESSION_SECRET`(32바이트+) 설정
2. `npm install`
3. `npm run db:migrate`
4. `npm run dev`

## 배포 (Vercel + Turso)
1. Turso DB 생성:
   ```bash
   turso db create licks
   turso db show licks --url           # TURSO_DATABASE_URL
   turso db tokens create licks        # TURSO_AUTH_TOKEN
   ```
2. 스키마 적용: 로컬에서 위 URL/토큰을 환경변수로 두고 `npm run db:migrate`
3. Vercel 프로젝트 임포트 후 환경변수 등록:
   `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_PASSWORD`, `SESSION_SECRET`
4. 배포. 백업: `turso db dump licks` 또는 앱 내 "내보내기".
```

- [ ] **Step 7: 최종 커밋**

```bash
git add src/app/api src/app/licks/import src/app/page.tsx README.md
git commit -m "feat: JSON export/import and deployment docs"
```

---

## Self-Review 결과 (스펙 대비)

- 사용자/인증: Task 6 (단일 비밀번호 + middleware) ✅
- TAB 입력(프렛 클릭): Task 7 TabEditor ✅
- 음악 상세도(프렛+주법): Task 3 toggleArtic + Task 7 키 입력 ✅
- TAB 저장(JSON)·ASCII 렌더: Task 2 + Task 7 TabView ✅
- 태그/키워드 검색/메모·출처: Task 5 repo.list + Task 9 검색·필터 + Task 8 폼 ✅
- 스택(Next.js+Drizzle+libSQL): Task 1·4 ✅
- 배포(Vercel+Turso): Task 10 README ✅
- 백업(JSON·turso dump): Task 10 ✅
- 화면 4개(홈/상세/에디터/로그인): Task 6·8·9 ✅
- 테스트 전략(직렬화 왕복·태그 필터·에디터): Task 2·5·7 ✅
- 비범위 항목은 어떤 태스크에도 포함하지 않음 ✅
```
