import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { firebaseAdminAuth } from "./firebase-admin";

type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  locale: string;
  onboarded: boolean;
};

type Session = {
  user: SessionUser;
};

export const authHandler = () => {
  throw new Error("NextAuth is disabled. Firebase Auth is now in use.");
};

export async function auth(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("firebaseSession")?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await firebaseAdminAuth.verifySessionCookie(sessionCookie, true);
    const email = decoded.email?.toLowerCase();
    if (!email) return null;

    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, locale: true, onboarded: true, imageUrl: true },
    });

    if (!user) {
      const created = await prisma.user.create({
        data: {
          email,
          name: decoded.name ?? null,
          imageUrl: decoded.picture ?? null,
          onboarded: false,
        },
        select: { id: true, email: true, name: true, locale: true, onboarded: true },
      });
      user = created;
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        locale: user.locale ?? "en",
        onboarded: Boolean(user.onboarded),
      },
    };
  } catch {
    return null;
  }
}
