import Image from "next/image";
import { requireNotOnboardedUser } from "@/lib/onboarding";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage() {
  const user = await requireNotOnboardedUser();

  return (
    <main className="relative min-h-screen">
      <div className="bg-aurora-pro">
        <div className="absolute left-6 top-6 z-10 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full shadow-[0_10px_30px_rgba(11,35,71,0.35)]">
          <Image
            src="/argo-logo.png"
            alt="ArgoBucks logo"
            width={48}
            height={48}
            className="h-full w-full scale-[1.12] object-cover"
            priority
          />
        </div>
        <div className="hero-video" aria-hidden="true">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            src="https://presspersona.blob.core.windows.net/images/Blue.mp4"
          />
        </div>
        <div className="aurora-blobs" aria-hidden="true">
          <span className="aurora-blob aurora-blob--teal" />
          <span className="aurora-blob aurora-blob--gold" />
          <span className="aurora-blob aurora-blob--navy" />
        </div>
        <div className="aurora-noise" aria-hidden="true" />
        <div className="aurora-content">
          <OnboardingClient
            initialCurrency={user.currency ?? "USD"}
            initialLanguage={(user.locale as "en" | "es") ?? "en"}
            initialTimezone={user.timezone ?? "UTC"}
            name={user.name}
          />
        </div>
      </div>
    </main>
  );
}
