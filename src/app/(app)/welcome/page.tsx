import Link from "next/link";
import { requireNotOnboardedUser } from "@/lib/onboarding";
import { t, tJSON, type Locale } from "@/lib/i18n";

export default async function WelcomePage() {
  const user = await requireNotOnboardedUser();
  const locale = (user.locale as Locale) ?? "en";
  const firstName = user.name ? user.name.split(" ")[0] : t("welcome.defaultName", locale);
  const steps = tJSON("welcome.steps", locale, [] as string[]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-6">
      <div className="w-full space-y-6 rounded-lg border border-slate-200/70 bg-white p-10 shadow-sm">
        <div className="space-y-3">
          <p className="pill bg-emerald-500 text-white border-transparent shadow-[0_10px_24px_rgba(34,197,143,0.32)]">
            {t("welcome.pill", locale)}
          </p>
          <h1 className="text-3xl font-semibold text-ink">
            {t("welcome.title", locale, { name: firstName })}
          </h1>
          <p className="text-muted">
            {t("welcome.intro", locale)}
          </p>
        </div>

        <div className="rounded-md border border-slate-200/70 bg-white p-4 text-sm text-muted">
          <p className="font-semibold text-ink">{t("welcome.next", locale)}</p>
          <ul className="mt-2 space-y-1">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/onboarding"
            className="pill inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-sky-500 text-white border-transparent shadow-[0_12px_32px_rgba(34,197,143,0.35)] hover:brightness-105 transition"
          >
            {t("welcome.startSetup", locale)}
          </Link>
          <Link
            href="/guide"
            className="pill inline-flex items-center gap-2 border border-border/80 bg-white/80 text-ink hover:bg-card"
          >
            {t("welcome.viewGuide", locale)}
          </Link>
          <span className="text-sm text-muted">
            {t("welcome.footer", locale)}
          </span>
        </div>
      </div>
    </div>
  );
}
