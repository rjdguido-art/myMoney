"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMediaQuery } from "@/lib/use-media-query";

const tabs = [
  { href: "/dashboard", label: "Home" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/budgets", label: "Budgets" },
  { href: "/bills", label: "Bills" },
  { href: "/insights", label: "Insights" },
  { href: "/chat", label: "Assistant" },
  { href: "/settings", label: "Settings" },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (isDesktop) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
      <div className="mx-auto w-[min(520px,92vw)] rounded-full border border-border/80 bg-white/95 px-3 py-2 shadow-[0_18px_40px_rgba(11,35,71,0.18)] backdrop-blur">
        <nav className="grid grid-cols-8 gap-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted">
          {tabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href !== "/dashboard" && pathname.startsWith(tab.href));
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 rounded-full px-2 py-2 text-center ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-700"
                    : "text-muted hover:text-ink"
                }`}
              >
                <span className="text-[0.62rem] leading-none">{tab.label}</span>
                <span
                  className={`h-1 w-1 rounded-full ${
                    isActive ? "bg-emerald-500" : "bg-transparent"
                  }`}
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
