import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createResponseStreamWithRetry(payload: unknown, tries = 2) {
  let lastErr: unknown;
  for (let i = 0; i < tries; i += 1) {
    try {
      return await client.responses.create(payload as Record<string, unknown>);
    } catch (err: unknown) {
      lastErr = err;
      const code = (err as { code?: string; error?: { code?: string } })?.code
        ?? (err as { error?: { code?: string } })?.error?.code;
      if (code === "internal_error" && i < tries - 1) {
        await sleep(250 * Math.pow(2, i));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response("Missing OpenAI API key.", { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as {
    messages?: ChatMessage[];
    model?: string;
  } | null;
  const messages = body?.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "Missing messages[]" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    try {
      const stream = await createResponseStreamWithRetry(
        {
          model: body?.model ?? "gpt-5-nano",
          input: messages,
          stream: true,
        },
        2,
      );

      for await (const event of stream as AsyncIterable<{ type?: string; delta?: string; error?: unknown }>) {
        if (event.type === "response.output_text.delta") {
          const delta = event.delta ?? "";
          await writer.write(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
        }

        if (event.type === "response.completed") break;

        if (event.type === "error") {
          throw event.error ?? new Error("Upstream error event");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upstream error";
      try {
        await writer.write(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ message: msg })}\n\n`),
        );
      } catch {}
    } finally {
      try {
        await writer.close();
      } catch {}
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
