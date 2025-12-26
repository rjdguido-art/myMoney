"use client";

import { FormEvent, Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl,
    });

    if (result?.error) {
      setLoading(false);
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
      // Fall back to the callback route if onboarding status can't be checked.
    } finally {
      setLoading(false);
    }

    router.push(callbackUrl);
  };

  return (
    <div className="login-shell relative overflow-hidden px-6 py-12">
      <div className="login-background" aria-hidden="true">
        <div className="login-orb login-orb--one" />
        <div className="login-orb login-orb--two" />
        <div className="login-orb login-orb--three" />
        <img
          className="login-float login-float--one"
          src="/login/feature-1.png"
          alt=""
        />
        <img
          className="login-float login-float--two"
          src="/login/feature-2.png"
          alt=""
        />
        <img
          className="login-float login-float--three"
          src="/login/feature-3.png"
          alt=""
        />
        <img
          className="login-float login-float--four"
          src="/login/feature-4.png"
          alt=""
        />
      </div>
      <div className="relative mx-auto flex min-h-[calc(100vh-6rem)] max-w-4xl items-center">
        <div className="grid w-full gap-10 rounded-lg border border-slate-200/70 bg-white p-10 shadow-sm backdrop-blur-sm md:grid-cols-2">
          <div className="space-y-4">
          <div className="flex items-center gap-3">
            <img
              src="/icon.svg"
              alt="myMoney logo"
              className="h-12 w-12 rounded-md shadow-sm"
            />
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-muted">
                myMoney
              </p>
              <p className="text-base font-semibold text-ink">Welcome back</p>
            </div>
          </div>
          <h1 className="text-3xl font-semibold text-ink">Sign in</h1>
          <p className="text-muted">
            Access your dashboard, budgets, bills, and insights securely with email and password.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm text-ink">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="w-full rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-ink">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              className="w-full rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-sm bg-gradient-to-r from-emerald-500 to-sky-500 px-3 py-2 text-white shadow-[0_12px_30px_rgba(34,197,143,0.35)] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <div className="flex items-center justify-between text-sm text-muted">
            <a href="/signup" className="text-emerald-700 hover:underline">
              Create account
            </a>
            <a href="/forgot" className="text-emerald-700 hover:underline">
              Forgot password
            </a>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted">Loading…</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
