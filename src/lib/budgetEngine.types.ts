export type BudgetMode = "MONTHLY" | "PAYCHECK";

export type Frequency =
  | "DAILY"
  | "WEEKLY"
  | "BIWEEKLY"
  | "SEMIMONTHLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "YEARLY";

export type PayScheduleInput = {
  cadence: Frequency;
  netPay: number;
  nextPayDate: Date;
};

export type BillInput = {
  name: string;
  amount: number;
  categoryName?: string;
};

export type VariableEstimate = {
  category: string;
  amount: number;
};

export type GoalAllocation = {
  name: string;
  categoryName?: string;
  type: "SAVINGS" | "DEBT";
  allocationType: "PERCENT" | "AMOUNT";
  allocationValue: number;
};

export type BudgetEngineInput = {
  mode: BudgetMode;
  paySchedule: PayScheduleInput;
  bills: BillInput[];
  variableEstimates: VariableEstimate[];
  goals: GoalAllocation[];
};

export type ComputedBudgetItem = {
  name: string;
  category: string;
  bucket: "BILL" | "VARIABLE" | "SAVINGS" | "DEBT";
  amount: number;
};

export type ComputedBudget = {
  periodStart: Date;
  periodEnd: Date;
  totalAvailable: number;
  items: ComputedBudgetItem[];
};
