"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type Preset = {
  p1x: string;
  p1y: string;
  p2x: string;
  p2y: string;
  p3x: string;
  p3y: string;
};

const PRESETS: Record<string, Preset> = {
  "/": { p1x: "18%", p1y: "20%", p2x: "78%", p2y: "28%", p3x: "55%", p3y: "85%" },
  "/login": { p1x: "24%", p1y: "62%", p2x: "74%", p2y: "16%", p3x: "36%", p3y: "28%" },
  "/signup": { p1x: "70%", p1y: "62%", p2x: "28%", p2y: "22%", p3x: "62%", p3y: "18%" },
  "/forgot": { p1x: "30%", p1y: "70%", p2x: "68%", p2y: "18%", p3x: "42%", p3y: "30%" },
  "/onboarding": { p1x: "62%", p1y: "18%", p2x: "22%", p2y: "30%", p3x: "78%", p3y: "70%" },
  "/dashboard": { p1x: "42%", p1y: "18%", p2x: "82%", p2y: "72%", p3x: "18%", p3y: "72%" },
  "/transactions": { p1x: "30%", p1y: "24%", p2x: "84%", p2y: "60%", p3x: "22%", p3y: "80%" },
  "/budgets": { p1x: "26%", p1y: "22%", p2x: "70%", p2y: "26%", p3x: "52%", p3y: "86%" },
  "/bills": { p1x: "60%", p1y: "20%", p2x: "18%", p2y: "26%", p3x: "78%", p3y: "78%" },
  "/insights": { p1x: "20%", p1y: "30%", p2x: "78%", p2y: "18%", p3x: "64%", p3y: "82%" },
  "/settings": { p1x: "34%", p1y: "16%", p2x: "74%", p2y: "28%", p3x: "24%", p3y: "74%" },
  "/(app)": { p1x: "42%", p1y: "18%", p2x: "82%", p2y: "72%", p3x: "18%", p3y: "72%" },
};

const KEYS = ["--p1x", "--p1y", "--p2x", "--p2y", "--p3x", "--p3y"] as const;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function MorphingBackground() {
  const pathname = usePathname();
  const rafId = useRef<number | null>(null);
  const loopTimer = useRef<number | null>(null);

  useEffect(() => {
    const root = document.documentElement;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (reduceMotion) return;

    const getVarPercent = (name: (typeof KEYS)[number]) => {
      const v = getComputedStyle(root).getPropertyValue(name).trim();
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };

    const setVarPercent = (name: (typeof KEYS)[number], n: number) => {
      root.style.setProperty(name, `${n}%`);
    };

    const tweenTo = (target: Preset, durationMs = 1500) => {
      if (rafId.current) cancelAnimationFrame(rafId.current);

      const start = performance.now();
      const from: Record<(typeof KEYS)[number], number> = {
        "--p1x": getVarPercent("--p1x"),
        "--p1y": getVarPercent("--p1y"),
        "--p2x": getVarPercent("--p2x"),
        "--p2y": getVarPercent("--p2y"),
        "--p3x": getVarPercent("--p3x"),
        "--p3y": getVarPercent("--p3y"),
      };
      const to: Record<(typeof KEYS)[number], number> = {
        "--p1x": parseFloat(target.p1x),
        "--p1y": parseFloat(target.p1y),
        "--p2x": parseFloat(target.p2x),
        "--p2y": parseFloat(target.p2y),
        "--p3x": parseFloat(target.p3x),
        "--p3y": parseFloat(target.p3y),
      };

      const frame = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const e = easeInOutCubic(t);

        for (const k of KEYS) {
          const v = from[k] + (to[k] - from[k]) * e;
          setVarPercent(k, v);
        }

        if (t < 1) rafId.current = requestAnimationFrame(frame);
      };

      rafId.current = requestAnimationFrame(frame);
    };

    const clamp = (n: number, min = 10, max = 90) => Math.max(min, Math.min(max, n));

    const randomNearCurrent = (): Preset => {
      const cur = {
        p1x: getVarPercent("--p1x"),
        p1y: getVarPercent("--p1y"),
        p2x: getVarPercent("--p2x"),
        p2y: getVarPercent("--p2y"),
        p3x: getVarPercent("--p3x"),
        p3y: getVarPercent("--p3y"),
      };
      const jitter = (v: number) => clamp(v + (Math.random() * 16 - 8));
      return {
        p1x: `${jitter(cur.p1x)}%`,
        p1y: `${jitter(cur.p1y)}%`,
        p2x: `${jitter(cur.p2x)}%`,
        p2y: `${jitter(cur.p2y)}%`,
        p3x: `${jitter(cur.p3x)}%`,
        p3y: `${jitter(cur.p3y)}%`,
      };
    };

    const preset = PRESETS[pathname] ?? PRESETS["/"];

    tweenTo(preset, 1400);

    const loop = () => {
      tweenTo(randomNearCurrent(), 2600);
      loopTimer.current = window.setTimeout(loop, 2600);
    };
    loopTimer.current = window.setTimeout(loop, 1600);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (loopTimer.current) window.clearTimeout(loopTimer.current);
    };
  }, [pathname]);

  return <div className="morph-bg fixed inset-0 -z-10 bg-[#020408]" aria-hidden="true" />;
}
