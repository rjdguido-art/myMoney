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
  const featureCards = [
    {
      title: "Local budgets",
      description: "Shape plans around weekly, bi-weekly, or monthly rhythms instead of rigid rules.",
    },
    {
      title: "Bill radar",
      description: "Keep due dates in a soft timeline that highlights what needs attention now.",
    },
    {
      title: "Insight stories",
      description: "Translate trends into plain language so you know what changed and why.",
    },
  ];
  const flowSteps = [
    {
      title: "Set the tone",
      description: "Pick goals, add guardrails, and choose how you want to track progress.",
    },
    {
      title: "Stay in rhythm",
      description: "Review upcoming bills and adjust budgets with quick, focused check-ins.",
    },
    {
      title: "Act with confidence",
      description: "Spot leaks early and celebrate the wins that build momentum.",
    },
  ];
  const stats = [
    { label: "Views to explore", value: "3" },
    { label: "Weekly touchpoints", value: "5 min" },
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
              src="/icon.svg"
              alt="myMoney logo"
              className="h-10 w-10 rounded-md border border-black/10 bg-white/80 p-1"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-black/60">myMoney</p>
              <p className="text-sm font-semibold text-black/80">Feel in control</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-black/70 md:flex">
            <a href="#features" className="hover:text-black">
              Features
            </a>
            <a href="#flow" className="hover:text-black">
              Flow
            </a>
            <a href="#cta" className="hover:text-black">
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
            <p className="max-w-xl text-lg text-black/70">
              A welcoming home for budgets, bills, and insights that keeps you steady and clear.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/signup" className="home-button home-button--primary">
                Create your home view
              </Link>
              <button
                type="button"
                className="home-button home-button--ghost"
                onClick={openSignIn}
              >
                Sign in
              </button>
              <span className="text-sm text-black/60">
                No credit card needed.
              </span>
            </div>
            <div className="home-divider" />
            <div className="flex flex-wrap gap-6 text-sm text-black/70">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold text-black">{stat.value}</span>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="home-card grid gap-6 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-black/50">Snapshot</p>
                <p className="text-lg font-semibold text-black">This week</p>
              </div>
              <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/60">
                Live preview
              </span>
            </div>
            <div className="grid gap-4">
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-black/50">Cash flow</p>
                <p className="mt-2 text-2xl font-semibold text-black">$2,480</p>
                <p className="text-sm text-black/60">Up 12% from last week</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-black/50">Upcoming bills</p>
                <ul className="mt-3 space-y-2 text-sm text-black/70">
                  <li className="flex items-center justify-between">
                    <span>Rent</span>
                    <span className="font-semibold text-black">$980</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Utilities</span>
                    <span className="font-semibold text-black">$140</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Streaming</span>
                    <span className="font-semibold text-black">$24</span>
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-black/50">Budget pulse</p>
                <p className="mt-2 text-sm text-black/70">
                  Groceries are 8% under plan. Dining out is trending high.
                </p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-black/10">
                  <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-orange-400 to-blue-500" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 pb-16">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl space-y-3">
              <p className="home-pill">Built for real life</p>
              <h2 className="text-3xl font-semibold text-black">
                A home page that stays clear when life gets loud.
              </h2>
              <p className="text-black/70">
                myMoney pairs gentle structure with clear insight so your finances feel personal again.
                Budgeting, bills, and trends all in one grounded space.
              </p>
              <p className="text-black/70">
                Everything you need is one swipe away, with just enough detail to move fast.
              </p>
            </div>
            <Link href="/signup" className="home-button home-button--ghost">
              Start exploring
            </Link>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {featureCards.map((feature) => (
              <div key={feature.title} className="home-card p-6">
                <p className="text-lg font-semibold text-black">{feature.title}</p>
                <p className="mt-2 text-sm text-black/70">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="flow" className="mx-auto max-w-6xl px-6 pb-16">
          <div className="home-card grid gap-10 p-8 md:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <p className="home-pill">Your flow</p>
              <h3 className="text-2xl font-semibold text-black">
                A guided rhythm from first log-in to daily clarity.
              </h3>
              <p className="text-sm text-black/70">
                The welcome experience keeps your next step clear, whether you are setting up or
                checking in.
              </p>
            </div>
            <div className="grid gap-4">
              {flowSteps.map((step, index) => (
                <div
                  key={step.title}
                  className="flex gap-4 rounded-2xl border border-black/10 bg-white/80 p-4"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-sm font-semibold text-black">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-base font-semibold text-black">{step.title}</p>
                    <p className="text-sm text-black/70">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="cta" className="mx-auto max-w-6xl px-6 pb-20">
          <div className="home-card flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
            <div className="space-y-2">
              <p className="home-pill">Ready when you are</p>
              <h3 className="text-2xl font-semibold text-black">Bring calm to your money in minutes.</h3>
              <p className="text-sm text-black/70">
                Your welcome page becomes a living snapshot as soon as you sign in.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/signup" className="home-button home-button--primary">
                Start free
              </Link>
              <button
                type="button"
                className="home-button home-button--ghost"
                onClick={openSignIn}
              >
                I already have an account
              </button>
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
                <p className="text-xs uppercase tracking-[0.28em] text-black/50">
                  Sign in
                </p>
                <p className="text-lg font-semibold text-black">Welcome back</p>
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
                <label className="text-sm text-black/80">Email</label>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  required
                  className="w-full rounded-sm border border-black/10 bg-white/90 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-black/80">Password</label>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  required
                  className="w-full rounded-sm border border-black/10 bg-white/90 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
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
              <div className="flex items-center justify-between text-sm text-black/60">
                <Link href="/signup" className="hover:text-black">
                  Create account
                </Link>
                <Link href="/forgot" className="hover:text-black">
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
