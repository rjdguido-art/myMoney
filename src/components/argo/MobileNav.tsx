"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Home,
  Sparkles,
  Target,
  User,
} from "lucide-react";

type MobileTab = {
  href: "/home" | "/transactions" | "/chat" | "/goals" | "/settings";
  label: string;
  icon: typeof Home;
  isCenter?: boolean;
};

const tabs: MobileTab[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/transactions", label: "Activity", icon: Activity },
  { href: "/chat", label: "AI", icon: Sparkles, isCenter: true },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/settings", label: "Profile", icon: User },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-4 left-1/2 z-40 w-[min(560px,92vw)] -translate-x-1/2 md:hidden"
      aria-label="Primary"
    >
      <div className="flex items-center justify-between gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--card)]/90 px-4 py-2 shadow-[0_18px_40px_rgba(13,19,22,0.22)] backdrop-blur">
        {tabs.map(({ href, label, icon: Icon, isCenter }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          const baseClasses =
            "flex flex-1 flex-col items-center gap-1 rounded-full px-2 py-2 text-xs font-medium transition";
          const stateClasses = isActive
            ? "text-[color:var(--text)] shadow-[0_0_20px_rgba(155,205,198,0.55)]"
            : "text-[color:var(--muted)]";

          return (
            <Link
              key={href}
              href={href}
              className={[
                baseClasses,
                stateClasses,
                isCenter
                  ? "-translate-y-2 bg-[color:var(--bg)]/80 shadow-[0_12px_28px_rgba(13,19,22,0.3)]"
                  : "",
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={isCenter ? "h-5 w-5" : "h-4 w-4"}
                style={
                  isActive
                    ? { filter: "drop-shadow(0 0 8px rgba(155,205,198,0.7))" }
                    : undefined
                }
              />
              <span className={isCenter ? "text-[11px]" : "text-[10px]"}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
