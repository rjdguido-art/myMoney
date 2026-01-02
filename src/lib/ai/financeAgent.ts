import { z } from "zod";
import type OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/ai/openai";
import { buildForecast } from "@/lib/forecastEngine";
import {
  buildTransactionWhere,
  serializeTransaction,
  transactionInclude,
  transactionFilterSchema,
} from "@/lib/transactions";
import type { AgentRequest, AgentResponse, ChatMessage } from "./financeAgent.types";

// Cost-aware model routing.
// - FAST: cheap / quick responses
// - SMART: better multi-step planning
// Set MYMONEY_AI_MODEL to force a single model.
const FORCED_MODEL = process.env.MYMONEY_AI_MODEL;
const MODEL_FAST = process.env.MYMONEY_AI_MODEL_FAST || "gpt-5-nano";
const MODEL_SMART = process.env.MYMONEY_AI_MODEL_SMART || "gpt-5-mini";

const MAX_OUTPUT_TOKENS_FAST = Number(
  process.env.MYMONEY_AI_MAX_OUTPUT_TOKENS_FAST || 700,
);
const MAX_OUTPUT_TOKENS_SMART = Number(
  process.env.MYMONEY_AI_MAX_OUTPUT_TOKENS_SMART || 1200,
);

function pickModel(messages: ChatMessage[]): string {
  if (FORCED_MODEL) return FORCED_MODEL;

  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const text = lastUser.toLowerCase();

  const planningSignals = [
    "plan",
    "budget",
    "debt",
    "payoff",
    "avalanche",
    "snowball",
    "savings",
    "goal",
    "forecast",
    "compare",
    "comparison",
    "versus",
    "vs",
    "optimize",
    "reduce",
    "cut",
    "prioritize",
    "allocate",
    "strategy",
    "strategies",
  ];

  const looksLikePlanning = text.length > 220 || planningSignals.some((k) => text.includes(k));
  return looksLikePlanning ? MODEL_SMART : MODEL_FAST;
}

function pickMaxOutputTokens(messages: ChatMessage[]): number {
  if (FORCED_MODEL) {
    return Number(process.env.MYMONEY_AI_MAX_OUTPUT_TOKENS || 900);
  }
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const text = lastUser.toLowerCase();
  const planningSignals = [
    "plan",
    "budget",
    "debt",
    "payoff",
    "savings",
    "goal",
    "forecast",
    "compare",
    "comparison",
    "versus",
    "vs",
    "strategy",
    "strategies",
  ];
  const looksLikePlanning = text.length > 220 || planningSignals.some((k) => text.includes(k));
  return looksLikePlanning ? MAX_OUTPUT_TOKENS_SMART : MAX_OUTPUT_TOKENS_FAST;
}

const listTransactionsArgs = transactionFilterSchema.extend({
  from: z.string().nullable().optional(),
  to: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  accountId: z.string().nullable().optional(),
  search: z.string().nullable().optional(),
  limit: z.coerce.number().int().min(1).max(200).nullable().optional(),
});

function toOpenAIInput(messages: ChatMessage[]) {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

type ToolCall = {
  type: "tool_call" | "function_call";
  id?: string;
  name?: string;
  arguments?: string;
};
type MessageContent = { type?: string; text?: string };
type OutputMessage = { type: "message"; content?: MessageContent[] };
type OutputItem = ToolCall | OutputMessage | { type?: string };
type ResponseLike = { output?: OutputItem[]; output_text?: string; id?: string };

type Effort = "low" | "medium" | "high";

function parseEffort(v: string | undefined): Effort {
  if (v === "low" || v === "medium" || v === "high") return v;
  return "medium";
}

function extractToolCalls(resp: any) {
  const out: any[] = Array.isArray(resp?.output) ? resp.output : [];
  return out.filter(
    (item) =>
      item?.type === "function_call" ||
      item?.type === "tool_call" ||
      item?.type === "custom_tool_call",
  );
}

function extractText(resp: ResponseLike): string {
  if (typeof resp?.output_text === "string" && resp.output_text.trim()) return resp.output_text;
  const out = Array.isArray(resp?.output) ? resp.output : [];
  const textParts: string[] = [];
  for (const item of out) {
    if (item?.type === "message" && "content" in item) {
      const content = Array.isArray(item.content) ? item.content : [];
      for (const c of content) {
        if (c?.type === "output_text" && typeof c?.text === "string") textParts.push(c.text);
      }
    }
  }
  return textParts.join("\n").trim();
}

function addTemperatureIfSupported(
  body: Record<string, unknown>,
  model: string,
): Record<string, unknown> {
  if (!model.includes("gpt-5-nano")) {
    return { ...body, temperature: 1 };
  }
  return body;
}

function toDateOrUndefined(value: unknown): Date | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value;

  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return undefined;

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return new Date(`${s}T00:00:00.000Z`);
    }

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) {
      return new Date(`${s}.000Z`);
    }

    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return undefined;
}

async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number,
): Promise<T> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await fn(ac.signal);
  } finally {
    clearTimeout(t);
  }
}

