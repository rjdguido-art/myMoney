import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const localeSchema = z.object({
  locale: z.enum(["en", "es"]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = localeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      locale: parsed.data.locale,
      preferredLanguage: parsed.data.locale,
    },
  });

  return NextResponse.json({ ok: true });
}
