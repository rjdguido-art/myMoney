"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

type Msg = { role: "user" | "assistant"; content: string };

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function ChatPanel({ storageKey = "mymoney-chat" }: { storageKey?: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const listRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);
  const seenSetRef = useRef(new Set<string>());
  const seenQueueRef = useRef<string[]>([]);

  // Load history
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setMessages(JSON.parse(raw));
    } catch {}
  }, [storageKey]);

  // Save history
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-40)));
    } catch {}
  }, [messages, storageKey]);

  // Auto-scroll
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    if (sendingRef.current) return;
    sendingRef.current = true;

    setErr(null);
    setLoading(true);
    setInput("");

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const base: Msg[] = [...messages, { role: "user", content: text }];
    const assistantIndex = base.length;
    const optimistic: Msg[] = [...base, { role: "assistant", content: "" }];

    setMessages(optimistic);

    seenSetRef.current.clear();
    seenQueueRef.current = [];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ messages: base }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop() ?? "";

        for (const frameRaw of parts) {
          const frame = frameRaw.trim();
          if (!frame) continue;

          if (seenSetRef.current.has(frame)) continue;
          seenSetRef.current.add(frame);
          seenQueueRef.current.push(frame);

          if (seenQueueRef.current.length > 200) {
            const old = seenQueueRef.current.shift();
            if (old) seenSetRef.current.delete(old);
          }

          const isError = frame.includes("\nevent: error") || frame.startsWith("event: error");
          const dataLine = frame.split(/\r?\n/).find((line) => line.startsWith("data: "));

          if (!dataLine) continue;

          const payload = JSON.parse(dataLine.slice(6)) as { delta?: string; message?: string };

          if (isError) {
            throw new Error(payload.message || "Stream error");
          }

          const delta = payload.delta ?? "";
          if (!delta) continue;

          setMessages((prev) => {
            if (assistantIndex >= prev.length) return prev;
            const target = prev[assistantIndex];
            if (!target || target.role !== "assistant") return prev;

            const next = prev.slice();
            next[assistantIndex] = { ...target, content: target.content + delta };
            return next;
          });
        }
      }
    } catch (e: unknown) {
      if ((e as { name?: string })?.name === "AbortError") {
        // ignore aborts
      } else {
        setErr(e instanceof Error ? e.message : "Something went wrong.");
      }
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  function clearChat() {
    setMessages([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }

  return (
    <div className="relative flex h-screen w-full flex-col border border-[#1a2a4f] bg-gradient-to-b from-[#0b1326] via-[#0b152b] to-[#0c1f3a] text-white shadow-[0_28px_70px_rgba(3,10,30,0.6)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.45'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="flex items-center justify-between gap-3 border-b border-[#1d315a] bg-[#0e1a33]/70 px-4 py-3 backdrop-blur-xl">
        <div>
          <div className="text-sm font-semibold">myMoney Assistant</div>
          <div className="text-xs text-[#9fb0dd]">
            Ask about spending, saving, bills, and your plan.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="rounded-xl border border-[#243a6a] bg-[#132346] px-3 py-1.5 text-xs text-[#d3defe] hover:bg-[#1a2f5c]"
            type="button"
          >
            Back
          </button>
          <button
            onClick={clearChat}
            className="rounded-xl border border-[#243a6a] bg-[#132346] px-3 py-1.5 text-xs text-[#d3defe] hover:bg-[#1a2f5c]"
            type="button"
          >
            Clear
          </button>
        </div>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-[#20345f] bg-[#0f2144]/70 p-4 text-sm text-[#d9e3ff] backdrop-blur-md">
            Try:
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[#b4c4f0]">
              <li>“What can I safely spend until payday?”</li>
              <li>“Where did I overspend this month?”</li>
              <li>“Make a 30-day debt payoff plan.”</li>
            </ul>
          </div>
        ) : null}

        {messages.map((m, idx) => (
          <div
            key={idx}
            className={cx(
              "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
              m.role === "user"
                ? "ml-auto border border-[#2a4276] bg-[#162a55]/70 backdrop-blur-md"
                : "mr-auto border border-[#20345f] bg-[#0f2144]/70 backdrop-blur-md leading-7 tracking-[0.01em]",
            )}
          >
            <MessageContent role={m.role} content={m.content} />
          </div>
        ))}

        {err ? (
          <div className="rounded-2xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
            {err}
          </div>
        ) : null}
      </div>

      <div className="border-t border-[#1d315a] bg-[#0e1a33]/70 p-3 backdrop-blur-xl">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask myMoney…"
            className="min-h-[44px] flex-1 resize-none rounded-2xl border border-[#213863] bg-[#0b1a36]/70 px-4 py-3 text-sm text-white outline-none placeholder:text-[#8ea0d0] focus:border-[#2a4b8c] backdrop-blur-md"
          />
          <button
            onClick={() => void send()}
            disabled={!canSend}
            className={cx(
              "rounded-2xl px-4 py-3 text-sm font-semibold",
              canSend
                ? "bg-[#1f3b6a] text-white hover:bg-[#274776]"
                : "bg-[#1b2f5c] text-[#7c8fbf] cursor-not-allowed",
            )}
            type="button"
          >
            Send
          </button>
        </div>

        <div className="mt-2 text-xs text-[#8fa3d8]">
          Enter to send, Shift+Enter for newline.
        </div>
      </div>
    </div>
  );
}

function MessageContent({ role, content }: { role: "user" | "assistant"; content: string }) {
  // Users usually want literal text, assistants benefit from markdown formatting
  if (role === "user") {
    return <div className="whitespace-pre-wrap break-words">{content}</div>;
  }

  return (
    <div
      className={cx(
        "prose prose-invert prose-sm max-w-none break-words",
        "prose-p:my-2 prose-li:my-1 prose-ul:my-2 prose-ol:my-2",
        "prose-strong:text-white prose-a:text-[#9fd3ff] prose-a:no-underline hover:prose-a:underline",
        "prose-code:rounded prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:text-[#d7e7ff]",
        "prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl prose-pre:p-3",
        "prose-blockquote:border-l-[#3b82f6] prose-blockquote:bg-white/5 prose-blockquote:rounded-lg prose-blockquote:px-3 prose-blockquote:py-2",
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          // Keep inline code clean and avoid backticks styling getting weird
          code({ inline, children, ...props }) {
            if (inline) {
              return (
                <code className="rounded bg-white/10 px-1 py-0.5 text-[#d7e7ff]" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-3">
                <code className="text-[#d7e7ff]">{children}</code>
              </pre>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
