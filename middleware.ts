import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPrefixes = [
  "/dashboard",
  "/transactions",
  "/budgets",
  "/bills",
  "/guide",
  "/setup-complete",
  "/insights",
  "/settings",
  "/onboarding",
  "/welcome",
];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (token) {
    const isOnboardingRoute =
      pathname === "/welcome" ||
      pathname.startsWith("/welcome/") ||
      pathname === "/guide" ||
      pathname.startsWith("/guide/") ||
      pathname === "/onboarding" ||
      pathname.startsWith("/onboarding/");

    if (isOnboardingRoute) {
      return NextResponse.next();
    }

    if (!token.onboarded) {
      const welcomeUrl = request.nextUrl.clone();
      welcomeUrl.pathname = "/welcome";
      welcomeUrl.search = "";
      return NextResponse.redirect(welcomeUrl);
    }

    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/budgets/:path*",
    "/bills/:path*",
    "/guide/:path*",
    "/setup-complete/:path*",
    "/insights/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/welcome/:path*",
  ],
};
