"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const LOGIN_TRANSITION_KEY = "argo-login-transition";

export default function PageTransition() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const transitionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let shouldAnimate = false;
    try {
      shouldAnimate = window.sessionStorage.getItem(LOGIN_TRANSITION_KEY) === "1";
    } catch {
      shouldAnimate = false;
    }
    if (!shouldAnimate) return;

    if (!transitionRef.current) return;
    transitionRef.current.classList.add("is-active");
    const timeout = window.setTimeout(() => {
      transitionRef.current?.classList.remove("is-active");
    }, 720);
    try {
      window.sessionStorage.removeItem(LOGIN_TRANSITION_KEY);
    } catch {
      // Best-effort cleanup only.
    }
    return () => window.clearTimeout(timeout);
  }, [pathname, searchParams]);

  return <div ref={transitionRef} className="page-transition" />;
}
