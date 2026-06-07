import { defineConfig } from "drizzle-kit";

const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
// drizzle-kit의 turso 드라이버는 authToken 존재를 요구한다.
// 로컬 file: URL에서는 libSQL이 토큰을 무시하므로 자리표시자를 둔다.
const authToken = process.env.TURSO_AUTH_TOKEN || (url.startsWith("file:") ? "local" : "");

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: { url, authToken },
});
