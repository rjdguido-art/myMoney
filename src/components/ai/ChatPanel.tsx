"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function ChatPanel({ storageKey = "mymoney-chat" }: { storageKey?: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);

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

    setErr(null);
    setLoading(true);
    setInput("");

    const nextMessages: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages, // the agent route already adds system server-side
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          locale: navigator.language,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Request failed (${res.status})`);
      }

      const data = (await res.json()) as { message: string };
      setMessages((m) => [...m, { role: "assistant", content: data.message || "No response." }]);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
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
    <div className="flex h-[calc(100vh-6rem)] flex-col rounded-2xl border border-white/10 bg-white/5">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <div className="text-sm font-semibold">myMoney Assistant</div>
          <div className="text-xs text-white/60">
            Ask about spending, saving, bills, and your plan.
          </div>
        </div>

        <button
          onClick={clearChat}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
          type="button"
        >
          Clear
        </button>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            Try:
            <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
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
                ? "ml-auto bg-white/10 border border-white/10"
                : "mr-auto bg-black/30 border border-white/10",
            )}
          >
            {m.content}
          </div>
        ))}

        {loading ? (
          <div className="mr-auto max-w-[85%] rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/70">
            Thinking…
          </div>
        ) : null}

        {err ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        ) : null}
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask myMoney…"
            className="min-h-[44px] flex-1 resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-white/40 focus:border-white/20"
          />
          <button
            onClick={() => void send()}
            disabled={!canSend}
            className={cx(
              "rounded-2xl px-4 py-3 text-sm font-semibold",
              canSend
                ? "bg-white text-black hover:bg-white/90"
                : "bg-white/20 text-white/50 cursor-not-allowed",
            )}
            type="button"
          >
            Send
          </button>
        </div>

        <div className="mt-2 text-xs text-white/50">
          Enter to send, Shift+Enter for newline.
        </div>
      </div>
    </div>
  );
}
