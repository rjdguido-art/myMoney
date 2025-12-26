import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query params", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const fromDate = parsed.data.from ? new Date(parsed.data.from) : undefined;
  const toDate = parsed.data.to ? new Date(parsed.data.to) : undefined;

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      postedAt: {
        gte: fromDate,
        lte: toDate,
      },
    },
    select: {
      description: true,
      amount: true,
      postedAt: true,
      notes: true,
      account: { select: { name: true } },
      category: { select: { name: true } },
    },
    orderBy: { postedAt: "asc" },
  });

  const header = [
    "date",
    "amount",
    "merchant",
    "note",
    "account",
    "category",
  ];
  const rows = transactions.map((tx) => [
    tx.postedAt.toISOString().slice(0, 10),
    Number(tx.amount).toFixed(2),
    tx.description ?? "",
    tx.notes ?? "",
    tx.account?.name ?? "",
    tx.category?.name ?? "",
  ]);

  const csv = [header, ...rows]
    .map((cols) =>
      cols
        .map((value) => {
          const safe = String(value ?? "");
          if (safe.includes(",") || safe.includes("\"")) {
            return `"${safe.replace(/"/g, '""')}"`;
          }
          return safe;
        })
        .join(","),
    )
    .join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=transactions.csv",
    },
  });
}
