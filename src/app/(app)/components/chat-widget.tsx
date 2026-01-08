"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createParser } from "eventsource-parser";
import { AnimatePresence, motion } from "framer-motion";
import { useFirebaseUser } from "./use-firebase-user";

type Msg = { role: "user" | "assistant"; content: string };
const STORAGE_KEY = "mymoney-chat-v1";

export function ChatWidget() {
  const { user } = useFirebaseUser();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hey! What do you want to do in the app?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasClientUser, setHasClientUser] = useState(false);
  const [ready, setReady] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw));
    } catch {}

    try {
      let found = false;
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i) || "";
        if (k.startsWith("firebase:authUser:")) {
          found = true;
          break;
        }
      }
      setHasClientUser(found);
    } catch {
      setHasClientUser(false);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [open, messages, loading]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading, open]);

  async function send() {
    if (!canSend) return;

    const userText = input.trim();
    setInput("");
    setLoading(true);

    let assistantIndex = -1;
    setMessages((prev) => {
      const next: Msg[] = [
        ...prev,
        { role: "user", content: userText },
        { role: "assistant", content: "" },
      ];
      assistantIndex = next.length - 1;
      return next;
    });

    try {
      const next = [...messages, { role: "user", content: userText }];
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) throw new Error("Bad response");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      const parser = createParser({
        onEvent: (event) => {
          if (event.event === "error") {
            const payload = JSON.parse(event.data || "{}") as { message?: string };
            throw new Error(payload.message || "Stream error");
          }

          const payload = JSON.parse(event.data || "{}") as { delta?: string };
          const delta = payload.delta ?? "";
          if (!delta) return;

          setMessages((prev) => {
            const nextMessages = prev.map((m) => ({ ...m }));
            const target = nextMessages[assistantIndex];
            if (target && target.role === "assistant") target.content += delta;
            return nextMessages;
          });
        },
      });

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value, { stream: true }));
      }
    } catch {
      setMessages((prev) => {
        const nextMessages = prev.map((m) => ({ ...m }));
        const target = nextMessages[assistantIndex];
        if (target?.role === "assistant" && target.content.length === 0) {
          target.content = "Something failed. Try again.";
        }
        return nextMessages;
      });
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return null;
  if (!user && !hasClientUser) return null;

  const ui = (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-[9999] rounded-full border border-white/20 bg-[#0b1938] px-5 py-3.5 text-base font-semibold text-white shadow-[0_22px_60px_rgba(6,12,28,0.45)] backdrop-blur"
        style={{ right: 24, left: "auto", bottom: 24 }}
        aria-label="Open chat"
      >
        {open ? "Close" : "Chat"}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="chat-widget"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-24 right-6 z-[9999] w-[380px] max-w-[92vw] overflow-hidden rounded-3xl border border-white/10 bg-[#0a142f]/95 shadow-[0_30px_90px_rgba(6,12,28,0.55)] backdrop-blur"
          >
            <div className="relative border-b border-white/10 px-4 py-3">
              <div className="text-sm font-semibold text-white">myMoney Assistant</div>
              <div className="text-[11px] text-white/60">Ask about spending, saving, and bills.</div>
              <div className="pointer-events-none absolute -top-6 right-10 h-16 w-16 rounded-full bg-cyan-400/20 blur-2xl" />
            </div>

            <div ref={scrollRef} className="h-[420px] overflow-y-auto px-4 py-4">
              <div className="flex flex-col gap-3">
                <AnimatePresence initial={false}>
                  {messages.map((m, i) => {
                    const isUser = m.role === "user";
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className={isUser ? "flex justify-end" : "flex justify-start"}
                      >
                        <div
                          className={[
                            "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed",
                            isUser
                              ? "border border-white/10 bg-[#0b2a55] text-white"
                              : "border border-white/10 bg-black/30 text-white/90",
                          ].join(" ")}
                        >
                          {m.content || (m.role === "assistant" && loading ? <TypingDots /> : "")}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="border-t border-white/10 p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  className="min-h-[48px] flex-1 resize-none rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/90 placeholder:text-white/40 outline-none focus:border-white/20"
                  placeholder="Ask myMoney…"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={!canSend}
                  className="h-[48px] rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white/10"
                >
                  Send
                </button>
              </div>
              <div className="mt-2 text-[11px] text-white/40">
                Enter to send, Shift+Enter for newline.
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );

  return createPortal(ui, document.body);
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60 [animation-delay:-0.2s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60 [animation-delay:-0.1s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60" />
    </span>
  );
}
