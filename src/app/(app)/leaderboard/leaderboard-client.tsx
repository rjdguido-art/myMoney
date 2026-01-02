"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

type LeaderboardClientProps = {
  locale: Locale;
};

export function LeaderboardClient({ locale }: LeaderboardClientProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!identifier.trim()) return;
    setStatus("saving");
    setError(null);

    const res = await fetch("/api/network", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t("leaderboard.addError", locale));
      setStatus("error");
      return;
    }

    setStatus("saved");
    setIdentifier("");
    router.refresh();
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <label className="text-sm text-ink">{t("leaderboard.addLabel", locale)}</label>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          className="min-w-[220px] flex-1 rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
          placeholder={t("leaderboard.addPlaceholder", locale)}
        />
        <button
          type="submit"
          className="pill bg-emerald-500 text-white border-transparent shadow-[0_10px_24px_rgba(121,211,198,0.32)] hover:brightness-105 disabled:opacity-60"
          disabled={status === "saving"}
        >
          {status === "saving"
            ? t("leaderboard.addSaving", locale)
            : t("leaderboard.addAction", locale)}
        </button>
      </div>
      {status === "saved" ? (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
          {t("leaderboard.addSuccess", locale)}
        </p>
      ) : null}
      {status === "error" && error ? (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">
          {error}
        </p>
      ) : null}
    </form>
  );
}
