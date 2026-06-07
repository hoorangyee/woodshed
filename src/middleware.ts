import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = !!req.auth;

  // A single lick view (/licks/<id>) is allowed without login so public/unlisted licks are readable.
  // But /licks/new and .../edit are editing routes, so they stay protected.
  const isLickView = /^\/licks\/[^/]+$/.test(pathname) && pathname !== "/licks/new";
  const isPublic =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/explore") ||
    pathname.startsWith("/u/") ||
    isLickView;

  if (!isAuthed && !isPublic) {
    const url = req.nextUrl.clone();
    // Send logged-out visitors to the public explore page instead of the root.
    url.pathname = pathname === "/" ? "/explore" : "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
