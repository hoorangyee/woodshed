import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

/**
 * 엣지 안전(edge-safe) 설정. 미들웨어에서 JWT 검증에만 사용하며
 * DB 어댑터·Credentials는 포함하지 않는다(노드 전용 auth.ts에서 추가).
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [Google, GitHub],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
};
