import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

export const licks = sqliteTable("licks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  tuning: text("tuning").notNull(), // JSON string[]
  tab: text("tab").notNull(), // JSON Column[]
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
