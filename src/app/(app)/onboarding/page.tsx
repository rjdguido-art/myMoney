import { requireNotOnboardedUser } from "@/lib/onboarding";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage() {
  const user = await requireNotOnboardedUser();

  return (
    <main className="relative min-h-screen">
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
