import { describe, expect, it, vi } from "vitest";
import { resolveCategoryRule } from "@/lib/rules";

const mockRules = [
  { descriptionContains: "coffee", categoryId: "cat-coffee", priority: 10 },
  { descriptionContains: "uber", categoryId: "cat-ride", priority: 5 },
];

describe("resolveCategoryRule", () => {
  it("returns null when there is no description", async () => {
    const prisma = {
      rule: { findMany: vi.fn() },
    };
    const result = await resolveCategoryRule({
      userId: "user-1",
      description: "",
      prisma: prisma as any,
    });
    expect(result).toBeNull();
    expect(prisma.rule.findMany).not.toHaveBeenCalled();
  });

  it("matches rules case-insensitively and respects priority order", async () => {
    const prisma = {
      rule: {
        findMany: vi.fn().mockResolvedValue([
          mockRules[1], // lower priority, appears first to prove ordering is respected
          mockRules[0],
        ]),
      },
    };

    const result = await resolveCategoryRule({
      userId: "user-1",
      description: "Starbucks coffee shop",
      prisma: prisma as any,
    });

    expect(prisma.rule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", active: true },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      }),
    );
    expect(result).toBe("cat-coffee");
  });
});
