import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type OnboardingUser = {
  id: string;
  name: string | null;
  username: string | null;
  imageUrl: string | null;
  email: string;
  currency: string;
  timezone: string;
  preferredLanguage: string;
  onboarded: boolean;
  locale: string;
};

export async function requireOnboardedUser(): Promise<OnboardingUser> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      username: true,
      imageUrl: true,
      email: true,
      currency: true,
      timezone: true,
      preferredLanguage: true,
      onboarded: true,
      locale: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (!user.onboarded) {
    redirect("/welcome");
  }

  return user;
}

export async function requireNotOnboardedUser(): Promise<OnboardingUser> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      username: true,
      imageUrl: true,
      email: true,
      currency: true,
      timezone: true,
      preferredLanguage: true,
      onboarded: true,
      locale: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (user.onboarded) {
    redirect("/dashboard");
  }

  return user;
}
