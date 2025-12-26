"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { initFirebase } from "@/lib/firebase";

export default function LoginPage() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initFirebase();
  }, []);

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
    setLoading(false);

    if (result?.error) {
      setError("Invalid credentials");
      return;
    }

    window.location.href = callbackUrl;
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl items-center px-6">
      <div className="grid w-full gap-10 rounded-2xl border border-border/70 bg-card p-10 shadow-[0_14px_36px_rgba(5,63,43,0.1)] md:grid-cols-2">
        <div className="space-y-4">
          <p className="pill bg-emerald-500 text-white border-transparent shadow-[0_10px_24px_rgba(34,197,143,0.32)]">
            Welcome back
          </p>
          <h1 className="text-3xl font-semibold text-ink">Sign in</h1>
          <p className="text-muted">
            Access your dashboard, budgets, bills, and insights securely with email and password.
          </p>
          <div className="rounded-xl border border-border/70 bg-white/80 p-4 text-sm text-muted">
            <p className="font-semibold text-ink">Heads up</p>
            <p className="mt-1">
              We hash passwords with bcrypt and keep sessions short-lived. Use strong, unique credentials.
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm text-ink">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
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
              className="w-full rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-sky-500 px-3 py-2 text-white shadow-[0_12px_30px_rgba(34,197,143,0.35)] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
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
  );
}
