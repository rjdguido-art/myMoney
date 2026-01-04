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
      <div aria-hidden="true" />
    </header>
  );
}
