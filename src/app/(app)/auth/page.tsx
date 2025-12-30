export default function AuthPage() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <p className="pill bg-emerald-500 text-white border-transparent shadow-[0_10px_24px_rgba(121,211,198,0.32)]">
          Secure sign-in
        </p>
        <h1 className="text-2xl font-semibold text-ink">
          Log in or create an account.
        </h1>
        <p className="text-muted">
          Two-factor ready. We encrypt connections and never store credentials in plaintext.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-border/80 bg-white p-6 shadow-sm">
        <form className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-ink">Email</label>
            <input
              type="email"
              className="w-full rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-ink">Password</label>
            <input
              type="password"
              className="w-full rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-ink">
              <input type="checkbox" className="h-4 w-4" defaultChecked />
              Remember me
            </label>
            <button type="button" className="text-emerald-700 hover:underline">
              Forgot password
            </button>
          </div>
          <button
            type="button"
            className="w-full rounded-sm bg-gradient-to-r from-emerald-500 to-sky-500 px-3 py-2 text-white shadow-[0_12px_30px_rgba(121,211,198,0.35)] hover:brightness-105"
          >
            Continue
          </button>
        </form>
        <div className="text-sm text-muted">
          No account? <span className="text-emerald-700">Create one</span>
        </div>
      </div>
    </div>
  );
}
