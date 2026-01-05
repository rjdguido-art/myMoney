import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;
import { z } from "zod";
import { auth } from "@/lib/auth";
import { runFinanceAgent } from "@/lib/ai/financeAgent";

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1),
  locale: z.string().optional(),
  timezone: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await runFinanceAgent({
      userId: session.user.id,
      messages: parsed.data.messages,
      locale: parsed.data.locale ?? session.user.locale ?? undefined,
      timezone: parsed.data.timezone,
    });

    return NextResponse.json({ message: result.message });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err ?? "");
    if (msg.includes("aborted") || msg.includes("AbortError") || msg.includes("terminated")) {
      return NextResponse.json(
        { error: "AI request timed out. Please try again." },
        { status: 504 },
      );
    }
    console.error("AI CHAT ERROR:", err);
    return NextResponse.json({ error: msg || "Internal error" }, { status: 500 });
  }
}
