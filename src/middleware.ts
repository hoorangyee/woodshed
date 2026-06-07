import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = !!req.auth;

  // 개별 릭 보기(/licks/<id>)는 공개/unlisted 열람을 위해 비로그인 허용.
  // 단, /licks/new 와 .../edit 은 편집이므로 보호.
  const isLickView = /^\/licks\/[^/]+$/.test(pathname) && pathname !== "/licks/new";
  const isPublic =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/explore") ||
    pathname.startsWith("/u/") ||
    isLickView;

  if (!isAuthed && !isPublic) {
    const url = req.nextUrl.clone();
    // 비로그인 방문자는 루트 대신 공개 탐색 페이지로 안내
    url.pathname = pathname === "/" ? "/explore" : "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
