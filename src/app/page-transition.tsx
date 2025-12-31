"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const LOGIN_TRANSITION_KEY = "argo-login-transition";

export default function PageTransition() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);

  useEffect(() => {
    let shouldAnimate = false;
    try {
      shouldAnimate = window.sessionStorage.getItem(LOGIN_TRANSITION_KEY) === "1";
    } catch {
      shouldAnimate = false;
    }
    if (!shouldAnimate) return;

    setActive(true);
    const timeout = window.setTimeout(() => setActive(false), 720);
    try {
      window.sessionStorage.removeItem(LOGIN_TRANSITION_KEY);
    } catch {
      // Best-effort cleanup only.
    }
    return () => window.clearTimeout(timeout);
  }, [pathname, searchParams]);

  return <div className={`page-transition${active ? " is-active" : ""}`} />;
}
