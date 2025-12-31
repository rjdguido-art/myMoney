import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveCategoryRule } from "@/lib/rules";
import { transactionInclude, serializeTransaction } from "@/lib/transactions";

const importRowSchema = z.object({
  description: z.string().min(1),
  amount: z.number().finite(),
  postedAt: z.string().transform((value, ctx) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid date",
      });
    }
    return date;
  }),
  notes: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  accountName: z.string().optional().nullable(),
});

const importSchema = z.object({
  rows: z.array(importRowSchema).min(1),
  fallbackAccountId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = importSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { rows, fallbackAccountId } = parsed.data;

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });
  const accountByName = new Map(accounts.map((a) => [a.name.toLowerCase(), a.id]));

  const baseRows = rows.map((row) => {
    const accountId =
      row.accountId ??
      (row.accountName ? accountByName.get(row.accountName.toLowerCase()) : undefined) ??
      fallbackAccountId;
    if (!accountId) {
      return { row, error: `Account not found for row "${row.description}"` };
    }

    return { row, accountId };
  });

  const firstError = baseRows.find((row) => "error" in row);
  if (firstError && "error" in firstError) {
    return NextResponse.json({ error: firstError.error }, { status: 400 });
  }

  const resolvedRows = await Promise.all(
    baseRows.map(async ({ row, accountId }) => {
      const categoryId = await resolveCategoryRule({
        userId: session.user.id,
        description: row.description,
      });

      return { row, accountId, categoryId };
    }),
  );

  const data = resolvedRows.map(({ row, accountId, categoryId }) => ({
    userId: session.user.id,
    description: row.description,
    notes: row.notes ?? null,
    amount: row.amount,
    postedAt: row.postedAt,
    status: "CLEARED",
    accountId,
    categoryId,
  }));

  const results = await Promise.all(
    data.map((transaction) =>
      prisma.transaction.create({
        data: transaction,
        include: transactionInclude,
      }),
    ),
  );

  return NextResponse.json({
    imported: results.length,
    transactions: results.map(serializeTransaction),
  });
}
