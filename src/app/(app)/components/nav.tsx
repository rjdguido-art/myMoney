"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { t, type Locale } from "@/lib/i18n";
import { useMediaQuery } from "@/lib/use-media-query";
import { LanguageToggle } from "./language-toggle";
import { openQuickAddTransaction } from "./quick-add-transaction";

const links = [
  { href: "/dashboard", labelKey: "nav.dashboard" },
  { href: "/leaderboard", labelKey: "nav.leaderboard" },
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
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [onboarded, setOnboarded] = useState(true);
  const [overflowState, setOverflowState] = useState(() => ({
    open: false,
    path: pathname,
  }));
  const [menuState, setMenuState] = useState(() => ({
    open: false,
    path: pathname,
  }));
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
        setOverflowState({ open: false, path: pathname });
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOverflowState({ open: false, path: pathname });
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [pathname]);

  const overflowOpen = overflowState.open && overflowState.path === pathname;
  const menuOpen = !isDesktop && menuState.open && menuState.path === pathname;

  const disabledLinks = new Set(["/budgets", "/bills", "/insights"]);
  const overflowLinks = new Set(["/onboarding", "/auth"]);
  const primaryLinks = links.filter((link) => !overflowLinks.has(link.href));
  const extraLinks = links.filter((link) => overflowLinks.has(link.href));

  if (!isDesktop) {
    return (
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur">
        <nav className="border-b border-border/70 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full shadow-[0_10px_30px_rgba(11,35,71,0.35)]">
          <Image
            src="/argo-logo.png"
            alt="ArgoBucks logo"
            width={48}
            height={48}
            className="h-full w-full scale-[1.12] object-cover"
          />
        </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-muted">ArgoBucks</p>
              <p className="text-sm font-semibold text-ink">
                {String(t("nav.brandTagline", locale))}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setMenuState((prev) => ({
                open: prev.path === pathname ? !prev.open : true,
                path: pathname,
              }))
            }
            className="rounded-sm border border-border/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>

        {menuOpen ? (
          <div id="mobile-nav" className="mt-4 space-y-4">
            <div className="grid gap-2">
              {[...primaryLinks, ...extraLinks].map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/dashboard" && pathname.startsWith(link.href));
                const isDisabled = !onboarded && disabledLinks.has(link.href);
                const linkClass = [
                  "rounded-sm px-3 py-2 text-sm font-medium transition-all duration-200 ease-out",
                  isActive
                    ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/30"
                    : "text-ink/80 hover:bg-card hover:text-ink border border-transparent hover:border-border/80",
                ].join(" ");

                if (isDisabled) {
                  return (
                    <span
                      key={link.href}
                      className="rounded-sm px-3 py-2 text-sm font-medium text-muted/70 border border-dashed border-border/70 cursor-not-allowed"
                      title="Complete onboarding first"
                      aria-disabled="true"
                    >
                      {String(t(link.labelKey, locale))}
                    </span>
                  );
                }
                return (
                  <Link key={link.href} href={link.href} className={linkClass}>
                    {String(t(link.labelKey, locale))}
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LanguageToggle locale={locale} variant="compact" />
              <button
                type="button"
                onClick={openQuickAddTransaction}
                className="pill inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-sky-500 text-white border-transparent shadow-[0_12px_32px_rgba(121,211,198,0.35)] hover:brightness-105 transition"
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
          </div>
        ) : null}
        </nav>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-30 bg-white/90 backdrop-blur">
      <nav className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-6 py-4 lg:px-10">
        <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full shadow-[0_10px_30px_rgba(11,35,71,0.35)]">
          <Image
            src="/argo-logo.png"
            alt="ArgoBucks logo"
            width={48}
            height={48}
            className="h-full w-full scale-[1.12] object-cover"
          />
        </div>
          <div>
            <p className="text-sm uppercase tracking-[0.12em] text-muted">ArgoBucks</p>
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
              "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ease-out",
              isActive
                ? "bg-emerald-500/12 text-emerald-700"
                : "text-ink/80 hover:bg-card hover:text-ink",
            ].join(" ");

            if (isDisabled) {
              return (
                <span
                  key={link.href}
                  className="rounded-full px-4 py-2 text-sm font-medium text-muted/70 border border-dashed border-border/70 cursor-not-allowed"
                  title="Complete onboarding first"
                  aria-disabled="true"
                >
                  {String(t(link.labelKey, locale))}
                </span>
              );
            }
            return (
              <Link key={link.href} href={link.href} className={linkClass}>
                {String(t(link.labelKey, locale))}
              </Link>
            );
          })}
          <div ref={overflowRef} className="relative">
            <button
              type="button"
              onClick={() =>
                setOverflowState((prev) => ({
                  open: prev.path === pathname ? !prev.open : true,
                  path: pathname,
                }))
              }
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-white text-ink/70 transition-all duration-200 ease-out hover:bg-card hover:text-ink hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
              aria-haspopup="menu"
              aria-expanded={overflowOpen}
              aria-label="More navigation"
            >
              <span className="text-lg font-semibold tracking-[0.2em]">...</span>
            </button>
            {overflowOpen ? (
              <div
                className="nav-menu absolute right-0 top-12 z-20 w-48 rounded-md border border-border/80 bg-white/95 p-2 shadow-md backdrop-blur-sm"
                role="menu"
              >
                {extraLinks.map((link) => {
                  const isActive =
                    pathname === link.href ||
                    (link.href !== "/dashboard" && pathname.startsWith(link.href));
                  const isDisabled = !onboarded && disabledLinks.has(link.href);
                  const linkClass = [
                    "nav-menu-item flex w-full items-center rounded-sm px-3 py-2 text-sm font-medium transition-all duration-200 ease-out",
                    isActive
                      ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/30"
                      : "text-ink/80 hover:bg-card hover:text-ink border border-transparent hover:border-border/80",
                  ].join(" ");

                  if (isDisabled) {
                    return (
                      <span
                        key={link.href}
                        className="nav-menu-item rounded-sm px-3 py-2 text-sm font-medium text-muted/70 border border-dashed border-border/70 cursor-not-allowed"
                        title="Complete onboarding first"
                        aria-disabled="true"
                        role="menuitem"
                      >
                        {String(t(link.labelKey, locale))}
                      </span>
                    );
                  }
                  return (
                    <Link key={link.href} href={link.href} className={linkClass} role="menuitem">
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
          <Link
            href="/chat"
            className="pill inline-flex items-center gap-2 border border-border/80 bg-white/80 text-ink hover:bg-card"
          >
            Assistant
          </Link>
          <button
            type="button"
            onClick={openQuickAddTransaction}
            className="pill inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-sky-500 text-white border-transparent shadow-[0_12px_32px_rgba(121,211,198,0.35)] hover:brightness-105 transition"
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
    </div>
  );
}
