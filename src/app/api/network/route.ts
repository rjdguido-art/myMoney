import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({
  identifier: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
  }

  const identifier = parsed.data.identifier;
  const friend = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: identifier, mode: "insensitive" } },
        { username: { equals: identifier, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });

  if (!friend) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (friend.id === session.user.id) {
    return NextResponse.json({ error: "You cannot add yourself" }, { status: 400 });
  }

  await prisma.friendship.createMany({
    data: [
      { userId: session.user.id, friendId: friend.id },
      { userId: friend.id, friendId: session.user.id },
    ],
    skipDuplicates: true,
  });

  return NextResponse.json({ ok: true });
}
