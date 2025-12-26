import type { Prisma } from "@prisma/client";
import { TransactionStatus } from "@prisma/client";
import { z } from "zod";

const moneySchema = z.preprocess((val) => {
  if (typeof val === "string") {
    const parsed = Number(val);
    return Number.isNaN(parsed) ? val : parsed;
  }
  return val;
}, z.number({ invalid_type_error: "Amount must be a number" }).finite());

const requiredDateSchema = z.preprocess((val) => {
  if (typeof val === "string" || val instanceof Date) {
    const date = new Date(val);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return val;
}, z.date({ required_error: "Date is required" }));

const optionalDateSchema = z.preprocess((val) => {
  if (!val) return undefined;
  if (typeof val === "string" || val instanceof Date) {
    const date = new Date(val);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  return val;
}, z.date().optional());

export const splitSchema = z.object({
  categoryId: z.string().min(1).optional().nullable(),
  amount: moneySchema,
  note: z.string().optional().nullable(),
});

export const transactionInputSchema = z
  .object({
    description: z.string().min(1, "Merchant is required"),
    notes: z.string().optional().nullable(),
    amount: moneySchema,
    postedAt: requiredDateSchema,
    status: z.nativeEnum(TransactionStatus).default(TransactionStatus.CLEARED),
    categoryId: z.string().min(1).optional().nullable(),
    accountId: z.string().min(1, "Account is required"),
    splits: z.array(splitSchema).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (!data.splits.length) return;
    const total = data.splits.reduce((sum, split) => sum + split.amount, 0);
    const delta = Math.abs(total - data.amount);
    if (delta > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["splits"],
        message: "Split amounts must sum to the transaction total",
      });
    }
  });

export const transactionFilterSchema = z.object({
  from: optionalDateSchema,
  to: optionalDateSchema,
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  search: z.string().optional(),
});

export const transactionInclude = {
  account: { select: { id: true, name: true } },
  category: { select: { id: true, name: true, type: true } },
  splits: {
    include: { category: { select: { id: true, name: true, type: true } } },
  },
} satisfies Prisma.TransactionInclude;

export type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: typeof transactionInclude;
}>;

export type SerializableTransaction = {
  id: string;
  description: string | null;
  notes: string | null;
  amount: number;
  currency: string;
  postedAt: string;
  status: TransactionStatus;
  account: { id: string; name: string };
  category: { id: string; name: string; type: string } | null;
  splits: Array<{
    id: string;
    amount: number;
    note: string | null;
    category: { id: string; name: string; type: string } | null;
  }>;
};

export function serializeTransaction(
  tx: TransactionWithRelations,
): SerializableTransaction {
  return {
    id: tx.id,
    description: tx.description ?? null,
    notes: tx.notes ?? null,
    amount: Number(tx.amount),
    currency: tx.currency,
    postedAt: tx.postedAt.toISOString(),
    status: tx.status,
    account: { ...tx.account },
    category: tx.category
      ? { id: tx.category.id, name: tx.category.name, type: tx.category.type }
      : null,
    splits: tx.splits.map((split) => ({
      id: split.id,
      amount: Number(split.amount),
      note: split.note ?? null,
      category: split.category
        ? {
            id: split.category.id,
            name: split.category.name,
            type: split.category.type,
          }
        : null,
    })),
  };
}

export function buildTransactionWhere(
  userId: string,
  filters: z.infer<typeof transactionFilterSchema>,
): Prisma.TransactionWhereInput {
  const clauses: Prisma.TransactionWhereInput[] = [{ userId }];

  if (filters.from || filters.to) {
    clauses.push({
      postedAt: {
        gte: filters.from ?? undefined,
        lte: filters.to ?? undefined,
      },
    });
  }

  if (filters.accountId) {
    clauses.push({ accountId: filters.accountId });
  }

  if (filters.categoryId) {
    clauses.push({
      OR: [
        { categoryId: filters.categoryId },
        { splits: { some: { categoryId: filters.categoryId } } },
      ],
    });
  }

  if (filters.search) {
    clauses.push({
      OR: [
        {
          description: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
        {
          notes: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  if (clauses.length === 1) return clauses[0];
  return { AND: clauses };
}
