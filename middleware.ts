import { withAuth } from "next-auth/middleware";

const protectedRoutes = [
  "/dashboard",
  "/transactions",
  "/budgets",
  "/bills",
  "/insights",
  "/settings",
  "/onboarding",
];

export default withAuth({
  pages: { signIn: "/login" },
  callbacks: { authorized: ({ token }) => !!token },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/budgets/:path*",
    "/bills/:path*",
    "/insights/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
  ],
};
