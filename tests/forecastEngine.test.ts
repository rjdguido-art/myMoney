import { describe, expect, it, vi } from "vitest";
import { buildForecast } from "@/lib/forecastEngine";
import { CategoryType, Frequency, Prisma } from "@prisma/client";

describe("buildForecast", () => {
  it("returns a zeroed snapshot when no pay schedule exists", async () => {
    const prisma = {
      paySchedule: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const result = await buildForecast({ userId: "user-1", prisma: prisma as any });

    expect(result.nextPayDate).toBeNull();
    expect(result.safeToSpend).toBe(0);
    expect(result.totals).toEqual({ bills: 0, recurring: 0, pending: 0, spent: 0 });
  });

  it("totals bills, recurring rules, and transactions inside the pay period", async () => {
    const now = new Date("2024-05-10T00:00:00Z");

    const paySchedules = [
      {
        id: "ps-1",
        name: "Monthly Pay",
        cadence: Frequency.MONTHLY,
        interval: 1,
        anchorDate: new Date("2024-05-01T00:00:00Z"),
        nextPayDate: null,
        netPay: new Prisma.Decimal(3000),
        userId: "user-1",
        createdAt: now,
        updatedAt: now,
      },
    ];

    const bills = [
      {
        id: "bill-1",
        name: "Rent",
        amount: new Prisma.Decimal(500),
        dueDate: new Date("2024-05-20T00:00:00Z"),
        frequency: Frequency.MONTHLY,
      },
      {
        id: "bill-2",
        name: "Phone",
        amount: new Prisma.Decimal(150),
        dueDate: new Date("2024-05-28T00:00:00Z"),
        frequency: Frequency.MONTHLY,
      },
    ];

    const recurringRules = [
      {
        id: "rr-1",
        name: "Streaming",
        cadence: Frequency.WEEKLY,
        interval: 1,
        amount: new Prisma.Decimal(50),
        currency: "USD",
        startDate: new Date("2024-05-03T00:00:00Z"),
        nextRun: new Date("2024-05-10T00:00:00Z"),
        nextRunAt: new Date("2024-05-10T00:00:00Z"),
        endDate: null,
        dayOfMonth: null,
        dayOfWeek: 5,
        userId: "user-1",
        accountId: "acc-1",
        categoryId: "cat-1",
        category: { type: CategoryType.EXPENSE },
        createdAt: now,
        updatedAt: now,
      },
    ];

    const cycleTransactions = [
      {
        amount: new Prisma.Decimal(120),
        category: { type: CategoryType.EXPENSE },
        splits: [],
      },
      {
        amount: new Prisma.Decimal(80),
        category: { type: CategoryType.EXPENSE },
        splits: [],
      },
    ];

    const futureTransactions = [
      {
        amount: new Prisma.Decimal(300),
        category: { type: CategoryType.EXPENSE },
        splits: [],
      },
    ];

    const prisma = {
      paySchedule: { findMany: vi.fn().mockResolvedValue(paySchedules) },
      bill: { findMany: vi.fn().mockResolvedValue(bills) },
      recurringRule: { findMany: vi.fn().mockResolvedValue(recurringRules) },
      transaction: {
        findMany: vi.fn().mockImplementation(({ where }) => {
          const lte = (where as any).postedAt?.lte as Date | undefined;
          if (lte && lte.getTime() === now.getTime()) {
            return Promise.resolve(cycleTransactions);
          }
          return Promise.resolve(futureTransactions);
        }),
      },
    };

    const result = await buildForecast({ userId: "user-1", prisma: prisma as any, now });

    expect(result.periodStart?.getTime()).toBe(new Date("2024-05-01T00:00:00Z").getTime());
    expect(result.nextPayDate?.getTime()).toBe(new Date("2024-06-01T00:00:00Z").getTime());

    expect(result.billsDue).toHaveLength(2);
    expect(result.totals).toEqual({
      bills: 650,
      recurring: 200,
      pending: 300,
      spent: 200,
    });
    expect(result.safeToSpend).toBe(1650);
    expect(result.dailyAllowance).toBeCloseTo(75);
  });
});
