import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [accounts, categories] = await Promise.all([
    prisma.account.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, currency: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ accounts, categories });
}
