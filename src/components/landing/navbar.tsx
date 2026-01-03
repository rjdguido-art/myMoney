import Link from "next/link";
import Image from "next/image";

type NavbarProps = {
  onSignIn?: () => void;
  onSignUp?: () => void;
};

export function Navbar({ onSignIn, onSignUp }: NavbarProps) {
  return (
    <header className="flex items-center justify-between px-6 py-6 lg:px-10">
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[var(--radius-md)]">
          <Image
            src="/argo-logo.png"
            alt="ArgoBucks logo"
            width={96}
            height={96}
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-white/80 sm:text-base">
            ArgoBucks
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {onSignIn ? (
          <button
            type="button"
            onClick={onSignIn}
            className="hidden text-sm font-medium text-white/80 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 lg:inline-flex"
          >
            Sign in
          </button>
        ) : (
          <Link
            href="/login"
            className="hidden text-sm font-medium text-white/80 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 lg:inline-flex"
          >
            Sign in
          </Link>
        )}
        {onSignUp ? (
          <button
            type="button"
            onClick={onSignUp}
            className="inline-flex items-center rounded-[var(--radius-pill)] bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
          >
            Get started
          </button>
        ) : (
          <Link
            href="/signup"
            className="inline-flex items-center rounded-[var(--radius-pill)] bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
          >
            Get started
          </Link>
        )}
      </div>
    </header>
  );
}
