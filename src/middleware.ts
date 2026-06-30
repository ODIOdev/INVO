import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/admin-auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin/sign-in")) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const profile = await verifyAdminSessionToken(token);
    if (profile) {
      const from = request.nextUrl.searchParams.get("from");
      const destination =
        from && from.startsWith("/admin") && !from.startsWith("/admin/sign-in")
          ? from
          : "/admin";
      return NextResponse.redirect(new URL(destination, request.url));
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const profile = await verifyAdminSessionToken(token);

  if (!profile) {
    const signInUrl = new URL("/admin/sign-in", request.url);
    signInUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
