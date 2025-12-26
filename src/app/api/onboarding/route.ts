import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BillStatus, CategoryType, Frequency } from "@prisma/client";

type PayScheduleInput = {
  cadence: Frequency;
  interval: number;
  anchorDate: string;
  netPay: number;
};

type DeductionInput = {
  name: string;
  amount: number;
  isPercent: boolean;
};

type BillInput = {
  name: string;
  amount: number;
  dueDate: string;
  frequency: Frequency;
  reminderDays?: number;
};

type VariableSpendInput = {
  category: string;
  amount: number;
};

type GoalInput = {
  name: string;
  targetAmount: number;
  targetDate?: string;
};

type DebtInput = {
  name: string;
  principal: number;
  interestRate: number;
  minimumPayment: number;
  dueDay?: number;
};

function toDecimal(value: number | null | undefined) {
  if (value === undefined || value === null || Number.isNaN(value)) return 0;
  return Number(value);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboarded: true, currency: true, timezone: true },
  });

  return NextResponse.json({
    onboarded: user?.onboarded ?? false,
    currency: user?.currency ?? "USD",
    timezone: user?.timezone ?? "UTC",
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const payload = (await request.json()) as {
    currency?: string;
    timezone?: string;
    paySchedule?: PayScheduleInput;
    deductions?: DeductionInput[];
    bills?: BillInput[];
    variableSpending?: VariableSpendInput[];
    goals?: { savings?: GoalInput[]; debts?: DebtInput[] };
  };

  const currency = payload.currency ?? "USD";
  const timezone = payload.timezone ?? "UTC";
  const paySchedule = payload.paySchedule;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { currency, timezone, onboarded: true },
    });

    if (paySchedule) {
      await tx.paySchedule.deleteMany({ where: { userId } });
      await tx.paySchedule.create({
        data: {
          userId,
          name: "Primary Pay Schedule",
          cadence: paySchedule.cadence,
          interval: paySchedule.interval ?? 1,
          anchorDate: new Date(paySchedule.anchorDate),
          nextPayDate: new Date(paySchedule.anchorDate),
          netPay: toDecimal(paySchedule.netPay),
        },
      });
    }

    await tx.deduction.deleteMany({ where: { userId } });
    if (payload.deductions?.length) {
      await tx.deduction.createMany({
        data: payload.deductions.map((item) => ({
          userId,
          name: item.name,
          amount: toDecimal(item.amount),
          isPercent: !!item.isPercent,
        })),
      });
    }

    await tx.bill.deleteMany({ where: { userId } });
    if (payload.bills?.length) {
      await tx.bill.createMany({
        data: payload.bills.map((bill) => ({
          userId,
          name: bill.name,
          amount: toDecimal(bill.amount),
          currency,
          dueDate: new Date(bill.dueDate),
          frequency: bill.frequency ?? Frequency.MONTHLY,
          status: BillStatus.SCHEDULED,
          autopay: false,
          reminderDays: bill.reminderDays ?? 3,
        })),
      });
    }

    if (payload.variableSpending?.length) {
      const budgetStart = new Date();
      const budgetEnd = new Date();
      budgetEnd.setMonth(budgetEnd.getMonth() + 1);

      const categories = await Promise.all(
        payload.variableSpending.map((item) =>
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

      const budgetPlan = await tx.budgetPlan.create({
        data: {
          userId,
          name: "Onboarding Plan",
          periodStart: budgetStart,
          periodEnd: budgetEnd,
        },
      });

      await tx.budgetItem.createMany({
        data: payload.variableSpending.map((item) => {
          const cat = categories.find((c) => c.name === item.category);
          return {
            budgetPlanId: budgetPlan.id,
            categoryId: cat?.id,
            amount: toDecimal(item.amount),
            spent: 0,
          };
        }),
      });
    }

    await tx.goal.deleteMany({ where: { userId } });
    if (payload.goals?.savings?.length) {
      await tx.goal.createMany({
        data: payload.goals.savings.map((goal) => ({
          userId,
          name: goal.name,
          targetAmount: toDecimal(goal.targetAmount),
          currentAmount: 0,
          targetDate: goal.targetDate ? new Date(goal.targetDate) : null,
        })),
      });
    }

    await tx.debt.deleteMany({ where: { userId } });
    if (payload.goals?.debts?.length) {
      await tx.debt.createMany({
        data: payload.goals.debts.map((debt) => ({
          userId,
          name: debt.name,
          principal: toDecimal(debt.principal),
          interestRate: debt.interestRate ?? 0,
          minimumPayment: toDecimal(debt.minimumPayment),
          dueDay: debt.dueDay ?? null,
        })),
      });
    }
  });

  return NextResponse.json({ onboarded: true });
}
