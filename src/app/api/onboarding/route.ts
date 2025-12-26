import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BillStatus, CategoryType, Frequency } from "@prisma/client";

const billSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.number().min(0),
  dueDay: z.number().int().min(1).max(31),
  frequency: z.enum(["WEEKLY", "MONTHLY"]),
});

const debtSchema = z.object({
  name: z.string().trim().min(1),
  minimumPayment: z.number().min(0),
});

const budgetSchema = z.object({
  category: z.string().trim().min(1),
  amount: z.number().min(0),
});

const onboardingSchema = z.object({
  preferredLanguage: z.enum(["en", "es"]),
  currency: z.string().trim().min(1),
  payFrequency: z.enum(["WEEKLY", "BIWEEKLY", "SEMIMONTHLY", "MONTHLY"]),
  takeHomePay: z.number().min(0),
  bills: z.array(billSchema).optional(),
  savings: z
    .object({
      mode: z.enum(["amount", "percent"]),
      value: z.number().min(0),
    })
    .optional(),
  debts: z.array(debtSchema).optional(),
  budgets: z.array(budgetSchema).optional(),
});

function toDecimal(value: number | null | undefined) {
  if (value === undefined || value === null || Number.isNaN(value)) return 0;
  return Number(value);
}

function nextDueDate(dueDay: number) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(Math.max(dueDay, 1), lastDay);
  const candidate = new Date(year, month, day, 8, 0, 0, 0);
  if (candidate < now) {
    const nextMonthLastDay = new Date(year, month + 2, 0).getDate();
    const nextDay = Math.min(dueDay, nextMonthLastDay);
    return new Date(year, month + 1, nextDay, 8, 0, 0, 0);
  }
  return candidate;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboarded: true, currency: true, timezone: true, preferredLanguage: true },
  });

  return NextResponse.json({
    onboarded: user?.onboarded ?? false,
    currency: user?.currency ?? "USD",
    timezone: user?.timezone ?? "UTC",
    preferredLanguage: user?.preferredLanguage ?? "en",
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = onboardingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const userId = session.user.id;
  const {
    preferredLanguage,
    currency,
    payFrequency,
    takeHomePay,
    bills,
    savings,
    debts,
    budgets,
  } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { currency, preferredLanguage, onboarded: true },
    });

    await tx.paySchedule.deleteMany({ where: { userId } });
    await tx.paySchedule.create({
      data: {
        userId,
        name: "Primary Pay Schedule",
        cadence: payFrequency as Frequency,
        interval: 1,
        anchorDate: new Date(),
        nextPayDate: new Date(),
        netPay: toDecimal(takeHomePay),
      },
    });

    await tx.bill.deleteMany({ where: { userId } });
    if (bills?.length) {
      await tx.bill.createMany({
        data: bills.map((bill) => ({
          userId,
          name: bill.name,
          amount: toDecimal(bill.amount),
          currency,
          dueDate: nextDueDate(bill.dueDay),
          frequency: bill.frequency === "WEEKLY" ? Frequency.WEEKLY : Frequency.MONTHLY,
          status: BillStatus.SCHEDULED,
          autopay: false,
          reminderDays: 3,
        })),
      });
    }

    await tx.deduction.deleteMany({ where: { userId } });
    if (savings && savings.value > 0) {
      await tx.deduction.create({
        data: {
          userId,
          name: "Savings",
          amount: toDecimal(savings.value),
          isPercent: savings.mode === "percent",
        },
      });
    }

    await tx.debt.deleteMany({ where: { userId } });
    if (debts?.length) {
      await tx.debt.createMany({
        data: debts.map((debt) => ({
          userId,
          name: debt.name,
          principal: 0,
          interestRate: 0,
          minimumPayment: toDecimal(debt.minimumPayment),
        })),
      });
    }

    await tx.budgetItem.deleteMany({
      where: { budgetPlan: { userId } },
    });
    await tx.budgetPlan.deleteMany({ where: { userId } });

    if (budgets?.length) {
      const categories = await Promise.all(
        budgets.map((item) =>
          tx.category.upsert({
            where: { userId_name: { userId, name: item.category } },
            update: { type: CategoryType.EXPENSE },
            create: {
              userId,
              name: item.category,
              type: CategoryType.EXPENSE,
            },
          }),
        ),
      );

      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const budgetPlan = await tx.budgetPlan.create({
        data: {
          userId,
          name: "Starter Plan",
          periodStart,
          periodEnd,
        },
      });

      await tx.budgetItem.createMany({
        data: budgets.map((item) => {
          const category = categories.find((cat) => cat.name === item.category);
          return {
            budgetPlanId: budgetPlan.id,
            categoryId: category?.id,
            amount: toDecimal(item.amount),
            spent: 0,
          };
        }),
      });
    }
  });

  return NextResponse.json({ onboarded: true });
}
