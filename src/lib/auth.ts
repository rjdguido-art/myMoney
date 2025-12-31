import NextAuth, { type NextAuthOptions, getServerSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import { prisma } from "./prisma";

const missingEnv = ["NEXTAUTH_SECRET", "DATABASE_URL"].filter(
  (key) => !process.env[key],
);
if (missingEnv.length) {
  console.error(
    `Missing required environment variables: ${missingEnv.join(", ")}`,
  );
}
if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_URL) {
  console.error("Missing NEXTAUTH_URL in production.");
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );

        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    session: async ({ session, token }) => {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.locale = token.locale ?? "en";
        session.user.onboarded = token.onboarded ?? false;
      }
      return session;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.sub = user.id;
      }
      if (token.sub) {
        const userRecord = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { locale: true, onboarded: true },
        });
        token.locale = userRecord?.locale ?? "en";
        token.onboarded = userRecord?.onboarded ?? false;
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const authHandler = NextAuth(authOptions);
export async function auth() {
  return getServerSession(authOptions);
}
