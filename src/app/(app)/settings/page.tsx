import { requireOnboardedUser } from "@/lib/onboarding";
import { t, tJSON, type Locale } from "@/lib/i18n";
import { LanguageToggle } from "@/app/(app)/components/language-toggle";
import { ProfileForm } from "./profile-form";

export default async function SettingsPage() {
  const user = await requireOnboardedUser();
  const locale = (user.locale as Locale) ?? "en";
  const notifications = tJSON("settings.notificationItems", locale, [] as string[]);
  const navCards = tJSON(
    "settings.navCards",
    locale,
    [] as Array<{ title: string; detail: string }>,
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{t("settings.title", locale)}</h1>
          <p className="text-muted">{t("settings.intro", locale)}</p>
        </div>
        <button className="pill bg-emerald-500 text-white border-transparent shadow-[0_10px_24px_rgba(121,211,198,0.32)] hover:brightness-105">
          {t("settings.save", locale)}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-lg border border-border/80 bg-white p-6 shadow-sm">
          <div>
            <p className="pill bg-white/80 text-emerald-700 border-emerald-500/30">
              {t("settings.profilePill", locale)}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-ink">
              {t("settings.profileTitle", locale)}
            </h2>
            <p className="text-muted">{t("settings.profileIntro", locale)}</p>
          </div>
          <ProfileForm
            locale={locale}
            initial={{
              name: user.name,
              username: user.username,
              imageUrl: user.imageUrl,
              email: user.email,
            }}
          />
          <div className="space-y-2">
            <label className="text-sm text-ink">{t("settings.timezone", locale)}</label>
            <select
              className="w-full rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
              title={t("settings.helpers.timezone", locale)}
            >
              <option>UTC</option>
              <option>ET (UTC-5)</option>
              <option>PT (UTC-8)</option>
            </select>
            <p className="text-xs text-muted">{t("settings.helpers.timezone", locale)}</p>
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-border/80 bg-white p-6 shadow-sm">
          <div>
            <p className="pill bg-white/80 text-emerald-700 border-emerald-500/30">
              {t("settings.languageTitle", locale)}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-ink">
              {t("settings.languageTitle", locale)}
            </h2>
            <p className="text-muted">{t("settings.languageIntro", locale)}</p>
          </div>
          <div className="space-y-2">
            <LanguageToggle locale={locale} />
            <p className="text-xs text-muted">{t("settings.helpers.language", locale)}</p>
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-border/80 bg-white p-6 shadow-sm">
          <div>
            <p className="pill bg-white/80 text-navy-700 border-navy-500/30">
              {t("settings.notificationsPill", locale)}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-ink">
              {t("settings.notificationsTitle", locale)}
            </h2>
            <p className="text-muted">{t("settings.notificationsIntro", locale)}</p>
          </div>
          <div className="space-y-4">
            {notifications.map((item) => (
              <label
                key={item}
                className="flex items-center justify-between rounded-md border border-border/80 bg-white px-4 py-3 text-sm text-ink"
              >
                <span>{item}</span>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-border/80 bg-white p-6 shadow-sm lg:col-span-2">
          <div>
            <p className="pill bg-white/80 text-emerald-700 border-emerald-500/30">
              {t("settings.navGuidePill", locale)}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-ink">
              {t("settings.navGuideTitle", locale)}
            </h2>
            <p className="text-muted">{t("settings.navGuideIntro", locale)}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {navCards.map((item) => (
              <div
                key={item.title}
                className="rounded-md border border-border/80 bg-white p-4 text-sm"
              >
                <p className="font-semibold text-ink">{item.title}</p>
                <p className="text-muted">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
