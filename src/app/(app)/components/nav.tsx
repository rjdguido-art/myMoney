"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/budgets", label: "Budgets" },
  { href: "/bills", label: "Bills" },
  { href: "/insights", label: "Insights" },
  { href: "/settings", label: "Settings" },
  { href: "/onboarding", label: "Onboarding" },
  { href: "/auth", label: "Auth" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-white/70 px-4 py-3 shadow-[0_12px_35px_rgba(5,63,43,0.08)] backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-navy-500 text-white shadow-[0_10px_30px_rgba(13,56,95,0.35)]">
          <span className="text-lg font-semibold">mm</span>
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.12em] text-muted">myMoney</p>
          <p className="text-base font-semibold text-ink">Financial cockpit</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/dashboard" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={[
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-emerald-500 text-white shadow-[0_10px_25px_rgba(22,163,74,0.35)]"
                  : "text-ink/80 hover:bg-card hover:text-ink border border-transparent hover:border-border",
              ].join(" ")}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/transactions"
          className="pill inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-sky-500 text-white border-transparent shadow-[0_12px_32px_rgba(34,197,143,0.35)] hover:brightness-105 transition"
        >
          New Transaction
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="pill inline-flex items-center gap-2 border border-border/80 bg-white/80 text-ink hover:bg-card"
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
