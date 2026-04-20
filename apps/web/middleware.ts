import { NextResponse, type NextRequest } from "next/server";

import { AUTH_COOKIE_NAME, canAccessAdmin, verifySessionToken } from "./lib/auth";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const payload = await verifySessionToken(token);

    if (isAdminRoute && !canAccessAdmin(payload.role)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"]
};
