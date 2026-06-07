import { defineConfig } from "drizzle-kit";

const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
// drizzle-kit's turso driver requires an authToken to be present.
// libSQL ignores the token for local file: URLs, so use a placeholder.
const authToken = process.env.TURSO_AUTH_TOKEN || (url.startsWith("file:") ? "local" : "");

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: { url, authToken },
});
