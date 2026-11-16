import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata: Metadata = { title: "Tu perfil · ITOS" };

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
