"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
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
    <div className="flex h-screen w-full flex-col border border-[#1b2b57] bg-gradient-to-b from-[#0a1733] via-[#0a1733] to-[#0b1f4b] text-white shadow-[0_24px_60px_rgba(3,10,30,0.5)]">
      <div className="flex items-center justify-between gap-3 border-b border-[#1b2b57] bg-[#0b1735]/90 px-4 py-3">
        <div>
          <div className="text-sm font-semibold">myMoney Assistant</div>
          <div className="text-xs text-[#a8b6e6]">
            Ask about spending, saving, bills, and your plan.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="rounded-xl border border-[#223566] bg-[#122248] px-3 py-1.5 text-xs text-[#cbd8ff] hover:bg-[#162a5a]"
            type="button"
          >
            Back
          </button>
          <button
            onClick={clearChat}
            className="rounded-xl border border-[#223566] bg-[#122248] px-3 py-1.5 text-xs text-[#cbd8ff] hover:bg-[#162a5a]"
            type="button"
          >
            Clear
          </button>
        </div>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-[#1b2f61] bg-[#0f234f] p-4 text-sm text-[#d3ddff]">
            Try:
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[#b9c6f2]">
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
                ? "ml-auto border border-[#27407a] bg-[#1a2e63]"
                : "mr-auto border border-[#1b2f61] bg-[#0f234f]",
            )}
          >
            {m.content}
          </div>
        ))}

        {loading ? (
          <div className="mr-auto max-w-[85%] rounded-2xl border border-[#1b2f61] bg-[#0f234f] px-4 py-3 text-sm text-[#b9c6f2]">
            Thinking…
          </div>
        ) : null}

        {err ? (
          <div className="rounded-2xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
            {err}
          </div>
        ) : null}
      </div>

      <div className="border-t border-[#1b2b57] bg-[#0b1735]/90 p-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask myMoney…"
            className="min-h-[44px] flex-1 resize-none rounded-2xl border border-[#1c2f5d] bg-[#0a1a3b] px-4 py-3 text-sm text-white outline-none placeholder:text-[#8fa3d8] focus:border-[#2a4b8c]"
          />
          <button
            onClick={() => void send()}
            disabled={!canSend}
            className={cx(
              "rounded-2xl px-4 py-3 text-sm font-semibold",
              canSend
                ? "bg-[#e6efff] text-[#10254f] hover:bg-white"
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
