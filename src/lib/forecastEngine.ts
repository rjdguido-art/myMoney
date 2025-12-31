import { CategoryType, Frequency, type PrismaClient } from "@prisma/client";
import { computeNextRunAt } from "./recurringRunner";
import { prisma as defaultPrisma } from "./prisma";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toCents(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

function centsToNumber(value: number) {
  return Number((value / 100).toFixed(2));
}

function shiftDate(base: Date, cadence: Frequency, interval = 1) {
  const copy = new Date(base);
  switch (cadence) {
    case "DAILY":
      copy.setDate(copy.getDate() + interval);
      break;
    case "WEEKLY":
      copy.setDate(copy.getDate() + 7 * interval);
      break;
    case "BIWEEKLY":
      copy.setDate(copy.getDate() + 14 * interval);
      break;
    case "SEMIMONTHLY":
      copy.setDate(copy.getDate() + 15 * interval);
      break;
    case "MONTHLY":
      copy.setMonth(copy.getMonth() + interval);
      break;
    case "QUARTERLY":
      copy.setMonth(copy.getMonth() + 3 * interval);
      break;
    case "YEARLY":
      copy.setFullYear(copy.getFullYear() + interval);
      break;
    default:
      copy.setDate(copy.getDate() + interval);
  }
  return copy;
}

function resolveNextDate(anchor: Date, cadence: Frequency, interval: number, from: Date) {
  let cursor = new Date(anchor);
  let safety = 0;
  const step = interval || 1;
  while (cursor < from && safety < 120) {
    cursor = shiftDate(cursor, cadence, step);
    safety += 1;
  }
  return cursor;
}

function resolvePreviousDate(
  anchor: Date,
  cadence: Frequency,
  interval: number,
  from: Date,
) {
  let cursor = new Date(anchor);
  let previous = new Date(anchor);
  let safety = 0;
  const step = interval || 1;

  if (cursor > from) {
    while (cursor > from && safety < 120) {
      previous = cursor;
      cursor = shiftDate(cursor, cadence, -step);
      safety += 1;
    }
    return cursor <= from ? cursor : previous;
  }

  while (cursor <= from && safety < 120) {
    previous = cursor;
    cursor = shiftDate(cursor, cadence, step);
    safety += 1;
  }
  return previous;
}

type UpcomingBill = {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
};

type ForecastSnapshot = {
  periodStart: Date | null;
  periodEnd: Date | null;
  nextPayDate: Date | null;
  daysUntilPay: number;
  netPay: number;
  billsDue: UpcomingBill[];
  totals: {
    bills: number;
    recurring: number;
    pending: number;
    spent: number;
  };
  safeToSpend: number;
  dailyAllowance: number;
};

function billOccurrences(
  bill: { id: string; name: string; amount: unknown; dueDate: Date; frequency: Frequency },
  from: Date,
  to: Date,
) {
  const upcoming: UpcomingBill[] = [];
  let pointer = new Date(bill.dueDate);
  let safety = 0;
  const amount = centsToNumber(toCents(bill.amount));

  while (pointer < from && safety < 48) {
    pointer = shiftDate(pointer, bill.frequency, 1);
    safety += 1;
  }

  while (pointer <= to && safety < 96) {
    upcoming.push({
      id: bill.id,
      name: bill.name,
      amount,
      dueDate: new Date(pointer),
    });
    pointer = shiftDate(pointer, bill.frequency, 1);
    safety += 1;
  }

  return upcoming;
}

function signedAmountCents(amount: unknown, type?: CategoryType | null) {
  const value = toCents(amount);
  return type === CategoryType.INCOME ? -value : value;
}

export async function buildForecast({
  userId,
  prisma = defaultPrisma,
  now = new Date(),
}: {
  userId: string;
  prisma?: PrismaClient;
  now?: Date;
}): Promise<ForecastSnapshot> {
  const paySchedules = await prisma.paySchedule.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const primary = paySchedules
    .map((schedule) => {
      const anchor = schedule.nextPayDate ?? schedule.anchorDate;
      const nextPayDate = resolveNextDate(anchor, schedule.cadence, schedule.interval, now);
      const previousPayDate = resolvePreviousDate(
        anchor,
        schedule.cadence,
        schedule.interval,
        now,
      );
      return {
        scheduleId: schedule.id,
        netPayCents: toCents(schedule.netPay),
        nextPayDate,
        previousPayDate,
        cadence: schedule.cadence,
      };
    })
    .sort((a, b) => a.nextPayDate.getTime() - b.nextPayDate.getTime())[0];

  if (!primary) {
    return {
      periodStart: null,
      periodEnd: null,
      nextPayDate: null,
      daysUntilPay: 0,
      netPay: 0,
      billsDue: [],
      totals: { bills: 0, recurring: 0, pending: 0, spent: 0 },
      safeToSpend: 0,
      dailyAllowance: 0,
    };
  }

  const horizon = primary.nextPayDate;
  const cycleStart = primary.previousPayDate;

  const [bills, recurringRules, cycleTransactions, futureTransactions] = await Promise.all([
    prisma.bill.findMany({
      where: { userId },
      select: { id: true, name: true, amount: true, dueDate: true, frequency: true },
    }),
    prisma.recurringRule.findMany({
      where: { userId },
      include: { category: { select: { id: true, type: true } } },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        postedAt: { gte: cycleStart, lte: now },
      },
      include: {
        category: { select: { id: true, type: true } },
        splits: {
          include: { category: { select: { id: true, type: true } } },
        },
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        postedAt: { gt: now, lte: horizon },
      },
      include: {
        category: { select: { id: true, type: true } },
        splits: {
          include: { category: { select: { id: true, type: true } } },
        },
      },
    }),
  ]);

  const billsDue = bills.flatMap((bill) => billOccurrences(bill, now, horizon));
  const billsTotalCents = billsDue.reduce(
    (sum, bill) => sum + toCents(bill.amount),
    0,
  );

  let recurringTotalCents = 0;
  for (const rule of recurringRules) {
    let pointer = rule.nextRunAt ?? rule.nextRun ?? rule.startDate;
    let safety = 0;

    while (pointer < now && safety < 120) {
      const next = computeNextRunAt(rule, pointer);
      if (!next || next.getTime() === pointer.getTime()) break;
      pointer = next;
      safety += 1;
    }

    while (pointer && pointer <= horizon && safety < 240) {
      recurringTotalCents += signedAmountCents(
        rule.amount,
        rule.category?.type ?? null,
      );
      const next = computeNextRunAt(rule, pointer);
      if (!next || next.getTime() === pointer.getTime()) break;
      pointer = next;
      safety += 1;
    }
  }

  const sumTransactions = (
    txs: Array<{
      amount: unknown;
      category: { type: CategoryType } | null;
      splits: Array<{ amount: unknown; category: { type: CategoryType } | null }>;
    }>,
  ) => {
    return txs.reduce((sum, tx) => {
      if (tx.splits.length) {
        return (
          sum +
          tx.splits.reduce(
            (inner, split) =>
              inner + signedAmountCents(split.amount, split.category?.type),
            0,
          )
        );
      }
      return sum + signedAmountCents(tx.amount, tx.category?.type ?? null);
    }, 0);
  };

  const spentThisCycleCents = sumTransactions(cycleTransactions);
  const pendingFutureCents = sumTransactions(futureTransactions);

  const rawSafeToSpendCents =
    primary.netPayCents -
    billsTotalCents -
    recurringTotalCents -
    pendingFutureCents -
    spentThisCycleCents;

  const daysUntilPay = Math.max(
    1,
    Math.ceil((horizon.getTime() - now.getTime()) / MS_PER_DAY),
  );

  const safeToSpendCents = Math.max(0, rawSafeToSpendCents);
  const dailyAllowanceCents = Math.max(
    0,
    Math.round(safeToSpendCents / daysUntilPay),
  );

  return {
    periodStart: cycleStart,
    periodEnd: horizon,
    nextPayDate: horizon,
    daysUntilPay,
    netPay: centsToNumber(primary.netPayCents),
    billsDue,
    totals: {
      bills: centsToNumber(billsTotalCents),
      recurring: centsToNumber(recurringTotalCents),
      pending: centsToNumber(pendingFutureCents),
      spent: centsToNumber(spentThisCycleCents),
    },
    safeToSpend: centsToNumber(safeToSpendCents),
    dailyAllowance: centsToNumber(dailyAllowanceCents),
  };
}

export type { ForecastSnapshot, UpcomingBill };
