export default function ForgotPage() {
  return (
    <div className="aurora-strong mx-auto flex min-h-screen max-w-3xl items-center px-6">
      <div className="w-full space-y-6 rounded-lg border border-border/80 bg-white p-10 shadow-sm">
        <div className="space-y-2">
          <p className="pill bg-white/80 text-emerald-700 border-emerald-500/30">
            Password reset
          </p>
          <h1 className="text-3xl font-semibold text-ink">Reset your password</h1>
          <p className="text-muted">
            Stubbed view. Hook up email delivery and token-based reset later.
          </p>
        </div>
        <div className="space-y-3">
          <label className="text-sm text-ink">Email</label>
          <input
            type="email"
            className="w-full rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
            placeholder="you@example.com"
          />
          <button
            type="button"
            className="w-full rounded-sm bg-gradient-to-r from-emerald-500 to-sky-500 px-3 py-2 text-white shadow-[0_12px_30px_rgba(121,211,198,0.35)]"
          >
            Send reset link
          </button>
          <p className="text-sm text-muted">
            We will email a reset link if this address exists.
          </p>
        </div>
      </div>
    </div>
  );
}
