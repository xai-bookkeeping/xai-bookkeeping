import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAuthPage = createRouteMatcher([
  "/accept-invite(.*)",
  "/forgot-password(.*)",
  "/login(.*)",
  "/register(.*)",
  "/reset-password(.*)",
  "/sso-callback(.*)",
  "/verify-email(.*)",
]);

const isProtectedPage = createRouteMatcher([
  "/accounting(.*)",
  "/administration(.*)",
  "/audit(.*)",
  "/company(.*)",
  "/customers(.*)",
  "/dashboard(.*)",
  "/expenses(.*)",
  "/invoices(.*)",
  "/onboarding(.*)",
  "/payments(.*)",
  "/reports(.*)",
  "/settings(.*)",
  "/suppliers(.*)",
  "/users(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const authState = await auth();

  if (authState.isAuthenticated && isAuthPage(req)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isProtectedPage(req)) {
    await auth.protect({ unauthenticatedUrl: new URL("/login", req.url).toString() });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
