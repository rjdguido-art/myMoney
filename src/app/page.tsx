"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headlineLines = ["Make money feel", "local, clear, calm."];
  const stats = [
    { label: "Weekly check-in", value: "5 min" },
    { label: "Bills tracked", value: "Unlimited" },
  ];
  let letterIndex = 0;
  const renderLine = (line: string) =>
    line.split("").map((char, index) => {
      const delay = `${letterIndex * 28}ms`;
      letterIndex += 1;
      const isSpace = char === " ";
      return (
        <span
          key={`${line}-${index}`}
          className={`home-hero-letter${isSpace ? " home-hero-space" : ""}`}
          style={isSpace ? undefined : { animationDelay: delay }}
          aria-hidden="true"
        >
          {isSpace ? " " : char}
        </span>
      );
    });

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl: "/dashboard",
    });

    if (result?.error) {
      setSubmitting(false);
      setError("Invalid credentials");
      return;
    }

    try {
      window.sessionStorage.setItem("argo-login-transition", "1");
    } catch {
      // Transition is optional.
    }

    try {
      const res = await fetch("/api/onboarding");
      if (res.ok) {
        const data = await res.json();
        if (!data.onboarded) {
          router.push("/welcome");
          return;
        }
      }
    } catch {
      // Fall back to the dashboard if onboarding status can't be checked.
    } finally {
      setSubmitting(false);
    }

    router.push("/dashboard");
  };
  const openSignIn = () => {
    setError(null);
    setShowSignIn(true);
  };
  const closeSignIn = () => {
    setShowSignIn(false);
    setSubmitting(false);
  };

  return (
    <main className="home-shell">
      <div className="home-bg" aria-hidden="true">
        <video
          className="home-video-bg"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        >
          <source
            src="https://presspersona.blob.core.windows.net/images/hachi%20in%20the%20sky.mp4"
            type="video/mp4"
          />
        </video>
        <div className="home-grid" />
        <div className="home-shape home-shape--sun" />
        <div className="home-shape home-shape--sky" />
        <div className="home-shape home-shape--cloud" />
        <div className="home-blur home-blur--one" />
        <div className="home-blur home-blur--two" />
        <div className="home-blur home-blur--three" />
      </div>

      <div className="relative z-10">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
          <div className="flex items-center gap-3">
            <img
              src="/argo-logo.png"
              alt="ArgoBucks logo"
              className="h-12 w-12 rounded-full object-cover scale-[1.08]"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-ink/60">ArgoBucks</p>
              <p className="text-sm font-semibold text-ink/80">Feel in control</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-ink/70 md:flex">
            <a href="#features" className="hover:text-ink">
              Features
            </a>
            <a href="#flow" className="hover:text-ink">
              Flow
            </a>
            <a href="#cta" className="hover:text-ink">
              Get started
            </a>
            <button
              type="button"
              className="home-button home-button--ghost"
              onClick={openSignIn}
            >
              Sign in
            </button>
          </nav>
          <Link href="/signup" className="home-button home-button--primary md:hidden">
            Start free
          </Link>
        </header>

        <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-16 pt-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <p className="home-pill">Welcome to a calmer ledger</p>
            <div className="home-hero-title">
              <span className="sr-only">Make money feel local, clear, calm.</span>
              <span aria-hidden="true" className="home-hero-lines">
                {headlineLines.map((line) => (
                  <span key={line} className="home-hero-line">
                    {renderLine(line)}
                  </span>
                ))}
              </span>
            </div>
            <p className="max-w-xl text-lg text-ink/70">
              A welcoming home for budgets, bills, and insights that keeps you steady and clear.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/signup" className="home-button home-button--primary">
                Create your home view
              </Link>
            </div>
            <div className="home-divider" />
            <div className="flex flex-wrap gap-6 text-sm text-ink/70">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold text-ink">{stat.value}</span>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="home-card grid gap-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-ink/50">Preview</p>
                <p className="text-lg font-semibold text-ink">Inside ArgoBucks</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <img
                src="/login/feature-1.png"
                alt="Dashboard snapshot"
                className="h-40 w-full rounded-2xl border border-ink/10 bg-white object-cover"
              />
              <img
                src="/login/feature-2.png"
                alt="Transactions snapshot"
                className="h-40 w-full rounded-2xl border border-ink/10 bg-white object-cover"
              />
              <img
                src="/login/feature-3.png"
                alt="Budgeting snapshot"
                className="h-40 w-full rounded-2xl border border-ink/10 bg-white object-cover"
              />
              <img
                src="/login/feature-4.png"
                alt="Insights snapshot"
                className="h-40 w-full rounded-2xl border border-ink/10 bg-white object-cover"
              />
            </div>
          </div>
        </section>
      </div>

      {showSignIn ? (
        <div
          className="home-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={closeSignIn}
        >
          <div className="home-modal" onClick={(event) => event.stopPropagation()}>
            <div className="home-modal-header">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-ink/50">
                  Sign in
                </p>
                <p className="text-lg font-semibold text-ink">Welcome back</p>
              </div>
              <button
                type="button"
                className="home-modal-close"
                onClick={closeSignIn}
                aria-label="Close sign in"
              >
                ✕
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleSignIn}>
              <div className="space-y-2">
                <label className="text-sm text-ink/80">Email</label>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  required
                  className="w-full rounded-sm border border-ink/10 bg-white/90 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-ink/80">Password</label>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  required
                  className="w-full rounded-sm border border-ink/10 bg-white/90 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <button
                type="submit"
                disabled={submitting}
                className="home-button home-button--primary w-full justify-center"
              >
                {submitting ? "Signing in..." : "Sign in"}
              </button>
              <div className="flex items-center justify-between text-sm text-ink/60">
                <Link href="/signup" className="hover:text-ink">
                  Create account
                </Link>
                <Link href="/forgot" className="hover:text-ink">
                  Forgot password
                </Link>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
