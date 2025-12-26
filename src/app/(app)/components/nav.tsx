"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { t, type Locale } from "@/lib/i18n";
import { LanguageToggle } from "./language-toggle";
import { openQuickAddTransaction } from "./quick-add-transaction";

const links = [
  { href: "/dashboard", labelKey: "nav.dashboard" },
  { href: "/transactions", labelKey: "nav.transactions" },
  { href: "/budgets", labelKey: "nav.budgets" },
  { href: "/bills", labelKey: "nav.bills" },
  { href: "/guide", labelKey: "nav.guide" },
  { href: "/insights", labelKey: "nav.insights" },
  { href: "/settings", labelKey: "nav.settings" },
  { href: "/onboarding", labelKey: "nav.onboarding" },
  { href: "/auth", labelKey: "nav.auth" },
] as const;

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const locale = (session?.user?.locale as Locale) ?? "en";
  const [onboarded, setOnboarded] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadStatus = async () => {
      try {
        const res = await fetch("/api/onboarding", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted) {
          setOnboarded(Boolean(data.onboarded));
        }
      } catch {
        // Keep nav enabled if status can't be fetched.
      }
    };
    void loadStatus();
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const disabledLinks = new Set(["/budgets", "/bills", "/insights"]);

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-white/70 px-4 py-3 shadow-[0_12px_35px_rgba(5,63,43,0.08)] backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-navy-500 text-white shadow-[0_10px_30px_rgba(13,56,95,0.35)]">
          <span className="text-lg font-semibold">mm</span>
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.12em] text-muted">myMoney</p>
          <p className="text-base font-semibold text-ink">
            {String(t("nav.brandTagline", locale))}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/dashboard" && pathname.startsWith(link.href));
          const isDisabled = !onboarded && disabledLinks.has(link.href);
          const linkClass = [
            "rounded-lg px-3 py-2 text-sm font-medium transition",
            isActive
              ? "bg-emerald-500 text-white shadow-[0_10px_25px_rgba(22,163,74,0.35)]"
              : "text-ink/80 hover:bg-card hover:text-ink border border-transparent hover:border-border",
          ].join(" ");

          if (isDisabled) {
            return (
              <span
                key={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted/70 border border-dashed border-border/60 cursor-not-allowed"
                title="Complete onboarding first"
                aria-disabled="true"
              >
              {String(t(link.labelKey, locale))}
            </span>
          );
          }
          return (
            <Link
              key={link.href}
              href={link.href}
              className={linkClass}
            >
              {String(t(link.labelKey, locale))}
            </Link>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <LanguageToggle locale={locale} variant="compact" />
        <button
          type="button"
          onClick={openQuickAddTransaction}
          className="pill inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-sky-500 text-white border-transparent shadow-[0_12px_32px_rgba(34,197,143,0.35)] hover:brightness-105 transition"
          title="Quick add a transaction without leaving this page."
        >
          {String(t("nav.newTransaction", locale))}
        </button>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="pill inline-flex items-center gap-2 border border-border/80 bg-white/80 text-ink hover:bg-card"
        >
          {String(t("nav.logOut", locale))}
        </button>
      </div>
    </nav>
  );
}
