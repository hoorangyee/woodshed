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
