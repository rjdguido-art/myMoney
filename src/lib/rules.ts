import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "./prisma";

type ResolveRuleParams = {
  userId: string;
  description: string | null | undefined;
  prisma?: PrismaClient;
};

/**
 * Returns the categoryId from the first matching rule for this user.
 * Matching is case-insensitive substring on the transaction description.
 */
export async function resolveCategoryRule({
  userId,
  description,
  prisma = defaultPrisma,
}: ResolveRuleParams): Promise<string | null> {
  if (!description) return null;
  const normalized = description.toLowerCase();

  const rules = await prisma.rule.findMany({
    where: { userId, active: true },
    select: { descriptionContains: true, categoryId: true, priority: true },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  for (const rule of rules) {
    if (!rule.descriptionContains) continue;
    const needle = rule.descriptionContains.toLowerCase();
    if (normalized.includes(needle)) {
      return rule.categoryId;
    }
  }

  return null;
}
