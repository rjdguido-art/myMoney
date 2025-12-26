import { requireNotOnboardedUser } from "@/lib/onboarding";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage() {
  const user = await requireNotOnboardedUser();

  return (
    <OnboardingClient
      initialCurrency={user.currency ?? "USD"}
      initialLanguage={(user.locale as "en" | "es") ?? "en"}
      initialTimezone={user.timezone ?? "UTC"}
      name={user.name}
    />
  );
}
