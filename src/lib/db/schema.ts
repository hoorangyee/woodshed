import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";
import type { AdapterAccountType } from "next-auth/adapters";

/* ── Auth.js (next-auth) 표준 테이블 + 커스텀 handle ───────────── */
export const users = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
  // 커뮤니티용 고유 핸들(프로필 URL·작성자 표기). 최초 로그인 후 온보딩에서 설정.
  handle: text("handle").unique(),
  createdAt: integer("created_at"),
});

export const accounts = sqliteTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })],
);

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

/* ── 도메인 테이블 ─────────────────────────────────────────────── */
export const licks = sqliteTable(
  "licks",
  {
    id: text("id").primaryKey(),
    // 소유자(초기 nullable → 마이그레이션 후 채움). null = 레거시 미귀속.
    ownerId: text("owner_id").references(() => users.id, { onDelete: "cascade" }),
    // 공개 범위. 기본 private(의도치 않은 공개 방지).
    visibility: text("visibility").notNull().default("private"),
    title: text("title").notNull(),
    tuning: text("tuning").notNull(), // JSON string[]
    tab: text("tab").notNull(), // JSON Column[]
    memo: text("memo").notNull().default(""),
    source: text("source").notNull().default(""),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("licks_owner_idx").on(t.ownerId), index("licks_visibility_idx").on(t.visibility)],
);

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

/* ── 소셜(SP3): 좋아요 · 댓글 · 컬렉션 ─────────────────────────── */
export const likes = sqliteTable(
  "likes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lickId: text("lick_id")
      .notNull()
      .references(() => licks.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lickId] }), index("likes_lick_idx").on(t.lickId)],
);

export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    lickId: text("lick_id")
      .notNull()
      .references(() => licks.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("comments_lick_idx").on(t.lickId)],
);

export const collections = sqliteTable(
  "collections",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    visibility: text("visibility").notNull().default("private"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("collections_owner_idx").on(t.ownerId)],
);

export const collectionItems = sqliteTable(
  "collection_items",
  {
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    lickId: text("lick_id")
      .notNull()
      .references(() => licks.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    addedAt: integer("added_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.collectionId, t.lickId] }),
    index("collection_items_col_idx").on(t.collectionId),
  ],
);

export type Visibility = "public" | "unlisted" | "private";
