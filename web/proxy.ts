import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

const authOnlyRoutes = ["/dashboard"];

export default auth((req: NextRequest & { auth: unknown }) => {
  const { nextUrl } = req;
  const session = (req as { auth?: { sessionExpired?: boolean } }).auth;
  const isLoggedIn = Boolean(session);
  const sessionExpired = Boolean(session?.sessionExpired);
  const path = nextUrl.pathname;

  const isPublic = publicRoutes.some((route) => path === route);
  const isProtected = authOnlyRoutes.some((route) => path === route || path.startsWith(`${route}/`));

  if (isLoggedIn && !sessionExpired && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if ((!isLoggedIn || sessionExpired) && isProtected) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)",
  ],
};
