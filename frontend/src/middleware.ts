import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Server-side route protection for admin pages.
 *
 * Reads the `adyapan-user` cookie (set by saveAuthSession) to determine the
 * user's role. Prevents non-admin users from loading admin page bundles and
 * redirects unauthenticated users to the login page.
 *
 * This is defense-in-depth — backend API endpoints still enforce RBAC via
 * requireAdminAuth + requireRole("ADMIN").
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect admin dashboard routes
  if (!pathname.startsWith("/dashboard/admin")) {
    return NextResponse.next();
  }

  // Allow the admin login page itself
  if (pathname === "/admin-login") {
    return NextResponse.next();
  }

  const token = request.cookies.get("adyapan-token")?.value;
  const userCookie = request.cookies.get("adyapan-user")?.value;

  // Not logged in → redirect to admin login
  if (!token || !userCookie) {
    const loginUrl = new URL("/admin-login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Parse role from cookie
  try {
    const user = JSON.parse(decodeURIComponent(userCookie));
    if (user.role !== "ADMIN") {
      // Non-admin user trying to access admin pages → redirect to user dashboard
      return NextResponse.redirect(new URL("/dashboard/user", request.url));
    }
  } catch {
    // Invalid cookie → redirect to admin login
    return NextResponse.redirect(new URL("/admin-login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/admin/:path*"],
};