export async function runFinanceAgent(req: AgentRequest): Promise<AgentResponse> {
  const model = pickModel(req.messages);
  const max_output_tokens = pickMaxOutputTokens(req.messages);
  const reasoningEffort = parseEffort(process.env.MYMONEY_AI_REASONING_EFFORT);

  const tools = [
    {
      type: "function" as const,
      name: "get_forecast",
      description:
        "Get a cashflow snapshot until next pay date, including bills due and safe-to-spend.",
      strict: true,
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
    {
      type: "function" as const,
      name: "list_transactions",
      description:
        "List recent transactions for the signed-in user (supports date range, account/category filters, and text search).",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          from: { type: ["string", "null"], description: "ISO date-time" },
          to: { type: ["string", "null"], description: "ISO date-time" },
          categoryId: { type: ["string", "null"] },
          accountId: { type: ["string", "null"] },
          search: { type: ["string", "null"] },
          limit: { type: ["number", "null"], description: "1-200" },
        },
        required: ["from", "to", "categoryId", "accountId", "search", "limit"],
        additionalProperties: false,
      },
    },
  ] satisfies OpenAI.Responses.Tool[];

  const system: ChatMessage = {
    role: "system",
    content: [
      "You are myMoney, a finance assistant inside a personal finance app.",
      "You may use the user's in-app data ONLY via tools.",
      "Be specific, practical, and conservative with recommendations.",
      "Do not fabricate numbers. If data is missing, say so and ask for what you need.",
      "Avoid legal/financial-advisor claims. Provide general guidance.",
      req.locale ? `User locale: ${req.locale}.` : "",
      req.timezone ? `User timezone: ${req.timezone}.` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };

  const input = toOpenAIInput([system, ...req.messages]);

  let response = await withTimeout(
    (signal) => {
      const body = addTemperatureIfSupported(
        {
          model,
          max_output_tokens,
          input,
          tools,
          tool_choice: "auto",
          reasoning: { effort: reasoningEffort },
          text: { verbosity: "medium" as const },
        },
        model,
      );
      return openai.responses.create(body, { signal } as any);
    },
    20000,
  );

  // Tool loop
  for (let i = 0; i < 4; i += 1) {
    const toolCalls = extractToolCalls(response);
    if (!toolCalls.length) break;

    const toolMessages: any[] = [];

    for (const call of toolCalls) {
      if (call.type !== "function_call") continue;

      const toolCallId = call.call_id ?? call.id;
      const toolName = call.name;

      if (!toolCallId || !toolName) {
        console.error("Malformed function_call:", call);
        continue;
      }

      let output: any = {};

      if (toolName === "get_forecast") {
        try {
          const snap = await buildForecast({ userId: req.userId, now: new Date() });
          output = {
            periodStart: snap.periodStart,
            periodEnd: snap.periodEnd,
            nextPayDate: snap.nextPayDate,
            daysUntilPay: snap.daysUntilPay,
            netPay: snap.netPay,
            safeToSpend: snap.safeToSpend,
            dailyAllowance: snap.dailyAllowance,
            totals: snap.totals,
            billsDue: snap.billsDue,
          };
        } catch (e: any) {
          output = { error: e?.message ?? "forecast failed" };
        }
      }

      if (toolName === "list_transactions") {
        try {
          const parsed = listTransactionsArgs.safeParse(
            call.arguments ? JSON.parse(call.arguments) : {},
          );
          if (!parsed.success) {
            output = { error: "Invalid filters", details: parsed.error.flatten() };
          } else {
            const data: any = { ...parsed.data };
            data.from = toDateOrUndefined(data.from);
            data.to = toDateOrUndefined(data.to);

            const where = buildTransactionWhere(req.userId, data);
            const take = data.limit ?? 50;

            const txns = await prisma.transaction.findMany({
              where,
              include: transactionInclude,
              orderBy: { postedAt: "desc" },
              take,
            });

            output = { count: txns.length, transactions: txns.map(serializeTransaction) };
          }
        } catch (e: any) {
          output = { error: e?.message ?? "transaction query failed" };
        }
      }

      toolMessages.push({
        type: "function_call_output",
        call_id: toolCallId,
        output: JSON.stringify(output),
      });
    }

    response = await withTimeout(
      (signal) => {
        const body = addTemperatureIfSupported(
          {
            model,
            max_output_tokens,
            previous_response_id: response.id,
            input: toolMessages,
            tools,
            tool_choice: "auto",
            reasoning: { effort: reasoningEffort },
            text: { verbosity: "medium" as const },
          },
          model,
        );
        return openai.responses.create(body, { signal } as any);
      },
      20000,
    );
  }

  if (
    response?.status === "incomplete" &&
    response?.incomplete_details?.reason === "max_output_tokens"
  ) {
    response = await withTimeout(
      (signal) => {
        const body = addTemperatureIfSupported(
          {
            model: MODEL_SMART,
            max_output_tokens: Math.max(max_output_tokens * 2, 1200),
            previous_response_id: response.id,
            input: [{ role: "user", content: "Answer in 5 short bullet points." }],
            tools,
            tool_choice: "auto",
            reasoning: { effort: reasoningEffort },
            text: { verbosity: "medium" as const },
          },
          MODEL_SMART,
        );
        return openai.responses.create(body, { signal } as any);
      },
      20000,
    );
  }

  const text = extractText(response);
  if (!text) {
    console.log("EMPTY RESPONSE DEBUG:", JSON.stringify(response, null, 2));
  }
  return { message: text || "I couldn't generate a response. Try again." };
}
