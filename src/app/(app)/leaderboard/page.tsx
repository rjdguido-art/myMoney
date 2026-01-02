import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/onboarding";
import { getLeaderboard } from "@/lib/gamification";
import { t, type Locale } from "@/lib/i18n";
import { LeaderboardClient } from "./leaderboard-client";

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default async function LeaderboardPage() {
  const user = await requireOnboardedUser();
  const locale = (user.locale as Locale) ?? "en";
  const scores = await getLeaderboard({ prisma, userId: user.id });
  const current = scores.find((entry) => entry.userId === user.id);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            {t("leaderboard.title", locale)}
          </h1>
          <p className="text-muted">{t("leaderboard.intro", locale)}</p>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-border/60 bg-white/95 p-6 shadow-[0_12px_30px_rgba(11,35,71,0.08)]">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
            {t("leaderboard.thisWeek", locale)}
          </h2>
          <p className="mt-3 text-3xl font-semibold text-ink">
            {current ? formatPercent(current.percentSaved) : "0%"}
          </p>
          <p className="mt-2 text-sm text-muted">{t("leaderboard.percentSaved", locale)}</p>
          <div className="mt-4 flex flex-wrap gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">
                {t("leaderboard.points", locale)}
              </p>
              <p className="text-lg font-semibold text-ink">{current?.points ?? 0}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">
                {t("leaderboard.weeklySpend", locale)}
              </p>
              <p className="text-lg font-semibold text-ink">
                {current ? Math.round(current.weeklySpent) : 0}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">
                {t("leaderboard.weeklyBudget", locale)}
              </p>
              <p className="text-lg font-semibold text-ink">
                {current ? Math.round(current.weeklyBudget) : 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-white/95 p-6 shadow-[0_12px_30px_rgba(11,35,71,0.08)]">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
            {t("leaderboard.addFriends", locale)}
          </h2>
          <p className="mt-2 text-sm text-muted">{t("leaderboard.addIntro", locale)}</p>
          <div className="mt-4">
            <LeaderboardClient locale={locale} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-white/95 p-6 shadow-[0_12px_30px_rgba(11,35,71,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              {t("leaderboard.boardTitle", locale)}
            </h2>
            <p className="text-sm text-muted">{t("leaderboard.boardIntro", locale)}</p>
          </div>
          <span className="pill bg-white/80 text-emerald-700 border-emerald-500/30">
            {t("leaderboard.pointsPill", locale)}
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {scores.map((entry, index) => (
            <div
              key={entry.userId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-emerald-500/10 text-sm font-semibold text-emerald-700">
                  #{index + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {entry.username ?? entry.name ?? t("leaderboard.anonymous", locale)}
                  </p>
                  <p className="text-xs text-muted">
                    {t("leaderboard.savedLabel", locale, {
                      percent: formatPercent(entry.percentSaved),
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-right">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">
                    {t("leaderboard.points", locale)}
                  </p>
                  <p className="text-base font-semibold text-ink">{entry.points}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">
                    {t("leaderboard.percent", locale)}
                  </p>
                  <p className="text-base font-semibold text-ink">
                    {formatPercent(entry.percentSaved)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {scores.length === 0 ? (
            <p className="text-sm text-muted">{t("leaderboard.empty", locale)}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
