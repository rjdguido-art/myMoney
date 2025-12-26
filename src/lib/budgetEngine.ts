import { BudgetMode, BillInput, BudgetEngineInput, ComputedBudget } from "./budgetEngine.types";
import { PrismaClient, CategoryType } from "@prisma/client";

function clampNumber(value: number) {
  if (Number.isNaN(value) || value < 0) return 0;
  return value;
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

  const netPay = clampNumber(input.paySchedule.netPay);
  const pool =
    input.mode === "MONTHLY"
      ? netPay * monthlyMultiplier(input.paySchedule.cadence)
      : netPay;

  const billTotal = input.bills.reduce(
    (sum, bill) => sum + clampNumber(bill.amount),
    0,
  );

  let remaining = pool - billTotal;
  if (remaining < 0) remaining = 0;

  const goalAllocations = input.goals.map((goal) => {
    let amount = 0;
    if (goal.allocationType === "PERCENT") {
      amount = (goal.allocationValue / 100) * remaining;
    } else {
      amount = goal.allocationValue;
    }
    amount = Math.min(amount, remaining);
    remaining -= amount;
    return { name: goal.name, amount, category: goal.categoryName ?? goal.name, bucket: goal.type };
  });

  const variableTotal = input.variableEstimates.reduce(
    (sum, v) => sum + clampNumber(v.amount),
    0,
  );
  const scale =
    variableTotal > 0 && remaining > 0 ? Math.min(1, remaining / variableTotal) : 0;

  const variableAllocations = input.variableEstimates.map((v) => ({
    name: v.category,
    category: v.category,
    bucket: "VARIABLE" as const,
    amount: Number((clampNumber(v.amount) * scale).toFixed(2)),
  }));

  const billAllocations = input.bills.map((bill: BillInput) => ({
    name: bill.name,
    category: bill.categoryName ?? bill.name,
    bucket: "BILL" as const,
    amount: clampNumber(bill.amount),
  }));

  const items = [...billAllocations, ...goalAllocations, ...variableAllocations];

  return {
    periodStart: start,
    periodEnd: end,
    totalAvailable: pool,
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
