import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { t, type Locale, type TranslationKey } from "@/lib/i18n";

export default async function GuidePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { locale: true },
  });
  const locale = (user?.locale as Locale) ?? "en";
  const text = (key: TranslationKey) => t(key, locale);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center px-6">
      <div className="w-full space-y-8 rounded-lg border border-border/80 bg-white p-10 shadow-sm">
        <div className="space-y-3">
          <p className="pill bg-emerald-500 text-white border-transparent shadow-[0_10px_24px_rgba(121,211,198,0.32)]">
            {text("guide.pill")}
          </p>
          <h1 className="text-3xl font-semibold text-ink">{text("guide.title")}</h1>
          <p className="text-muted">
            {text("guide.intro")}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-border/80 bg-white p-5 space-y-2">
            <h2 className="text-lg font-semibold text-ink">{text("guide.dashboardTitle")}</h2>
            <p className="text-sm text-muted">
              {text("guide.dashboardBody")}
            </p>
          </div>
          <div className="rounded-md border border-border/80 bg-white p-5 space-y-2">
            <h2 className="text-lg font-semibold text-ink">{text("guide.transactionsTitle")}</h2>
            <p className="text-sm text-muted">
              {text("guide.transactionsBody")}
            </p>
          </div>
          <div className="rounded-md border border-border/80 bg-white p-5 space-y-2">
            <h2 className="text-lg font-semibold text-ink">{text("guide.budgetsTitle")}</h2>
            <p className="text-sm text-muted">
              {text("guide.budgetsBody")}
            </p>
          </div>
          <div className="rounded-md border border-border/80 bg-white p-5 space-y-2">
            <h2 className="text-lg font-semibold text-ink">{text("guide.insightsTitle")}</h2>
            <p className="text-sm text-muted">
              {text("guide.insightsBody")}
            </p>
          </div>
          <div className="rounded-md border border-border/80 bg-white p-5 space-y-2 md:col-span-2">
            <h2 className="text-lg font-semibold text-ink">{text("guide.settingsTitle")}</h2>
            <p className="text-sm text-muted">
              {text("guide.settingsBody")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
