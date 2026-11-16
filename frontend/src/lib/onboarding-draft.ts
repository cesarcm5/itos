import { z } from "zod";
import type { ProfileFormInput } from "@/lib/schemas/profile";

// Unfinished onboarding answers, per user, in this browser only. Cleared once the profile is saved.
// Storage can be unavailable (private mode, blocked site data), so every access is best-effort.

const draftSchema = z.object({
  step: z.number().int().min(0),
  values: z
    .object({
      monthlyIncomeMxn: z.string(),
      monthlyExpensesMxn: z.string(),
      hasEmergencyFund: z.enum(["yes", "no"]),
      horizon: z.enum(["short", "medium", "long"]),
      risk: z.enum(["low", "medium", "high"]),
    })
    .partial(),
});

export type OnboardingDraft = { step: number; values: Partial<ProfileFormInput> };

const key = (userId: string) => `itos:onboarding:${userId}`;

export function loadDraft(userId: string): OnboardingDraft | null {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveDraft(userId: string, draft: OnboardingDraft): void {
  try {
    localStorage.setItem(key(userId), JSON.stringify(draft));
  } catch {
    // Not critical: the user just starts over next time.
  }
}

export function clearDraft(userId: string): void {
  try {
    localStorage.removeItem(key(userId));
  } catch {
    // Ignore.
  }
}
