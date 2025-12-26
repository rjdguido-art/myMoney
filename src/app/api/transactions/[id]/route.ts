import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  serializeTransaction,
  TransactionWithRelations,
  transactionInclude,
  transactionInputSchema,
} from "@/lib/transactions";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.transaction.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
  let updated: TransactionWithRelations | null = null;

  await prisma.$transaction(async (tx) => {
    await tx.transactionSplit.deleteMany({ where: { transactionId: id } });

    updated = await tx.transaction.update({
      where: { id },
      data: {
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
  });

  if (!updated) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ transaction: serializeTransaction(updated) });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.transaction.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.transaction.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
