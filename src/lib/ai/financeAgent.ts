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
  process.env.MYMONEY_AI_MAX_OUTPUT_TOKENS_FAST || 450,
);
const MAX_OUTPUT_TOKENS_SMART = Number(
  process.env.MYMONEY_AI_MAX_OUTPUT_TOKENS_SMART || 900,
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
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

function toOpenAIInput(messages: ChatMessage[]) {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

type ToolCall = {
  type: "tool_call" | "function_call";
  id?: string;
  name?: string;
  arguments?: string;
  function?: { name?: string };
};
type MessageContent = { type?: string; text?: string };
type OutputMessage = { type: "message"; content?: MessageContent[] };
type OutputItem = ToolCall | OutputMessage | { type?: string };
type ResponseLike = { output?: OutputItem[]; output_text?: string; id?: string };

function extractToolCalls(resp: ResponseLike) {
  const out = Array.isArray(resp?.output) ? resp.output : [];
  return out.filter(
    (item): item is ToolCall => item?.type === "function_call" || item?.type === "tool_call",
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

export async function runFinanceAgent(req: AgentRequest): Promise<AgentResponse> {
  const model = pickModel(req.messages);
  const max_output_tokens = pickMaxOutputTokens(req.messages);

  const tools = [
    {
      type: "function" as const,
      function: {
        name: "get_forecast",
        description:
          "Get a cashflow snapshot until next pay date, including bills due and safe-to-spend.",
        parameters: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "list_transactions",
        description:
          "List recent transactions for the signed-in user (supports date range, account/category filters, and text search).",
        parameters: {
          type: "object",
          properties: {
            from: { type: "string", description: "ISO date-time" },
            to: { type: "string", description: "ISO date-time" },
            categoryId: { type: "string" },
            accountId: { type: "string" },
            search: { type: "string" },
            limit: { type: "number", description: "1-200" },
          },
          additionalProperties: false,
        },
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

  let response = await openai.responses.create({
    model,
    max_output_tokens,
    input,
    tools,
    tool_choice: "auto",
  });

  // Tool loop
  for (let i = 0; i < 8; i += 1) {
    const toolCalls = extractToolCalls(response);
    if (!toolCalls.length) break;

    const toolMessages: Array<{ role: "tool"; tool_call_id?: string; output: string }> = [];

    for (const call of toolCalls) {
      const name = call?.name ?? call?.function?.name;
      const toolCallId = call?.id;

      let args: unknown = {};
      try {
        args = call?.arguments ? JSON.parse(call.arguments) : {};
      } catch {
        args = {};
      }

      let output: unknown = { error: "Unknown tool" };

      if (name === "get_forecast") {
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
      }

      if (name === "list_transactions") {
        const parsed = listTransactionsArgs.safeParse(args);
        if (!parsed.success) {
          output = { error: "Invalid filters", details: parsed.error.flatten() };
        } else {
          const where = buildTransactionWhere(req.userId, parsed.data);
          const take = parsed.data.limit ?? 50;
          const txns = await prisma.transaction.findMany({
            where,
            include: transactionInclude,
            orderBy: { postedAt: "desc" },
            take,
          });
          output = { count: txns.length, transactions: txns.map(serializeTransaction) };
        }
      }

      toolMessages.push({
        role: "tool",
        tool_call_id: toolCallId,
        output: JSON.stringify(output),
      });
    }

    response = await openai.responses.create({
      model,
      max_output_tokens,
      previous_response_id: response.id,
      input: toolMessages,
      tools,
      tool_choice: "auto",
    });
  }

  const text = extractText(response);
  return { message: text || "I couldn't generate a response. Try again." };
}
