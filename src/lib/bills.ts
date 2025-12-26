import { BillStatus, Frequency, type Prisma } from "@prisma/client";
import { z } from "zod";

const numeric = z.preprocess((val) => {
  if (typeof val === "string") {
    const parsed = Number(val);
    return Number.isNaN(parsed) ? val : parsed;
  }
  return val;
}, z.number({ invalid_type_error: "Amount must be a number" }).finite());

const requiredDate = z.preprocess((val) => {
  if (typeof val === "string" || val instanceof Date) {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return val;
}, z.date({ required_error: "Date is required" }));

export const billInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: numeric,
  currency: z.string().default("USD"),
  dueDate: requiredDate,
  frequency: z.nativeEnum(Frequency).default(Frequency.MONTHLY),
  status: z.nativeEnum(BillStatus).default(BillStatus.PENDING),
  autopay: z.boolean().optional().default(false),
  reminderDays: z.number().int().min(0).max(60).default(3),
  accountId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
});

export const billInclude = {
  account: { select: { id: true, name: true } },
  category: { select: { id: true, name: true, type: true } },
} satisfies Prisma.BillInclude;

export type BillWithRelations = Prisma.BillGetPayload<{ include: typeof billInclude }>;

export function serializeBill(bill: BillWithRelations) {
  return {
    id: bill.id,
    name: bill.name,
    amount: Number(bill.amount),
    currency: bill.currency,
    dueDate: bill.dueDate.toISOString(),
    frequency: bill.frequency,
    status: bill.status,
    autopay: bill.autopay,
    reminderDays: bill.reminderDays,
    account: bill.account ? { ...bill.account } : null,
    category: bill.category
      ? { id: bill.category.id, name: bill.category.name, type: bill.category.type }
      : null,
  };
}
