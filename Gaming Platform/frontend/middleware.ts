import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const TOKEN_COOKIE = "gp_token";

const PROTECTED_PATHS = [
  "/",
  "/games",
  "/categories",
  "/leaderboard",
  "/profile",
  "/admin",
];
const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Route protection: unauthenticated users hitting protected routes are
 * redirected to /login. Authenticated users hitting auth pages are sent
 * to /games. Token presence is checked via the `gp_token` cookie set
 * by the client after a successful login.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has(TOKEN_COOKIE);

  const isProtected = isProtectedPath(pathname);
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (isProtected && !hasToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && hasToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/games";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/games/:path*",
    "/categories/:path*",
    "/leaderboard/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
