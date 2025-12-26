import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildTransactionWhere,
  serializeTransaction,
  transactionFilterSchema,
  transactionInclude,
  transactionInputSchema,
} from "@/lib/transactions";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const parsedFilters = transactionFilterSchema.safeParse({
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    categoryId: searchParams.get("categoryId") || undefined,
    accountId: searchParams.get("accountId") || undefined,
    search: (searchParams.get("search") || "").trim() || undefined,
  });

  if (!parsedFilters.success) {
    return NextResponse.json(
      { error: "Invalid filters", details: parsedFilters.error.flatten() },
      { status: 400 },
    );
  }

  const where = buildTransactionWhere(session.user.id, parsedFilters.data);

  const [transactions, accounts, categories] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: transactionInclude,
      orderBy: { postedAt: "desc" },
      take: 100,
    }),
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

  return NextResponse.json({
    transactions: transactions.map(serializeTransaction),
    accounts,
    categories,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = transactionInputSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const transaction = await prisma.transaction.create({
    data: {
      userId: session.user.id,
      description: data.description,
      notes: data.notes ?? null,
      amount: data.amount,
      postedAt: data.postedAt,
      status: data.status,
      accountId: data.accountId,
      categoryId: data.categoryId ?? null,
      splits: data.splits.length
        ? {
            create: data.splits.map((split) => ({
              amount: split.amount,
              categoryId: split.categoryId ?? null,
              note: split.note ?? null,
            })),
          }
        : undefined,
    },
    include: transactionInclude,
  });

  return NextResponse.json(
    { transaction: serializeTransaction(transaction) },
    { status: 201 },
  );
}
