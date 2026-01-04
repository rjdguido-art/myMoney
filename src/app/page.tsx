"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { HeroLeft } from "@/components/landing/hero-left";
import { Navbar } from "@/components/landing/navbar";
import { SnapshotCard } from "@/components/landing/snapshot-card";
import { firebaseAuth } from "@/lib/firebase";

const heroMetrics = [
  { label: "Weekly summary email", value: "Sent every Friday" },
  { label: "Bills tracked for you", value: "Unlimited bills" },
  { label: "Check-in time", value: "About 5 minutes", trend: "No spreadsheets needed" },
  { label: "Safe-to-spend today", value: "$1,420", trend: "Up 12% vs last week" },
];

const upcomingBills = [
  { name: "Rent", amount: "$1,280" },
  { name: "Utilities", amount: "$180" },
  { name: "Subscriptions", amount: "$42" },
];

type AuthMode = "signin" | "signup";

export default function HomePage() {
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const isAuthOpen = Boolean(authMode);
  const router = useRouter();
  const authCopy = useMemo(() => {
    if (authMode === "signup") {
      return {
        title: "Create your ArgoBucks account",
        description: "Bring your budgets, bills, and goals into one clean space.",
        secondaryLabel: "Sign in instead",
        secondaryMode: "signin" as AuthMode,
      };
    }
    return {
      title: "Welcome back",
      description: "Pick up where you left off and see the latest snapshot.",
      secondaryLabel: "Create an account",
      secondaryMode: "signup" as AuthMode,
    };
  }, [authMode]);

  useEffect(() => {
    if (!isAuthOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAuthMode(null);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, [isAuthOpen]);

  return (
    <main className={`relative min-h-screen ${isAuthOpen ? "auth-open" : ""}`}>
      <div className="bg-aurora-pro">
        <div className="hero-video" aria-hidden="true">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            src="https://presspersona.blob.core.windows.net/images/BG%20Video.mp4"
          />
        </div>
        <div className="aurora-blobs" aria-hidden="true">
          <span className="aurora-blob aurora-blob--teal" />
          <span className="aurora-blob aurora-blob--gold" />
          <span className="aurora-blob aurora-blob--navy" />
        </div>
        <div className="aurora-noise" aria-hidden="true" />
        <div className="aurora-content">
          <Navbar onSignIn={() => setAuthMode("signin")} onSignUp={() => setAuthMode("signup")} />

          <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:px-10">
            <HeroLeft
              sectionId="hero"
              title="Make money feel local, clear, calm."
              description="A peaceful landing spot for budgets, bills, and insights that keeps every household decision steady and obvious."
              metrics={heroMetrics}
              onSignIn={() => setAuthMode("signin")}
              onSignUp={() => setAuthMode("signup")}
            />
            <SnapshotCard
              label="Snapshot"
              title="This week"
              pill="Live preview"
              cashFlowAmount="$2,480"
              cashFlowDelta="Up $260 compared to last week."
              bills={upcomingBills}
              budgetPulseCopy="Groceries are steady. Dining out is nudging above plan."
              budgetPulsePercent={78}
            />
          </div>

          <section
            id="cta"
            className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-6 pb-20 lg:flex-row lg:items-center lg:justify-between lg:px-10"
            aria-label="Get started"
          >
            <div>
              <h2 className="text-2xl font-semibold text-white">
                Ready to build your home view?
              </h2>
              <p className="mt-2 text-sm text-white/80">
                Start with the free plan, then grow into shared budgets and automated bill flow.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className="inline-flex items-center rounded-[var(--radius-pill)] bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
              >
                Get started
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("signin")}
                className="inline-flex items-center text-sm font-semibold text-white/80 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
              >
                Sign in
              </button>
            </div>
          </section>
        </div>
      </div>
      {isAuthOpen ? (
        <div className="auth-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="auth-backdrop"
            aria-label="Close authentication modal"
            onClick={() => setAuthMode(null)}
          />
          <section className="auth-card" aria-live="polite">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
                ArgoBucks access
              </p>
              <h2 className="text-2xl font-semibold text-foreground">{authCopy.title}</h2>
              <p className="text-sm text-muted">{authCopy.description}</p>
            </div>
            <form
              className="mt-6 space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!authMode) return;
                setAuthLoading(true);
                setAuthError(null);
                try {
                  if (authMode === "signup") {
                    const credential = await createUserWithEmailAndPassword(
                      firebaseAuth,
                      authEmail,
                      authPassword,
                    );
                    await updateProfile(credential.user, { displayName: authEmail.split("@")[0] });
                    const idToken = await credential.user.getIdToken();
                    const res = await fetch("/api/firebase/session", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ idToken }),
                    });
                    if (!res.ok) {
                      throw new Error("Failed to start session");
                    }
                    router.push("/welcome");
                    return;
                  }
                  const credential = await signInWithEmailAndPassword(
                    firebaseAuth,
                    authEmail,
                    authPassword,
                  );
                  const idToken = await credential.user.getIdToken();
                  const res = await fetch("/api/firebase/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ idToken }),
                  });
                  if (!res.ok) {
                    throw new Error("Failed to start session");
                  }
                  router.push("/dashboard");
                } catch {
                  setAuthError("Invalid credentials.");
                } finally {
                  setAuthLoading(false);
                }
              }}
            >
              <label className="auth-field">
                <span className="auth-label">Email</span>
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="auth-input"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                />
              </label>
              <label className="auth-field">
                <span className="auth-label">Password</span>
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                  className="auth-input"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                />
              </label>
              {authError ? <p className="text-sm text-red-600">{authError}</p> : null}
              <button
                type="submit"
                className="auth-submit"
                disabled={authLoading}
              >
                {authLoading
                  ? authMode === "signup"
                    ? "Creating..."
                    : "Signing in..."
                  : authMode === "signup"
                    ? "Create account"
                    : "Sign in"}
              </button>
              <div className="auth-links">
                <button
                  type="button"
                  onClick={() => setAuthMode(authCopy.secondaryMode)}
                  className="auth-link"
                >
                  {authCopy.secondaryLabel}
                </button>
                <Link href="/forgot" className="auth-link">
                  Forgot password
                </Link>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
