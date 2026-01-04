"use client";

import { useState } from "react";
import Link from "next/link";
import { useFirebaseUser } from "./use-firebase-user";

export function ChatWidget() {
  const { user } = useFirebaseUser();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <div className={`chat-widget ${open ? "is-open" : ""}`} aria-live="polite">
      <button
        type="button"
        className="chat-widget__button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="chat-widget-panel"
      >
        {open ? "Close chat" : "Chat"}
      </button>
      <div id="chat-widget-panel" className="chat-widget__panel" role="dialog" aria-modal="false">
        <div className="chat-widget__header">
          <p className="chat-widget__title">Argo Assistant</p>
          <p className="chat-widget__subtitle">Quick answers without leaving your page.</p>
        </div>
        <div className="chat-widget__body">
          <p className="chat-widget__hint">
            Jump into the full assistant for history and smarter summaries.
          </p>
          <Link href="/chat" className="chat-widget__cta">
            Open assistant
          </Link>
        </div>
      </div>
    </div>
  );
}
