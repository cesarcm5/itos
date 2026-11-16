import { z } from "zod";

// Mirrors the API's profileSchema (backend/src/routes/profile.ts).
export type Horizon = "short" | "medium" | "long";
export type Risk = "low" | "medium" | "high";

export type Profile = {
  monthlyIncomeMxn: number;
  monthlyExpensesMxn: number;
  hasEmergencyFund: boolean;
  horizon: Horizon;
  risk: Risk;
};

/** Accepts "12,500", "$12500.50" or "12 500". Returns null when it isn't a number yet. */
export function parseMoney(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const money = z
  .string()
  .trim()
  .min(1, "Ingresa una cantidad")
  .transform((value) => parseMoney(value) ?? Number.NaN)
  .pipe(
    z
      .number({ error: "Usa solo números, por ejemplo 18,000" })
      .min(0, "No puede ser negativo")
      .max(9_999_999_999.99, "Revisa la cantidad"),
  );

// Form values are strings (inputs and radios); the output matches the API's Profile.
export const profileFormSchema = z.object({
  monthlyIncomeMxn: money,
  monthlyExpensesMxn: money,
  hasEmergencyFund: z.enum(["yes", "no"], { error: "Elige una opción" }).transform((v) => v === "yes"),
  horizon: z.enum(["short", "medium", "long"], { error: "Elige un plazo" }),
  risk: z.enum(["low", "medium", "high"], { error: "Elige una opción" }),
});

export type ProfileFormInput = z.input<typeof profileFormSchema>;
export type ProfileFormOutput = z.output<typeof profileFormSchema>;
