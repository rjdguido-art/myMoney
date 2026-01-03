"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { t, type Locale } from "@/lib/i18n";
import { useMediaQuery } from "@/lib/use-media-query";
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
      <div className="sticky top-0 z-30 app-nav">
        <nav className="border-b border-white/10 px-4 py-3">
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
                <p className="text-xs uppercase tracking-[0.12em] text-white/70">ArgoBucks</p>
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
              className="rounded-sm border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/90"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
            >
              {menuOpen ? "Close" : "Menu"}
            </button>
          </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/90 transition hover:bg-white/20"
          >
            Assistant
          </Link>
          <button
            type="button"
            onClick={openQuickAddTransaction}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:rgb(var(--app-nav))] shadow-[0_12px_32px_rgba(0,0,0,0.2)] transition hover:brightness-105"
            title="Quick add a transaction without leaving this page."
          >
            {String(t("nav.newTransaction", locale))}
          </button>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/90 transition hover:bg-white/20"
          >
            {String(t("nav.logOut", locale))}
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
                    ? "bg-white/15 text-white"
                    : "text-white/80 hover:bg-white/10",
                ].join(" ");

                if (isDisabled) {
                  return (
                    <span
                      key={link.href}
                      className="rounded-sm px-3 py-2 text-sm font-medium text-white/50 border border-dashed border-white/25 cursor-not-allowed"
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
          </div>
        ) : null}
        </nav>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-30 app-nav">
      <nav className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4 lg:px-10">
        <div className="flex items-start gap-4">
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
            <p className="text-sm uppercase tracking-[0.12em] text-white/70">ArgoBucks</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                href="/chat"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/90 transition hover:bg-white/20"
              >
                Assistant
              </Link>
              <button
                type="button"
                onClick={openQuickAddTransaction}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:rgb(var(--app-nav))] shadow-[0_12px_32px_rgba(0,0,0,0.2)] transition hover:brightness-105"
                title="Quick add a transaction without leaving this page."
              >
                {String(t("nav.newTransaction", locale))}
              </button>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/90 transition hover:bg-white/20"
              >
                {String(t("nav.logOut", locale))}
              </button>
            </div>
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
                ? "bg-white/15 text-white"
                : "text-white/80 hover:bg-white/10",
            ].join(" ");

            if (isDisabled) {
              return (
                <span
                  key={link.href}
                  className="rounded-full px-4 py-2 text-sm font-medium text-white/50 border border-dashed border-white/25 cursor-not-allowed"
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
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white/80 transition-all duration-200 ease-out hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              aria-haspopup="menu"
              aria-expanded={overflowOpen}
              aria-label="More navigation"
            >
              <span className="flex flex-col gap-1">
                <span className="h-0.5 w-4 rounded-full bg-current" />
                <span className="h-0.5 w-4 rounded-full bg-current" />
                <span className="h-0.5 w-4 rounded-full bg-current" />
              </span>
            </button>
            {overflowOpen ? (
              <div
                className="nav-menu absolute right-0 top-12 z-20 w-48 rounded-md border border-border/80 bg-white p-2 shadow-md"
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
                      ? "bg-[rgba(0,87,184,0.12)] text-[color:rgb(var(--app-nav))] border border-[rgba(0,87,184,0.3)]"
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
      </nav>
    </div>
  );
}
