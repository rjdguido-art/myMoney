import type { PrismaClient, CategoryType } from "@prisma/client";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type WeeklyScore = {
  userId: string;
  name: string | null;
  username: string | null;
  imageUrl: string | null;
  weeklySpent: number;
  weeklyBudget: number;
  percentSaved: number;
  points: number;
};

type WeekRange = { start: Date; end: Date };

function getWeekRange(now: Date): WeekRange {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sumExpenseTransactions(
  txs: Array<{
    amount: unknown;
    category: { type: CategoryType } | null;
    splits: Array<{ amount: unknown; category: { type: CategoryType } | null }>;
  }>,
) {
  return txs.reduce((sum, tx) => {
    if (tx.splits.length) {
      return (
        sum +
        tx.splits.reduce((inner, split) => {
          if (split.category?.type !== "EXPENSE") return inner;
          return inner + toNumber(split.amount);
        }, 0)
      );
    }
    if (tx.category?.type !== "EXPENSE") return sum;
    return sum + toNumber(tx.amount);
  }, 0);
}

function resolveWeeklyBudget(budgetPlan: {
  periodStart: Date;
  periodEnd: Date;
  items: Array<{ amount: unknown }>;
} | null): number {
  if (!budgetPlan) return 0;
  const budgetTotal = budgetPlan.items.reduce((sum, item) => sum + toNumber(item.amount), 0);
  if (!budgetTotal) return 0;
  const days =
    Math.max(1, Math.round((budgetPlan.periodEnd.getTime() - budgetPlan.periodStart.getTime()) / MS_PER_DAY) + 1);
  return (budgetTotal / days) * 7;
}

export async function getWeeklyScoreForUser({
  prisma,
  userId,
  now = new Date(),
}: {
  prisma: PrismaClient;
  userId: string;
  now?: Date;
}): Promise<WeeklyScore> {
  const { start, end } = getWeekRange(now);

  const [user, budgetPlan, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true, imageUrl: true },
    }),
    prisma.budgetPlan.findFirst({
      where: { userId, periodStart: { lte: now }, periodEnd: { gte: now } },
      orderBy: { periodStart: "desc" },
      include: { items: { select: { amount: true } } },
    }),
    prisma.transaction.findMany({
      where: { userId, postedAt: { gte: start, lte: end } },
      include: {
        category: { select: { type: true } },
        splits: { include: { category: { select: { type: true } } } },
      },
    }),
  ]);

  const weeklySpent = sumExpenseTransactions(transactions);
  const weeklyBudget = resolveWeeklyBudget(budgetPlan);
  const percentSaved =
    weeklyBudget > 0 ? Math.max(0, Math.min(1, (weeklyBudget - weeklySpent) / weeklyBudget)) : 0;
  const points = Math.round(percentSaved * 100);

  return {
    userId,
    name: user?.name ?? null,
    username: user?.username ?? null,
    imageUrl: user?.imageUrl ?? null,
    weeklySpent,
    weeklyBudget,
    percentSaved,
    points,
  };
}

export async function getLeaderboard({
  prisma,
  userId,
  now = new Date(),
}: {
  prisma: PrismaClient;
  userId: string;
  now?: Date;
}): Promise<WeeklyScore[]> {
  const friendships = await prisma.friendship.findMany({
    where: { userId },
    select: { friendId: true },
  });
  const ids = Array.from(new Set([userId, ...friendships.map((f) => f.friendId)]));
  const scores = await Promise.all(
    ids.map((id) => getWeeklyScoreForUser({ prisma, userId: id, now })),
  );
  return scores.sort((a, b) => b.points - a.points || b.percentSaved - a.percentSaved);
}
