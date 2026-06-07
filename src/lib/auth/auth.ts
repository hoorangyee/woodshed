import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db/client";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";

const providers = [...authConfig.providers];

// Dev-only mock login: exposed only when AUTH_DEV_LOGIN=1 and not in production.
// Lets us verify ownership/visibility/onboarding end to end without OAuth credentials.
if (process.env.AUTH_DEV_LOGIN === "1" && process.env.NODE_ENV !== "production") {
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev Login",
      credentials: { name: { label: "Name", type: "text" } },
      async authorize(creds) {
        const name = String(creds?.name ?? "").trim() || "Dev User";
        const email = `${name.toLowerCase().replace(/\s+/g, "-")}@dev.local`;
        const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existing[0]) {
          return {
            id: existing[0].id,
            name: existing[0].name,
            email: existing[0].email,
            image: existing[0].image,
          };
        }
        const id = crypto.randomUUID();
        await db.insert(users).values({ id, name, email, createdAt: Date.now() });
        return { id, name, email };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers,
});
