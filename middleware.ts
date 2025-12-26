import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const protectedRoutes = [
  "/dashboard",
  "/transactions",
  "/budgets",
  "/bills",
  "/insights",
  "/settings",
  "/onboarding",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const requiresAuth = protectedRoutes.some((path) =>
    pathname.startsWith(path),
  );

  if (!req.auth && requiresAuth) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", req.nextUrl.href);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: protectedRoutes.map((path) => `${path}/:path*`),
};
