import { describe, expect, it } from "vitest";
import { computeBudget } from "@/lib/budgetEngine";
import { BudgetEngineInput } from "@/lib/budgetEngine.types";

function baseInput(overrides: Partial<BudgetEngineInput> = {}): BudgetEngineInput {
  return {
    mode: "MONTHLY",
    paySchedule: { cadence: "MONTHLY", netPay: 2000, nextPayDate: new Date("2024-05-01") },
    bills: [
      { name: "Rent", amount: 800 },
      { name: "Utilities", amount: 200 },
    ],
    goals: [
      { name: "Emergency", type: "SAVINGS", allocationType: "PERCENT", allocationValue: 10 },
      { name: "Debt", type: "DEBT", allocationType: "AMOUNT", allocationValue: 50 },
    ],
    variableEstimates: [
      { category: "Groceries", amount: 600 },
      { category: "Fun", amount: 400 },
    ],
    ...overrides,
  };
}

describe("computeBudget", () => {
  it("allocates bills first, then goals, then scales variables", () => {
    const result = computeBudget(baseInput());

    const rent = result.items.find((i) => i.name === "Rent");
    const savings = result.items.find((i) => i.name === "Emergency");
    const groceries = result.items.find((i) => i.name === "Groceries");
    const fun = result.items.find((i) => i.name === "Fun");

    expect(result.totalAvailable).toBe(2000);
    expect(rent?.amount).toBe(800);
    expect(savings?.amount).toBeCloseTo(100); // 10% of remainder after bills (1000 -> 100)
    expect(groceries?.amount).toBeCloseTo(510); // scaled 0.85
    expect(fun?.amount).toBeCloseTo(340);
  });

  it("clamps allocations when bills exceed income", () => {
    const result = computeBudget(
      baseInput({
        paySchedule: { cadence: "MONTHLY", netPay: 1200, nextPayDate: new Date("2024-05-01") },
      }),
    );
    const savings = result.items.find((i) => i.name === "Emergency");
    const variableTotal = result.items
      .filter((i) => i.bucket === "VARIABLE")
      .reduce((sum, item) => sum + item.amount, 0);

    expect(result.totalAvailable).toBe(1200);
    expect(savings?.amount).toBeCloseTo(20); // 10% of remaining after bills (200)
    expect(variableTotal).toBeCloseTo(130); // remaining after goals spread to variables
  });

  it("supports paycheck mode using single pay period", () => {
    const result = computeBudget(
      baseInput({
        mode: "PAYCHECK",
        paySchedule: { cadence: "BIWEEKLY", netPay: 1500, nextPayDate: new Date("2024-05-01") },
      }),
    );
    expect(result.totalAvailable).toBe(1500);
    const billSum = result.items
      .filter((i) => i.bucket === "BILL")
      .reduce((sum, item) => sum + item.amount, 0);
    expect(billSum).toBe(1000);
  });
});
