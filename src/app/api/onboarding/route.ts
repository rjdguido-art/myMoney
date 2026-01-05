import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BillStatus, CategoryType, Frequency } from "@prisma/client";

const deductionSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.number().min(0),
});

const billSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.number().min(0),
  dueDay: z.number().int().min(1).max(31),
  frequency: z.enum(["WEEKLY", "MONTHLY"]),
});

const budgetSchema = z.object({
  category: z.string().trim().min(1),
  amount: z.number().min(0),
});

const goalSchema = z.object({
  name: z.string().trim().min(1),
  targetAmount: z.number().min(0),
});

const debtSchema = z.object({
  name: z.string().trim().min(1),
  minimumPayment: z.number().min(0),
});

const onboardingSchema = z.object({
  preferredLanguage: z.enum(["en", "es"]),
  currency: z.string().trim().min(1),
  timezone: z.string().trim().min(1),
  payFrequency: z.enum(["WEEKLY", "BIWEEKLY", "SEMIMONTHLY", "MONTHLY"]),
  payDate: z.string().trim().min(1),
  takeHomePay: z.number().min(0),
  deductions: z.array(deductionSchema).optional(),
  bills: z.array(billSchema).optional(),
  budgets: z.array(budgetSchema).min(1),
  savingsGoals: z.array(goalSchema).optional(),
  debts: z.array(debtSchema).optional(),
});

function toDecimal(value: number | null | undefined) {
  if (value === undefined || value === null || Number.isNaN(value)) return 0;
  return Number(value);
}

function toPayDate(value: string) {
  const date = new Date(`${value}T08:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid pay date");
  }
  return date;
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
    timezone,
    payFrequency,
    payDate,
    takeHomePay,
    deductions,
    bills,
    budgets,
    savingsGoals,
    debts,
  } = parsed.data;

  let payAnchorDate: Date;
  try {
    payAnchorDate = toPayDate(payDate);
  } catch {
    return NextResponse.json({ error: "Invalid pay date" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        currency,
        preferredLanguage,
        locale: preferredLanguage,
        timezone,
        onboarded: true,
      },
    });

    const accountCount = await tx.account.count({ where: { userId } });
    if (accountCount === 0) {
      await tx.account.create({
        data: {
          userId,
          name: "Primary Checking",
          type: "CHECKING",
          institution: null,
          balance: 0,
          currency,
        },
      });
    }

    await tx.bill.deleteMany({ where: { userId } });
    await tx.recurringRule.deleteMany({ where: { userId } });
    await tx.paySchedule.deleteMany({ where: { userId } });
    await tx.debt.deleteMany({ where: { userId } });
    await tx.goal.deleteMany({ where: { userId } });
    await tx.budgetItem.deleteMany({ where: { budgetPlan: { userId } } });
    await tx.budgetPlan.deleteMany({ where: { userId } });

    await tx.paySchedule.create({
      data: {
        userId,
        name: "Primary Pay Schedule",
        cadence: payFrequency as Frequency,
        interval: 1,
        anchorDate: payAnchorDate,
        nextPayDate: payAnchorDate,
        netPay: toDecimal(takeHomePay),
      },
    });

    if (deductions?.length) {
      const deductionCategory = await tx.category.upsert({
        where: { userId_name: { userId, name: "Deductions" } },
        update: { type: CategoryType.EXPENSE },
        create: { userId, name: "Deductions", type: CategoryType.EXPENSE },
      });

      for (const deduction of deductions) {
        await tx.recurringRule.create({
          data: {
            userId,
            name: deduction.name,
            cadence: payFrequency as Frequency,
            interval: 1,
            amount: toDecimal(deduction.amount),
            currency,
            startDate: new Date(),
            categoryId: deductionCategory.id,
          },
        });
      }
    }

    if (bills?.length) {
      for (const bill of bills) {
        const dueDate = nextDueDate(bill.dueDay);
        const cadence = bill.frequency === "WEEKLY" ? Frequency.WEEKLY : Frequency.MONTHLY;
        const recurringRule = await tx.recurringRule.create({
          data: {
            userId,
            name: bill.name,
            cadence,
            interval: 1,
            amount: toDecimal(bill.amount),
            currency,
            startDate: dueDate,
            dayOfMonth: cadence === Frequency.MONTHLY ? bill.dueDay : null,
            dayOfWeek: cadence === Frequency.WEEKLY ? dueDate.getDay() : null,
          },
        });

        await tx.bill.create({
          data: {
            userId,
            name: bill.name,
            amount: toDecimal(bill.amount),
            currency,
            dueDate,
            frequency: cadence,
            status: BillStatus.SCHEDULED,
            autopay: false,
            reminderDays: 3,
            recurringRuleId: recurringRule.id,
          },
        });
      }
    }

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

    if (savingsGoals?.length) {
      await tx.goal.createMany({
        data: savingsGoals.map((goal) => ({
          userId,
          name: goal.name,
          targetAmount: toDecimal(goal.targetAmount),
          currentAmount: 0,
          targetDate: null,
        })),
      });
    }

    if (debts?.length) {
      await tx.debt.createMany({
        data: debts.map((debt) => ({
          userId,
          name: debt.name,
          principal: 0,
          interestRate: 0,
          minimumPayment: toDecimal(debt.minimumPayment),
          dueDay: null,
        })),
      });
    }
  });

  return NextResponse.json({ onboarded: true });
}
