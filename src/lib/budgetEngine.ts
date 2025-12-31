import { BudgetMode, BillInput, BudgetEngineInput, ComputedBudget } from "./budgetEngine.types";
import { PrismaClient, CategoryType } from "@prisma/client";

function clampCents(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100);
}

function centsToNumber(value: number) {
  return Number((value / 100).toFixed(2));
}

function monthlyMultiplier(cadence: string) {
  const table: Record<string, number> = {
    DAILY: 30,
    WEEKLY: 4,
    BIWEEKLY: 2,
    SEMIMONTHLY: 2,
    MONTHLY: 1,
    QUARTERLY: 1 / 3,
    YEARLY: 1 / 12,
  };
  return table[cadence] ?? 1;
}

export function computeBudget(input: BudgetEngineInput): ComputedBudget {
  const now = input.paySchedule.nextPayDate ?? new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (input.mode === "MONTHLY") {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
  } else {
    // paycheck mode uses a single pay period anchored to next pay date
    end.setDate(end.getDate() + 13);
  }

  const netPayCents = clampCents(input.paySchedule.netPay);
  const poolCents =
    input.mode === "MONTHLY"
      ? Math.round(netPayCents * monthlyMultiplier(input.paySchedule.cadence))
      : netPayCents;

  const billTotalCents = input.bills.reduce(
    (sum, bill) => sum + clampCents(bill.amount),
    0,
  );

  let remainingCents = poolCents - billTotalCents;
  if (remainingCents < 0) remainingCents = 0;

  const goalAllocations = input.goals.map((goal) => {
    let amountCents = 0;
    if (goal.allocationType === "PERCENT") {
      amountCents = Math.round((goal.allocationValue / 100) * remainingCents);
    } else {
      amountCents = clampCents(goal.allocationValue);
    }
    amountCents = Math.min(amountCents, remainingCents);
    remainingCents -= amountCents;
    return {
      name: goal.name,
      amount: centsToNumber(amountCents),
      category: goal.categoryName ?? goal.name,
      bucket: goal.type,
    };
  });

  const variableTotalCents = input.variableEstimates.reduce(
    (sum, v) => sum + clampCents(v.amount),
    0,
  );
  const variableAllocations = (() => {
    if (variableTotalCents <= 0 || remainingCents <= 0) {
      return input.variableEstimates.map((v) => ({
        name: v.category,
        category: v.category,
        bucket: "VARIABLE" as const,
        amount: 0,
      }));
    }

    if (remainingCents >= variableTotalCents) {
      return input.variableEstimates.map((v) => ({
        name: v.category,
        category: v.category,
        bucket: "VARIABLE" as const,
        amount: centsToNumber(clampCents(v.amount)),
      }));
    }

    const allocations = input.variableEstimates.map((v, index) => {
      const amountCents = clampCents(v.amount);
      const numerator = amountCents * remainingCents;
      const base = Math.floor(numerator / variableTotalCents);
      const remainder = numerator % variableTotalCents;
      return {
        index,
        name: v.category,
        category: v.category,
        bucket: "VARIABLE" as const,
        base,
        remainder,
      };
    });

    let distributed = allocations.reduce((sum, item) => sum + item.base, 0);
    let toDistribute = remainingCents - distributed;

    allocations.sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; i < allocations.length && toDistribute > 0; i += 1) {
      allocations[i].base += 1;
      toDistribute -= 1;
    }

    allocations.sort((a, b) => a.index - b.index);
    return allocations.map((item) => ({
      name: item.name,
      category: item.category,
      bucket: item.bucket,
      amount: centsToNumber(item.base),
    }));
  })();

  const billAllocations = input.bills.map((bill: BillInput) => ({
    name: bill.name,
    category: bill.categoryName ?? bill.name,
    bucket: "BILL" as const,
    amount: centsToNumber(clampCents(bill.amount)),
  }));

  const items = [...billAllocations, ...goalAllocations, ...variableAllocations];

  return {
    periodStart: start,
    periodEnd: end,
    totalAvailable: centsToNumber(poolCents),
    items,
  };
}

export async function persistBudgetPlan(
  prisma: PrismaClient,
  userId: string,
  input: BudgetEngineInput,
) {
  const computed = computeBudget(input);
  return prisma.$transaction(async (tx) => {
    const categories = new Map<string, string>();
    for (const item of computed.items) {
      const key = item.category;
      if (!categories.has(key)) {
        const cat = await tx.category.upsert({
          where: { userId_name: { userId, name: key } },
          update: {},
          create: { userId, name: key, type: CategoryType.EXPENSE },
        });
        categories.set(key, cat.id);
      }
    }

    const plan = await tx.budgetPlan.create({
      data: {
        userId,
        name: input.mode === "MONTHLY" ? "Monthly Auto Budget" : "Paycheck Auto Budget",
        periodStart: computed.periodStart,
        periodEnd: computed.periodEnd,
      },
    });

    await tx.budgetItem.createMany({
      data: computed.items.map((item) => ({
        budgetPlanId: plan.id,
        categoryId: categories.get(item.category),
        amount: item.amount,
        spent: 0,
      })),
    });

    return plan;
  });
}
