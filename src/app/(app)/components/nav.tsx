"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!overflowRef.current) return;
      if (!overflowRef.current.contains(event.target as Node)) {
        setOverflowOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOverflowOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  useEffect(() => {
    setOverflowOpen(false);
  }, [pathname]);

  const disabledLinks = new Set(["/budgets", "/bills", "/insights"]);
  const overflowLinks = new Set(["/onboarding", "/auth"]);
  const primaryLinks = links.filter((link) => !overflowLinks.has(link.href));
  const extraLinks = links.filter((link) => overflowLinks.has(link.href));

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-white/70 px-4 py-3 shadow-[0_12px_35px_rgba(5,63,43,0.08)] backdrop-blur transition-shadow duration-300 ease-out hover:shadow-[0_18px_45px_rgba(5,63,43,0.12)]">
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
        {primaryLinks.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/dashboard" && pathname.startsWith(link.href));
          const isDisabled = !onboarded && disabledLinks.has(link.href);
          const linkClass = [
            "rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-out",
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
        <div ref={overflowRef} className="relative">
          <button
            type="button"
            onClick={() => setOverflowOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-white/80 text-ink/70 transition-all duration-200 ease-out hover:bg-card hover:text-ink hover:shadow-[0_8px_20px_rgba(5,63,43,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            aria-haspopup="menu"
            aria-expanded={overflowOpen}
            aria-label="More navigation"
          >
            <span className="text-lg font-semibold tracking-[0.2em]">...</span>
          </button>
          {overflowOpen ? (
            <div
              className="nav-menu absolute right-0 top-12 z-20 w-48 rounded-xl border border-border/80 bg-white/95 p-2 shadow-[0_16px_40px_rgba(5,63,43,0.18)] backdrop-blur"
              role="menu"
            >
              {extraLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/dashboard" && pathname.startsWith(link.href));
                const isDisabled = !onboarded && disabledLinks.has(link.href);
                const linkClass = [
                  "nav-menu-item flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-out",
                  isActive
                    ? "bg-emerald-500 text-white shadow-[0_10px_25px_rgba(22,163,74,0.35)]"
                    : "text-ink/80 hover:bg-card hover:text-ink border border-transparent hover:border-border",
                ].join(" ");

                if (isDisabled) {
                  return (
                    <span
                      key={link.href}
                      className="nav-menu-item rounded-lg px-3 py-2 text-sm font-medium text-muted/70 border border-dashed border-border/60 cursor-not-allowed"
                      title="Complete onboarding first"
                      aria-disabled="true"
                      role="menuitem"
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
                    role="menuitem"
                  >
                    {String(t(link.labelKey, locale))}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
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
