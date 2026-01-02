import type { PrismaClient, RecurringRule } from "@prisma/client";
import { Frequency, TransactionStatus } from "@prisma/client";
import { prisma as defaultPrisma } from "./prisma";

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addMonths(date: Date, months: number, dayOfMonth?: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  if (dayOfMonth) {
    copy.setDate(Math.min(dayOfMonth, daysInMonth(copy)));
  }
  return copy;
}

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function computeNextRunAt(rule: RecurringRule, from: Date): Date {
  const targetDow = typeof rule.dayOfWeek === "number" ? rule.dayOfWeek : null;
  switch (rule.cadence) {
    case Frequency.DAILY:
      return addDays(from, rule.interval);
    case Frequency.WEEKLY:
      if (targetDow === null) {
        return addDays(from, 7 * rule.interval);
      }
      return addDays(
        from,
        ((targetDow - from.getDay() + 7) % 7 || 7) + 7 * (rule.interval - 1),
      );
    case Frequency.BIWEEKLY:
      if (targetDow === null) {
        return addDays(from, 14 * rule.interval);
      }
      return addDays(
        from,
        ((targetDow - from.getDay() + 7) % 7 || 7) + 14 * (rule.interval - 1),
      );
    case Frequency.SEMIMONTHLY:
      return addDays(from, 15 * rule.interval);
    case Frequency.MONTHLY:
      return addMonths(from, rule.interval, rule.dayOfMonth ?? undefined);
    case Frequency.QUARTERLY:
      return addMonths(from, 3 * rule.interval, rule.dayOfMonth ?? undefined);
    case Frequency.YEARLY:
      return addMonths(from, 12 * rule.interval, rule.dayOfMonth ?? undefined);
    default:
      return addDays(from, rule.interval);
  }
}

export async function runRecurringRules({
  prisma = defaultPrisma,
  horizonDays = 45,
}: {
  prisma?: PrismaClient;
  horizonDays?: number;
}) {
  const now = new Date();
  const horizon = addDays(now, horizonDays);
  const rules = await prisma.recurringRule.findMany({
    where: {
      startDate: { lte: horizon },
      OR: [{ nextRunAt: null }, { nextRunAt: { lte: horizon } }],
    },
  });

  let created = 0;
  const skipped: Array<{ id: string; reason: string }> = [];

  for (const rule of rules) {
    const runDate = rule.nextRunAt ?? rule.nextRun ?? rule.startDate;
    if (!runDate) {
      skipped.push({ id: rule.id, reason: "No start date" });
      continue;
    }

    const runs: Date[] = [];
    let pointer = new Date(runDate);

    while (
      pointer <= horizon &&
      runs.length < 12 &&
      (!rule.endDate || pointer <= rule.endDate)
    ) {
      if (pointer >= now) {
        runs.push(new Date(pointer));
      }
      const next = computeNextRunAt(rule, pointer);
      if (!next || next.getTime() === pointer.getTime()) break;
      pointer = next;
    }

    if (!runs.length) {
      continue;
    }

    if (!rule.accountId) {
      skipped.push({ id: rule.id, reason: "No account linked" });
      continue;
    }

    for (const run of runs) {
      const existing = await prisma.transaction.findFirst({
        where: { recurringRuleId: rule.id, postedAt: run },
        select: { id: true },
      });
      if (existing) continue;

      await prisma.transaction.create({
        data: {
          userId: rule.userId,
          accountId: rule.accountId,
          categoryId: rule.categoryId ?? null,
          recurringRuleId: rule.id,
          description: rule.name,
          amount: rule.amount,
          currency: rule.currency,
          postedAt: run,
          status: TransactionStatus.PENDING,
        },
      });
      created += 1;
    }

    let nextRunCandidate: Date | null = computeNextRunAt(
      rule,
      runs[runs.length - 1],
    );
    if (rule.endDate && nextRunCandidate > rule.endDate) {
      nextRunCandidate = null;
    }
    await prisma.recurringRule.update({
      where: { id: rule.id },
      data: {
        nextRunAt: nextRunCandidate ?? null,
        nextRun: nextRunCandidate ?? null,
      },
    });
  }

  return { processed: rules.length, created, skipped };
}
