import { z } from "zod";
import { SYMBOL_PATTERN } from "@/lib/market";
import { parseMoney } from "@/lib/schemas/profile";

// The API takes monthlyAmountUsd (max 1,000,000) and years 1/3/5 (backend/src/routes/simulator.ts).
// Capping the form at 1,000,000 keeps the converted USD amount under the API limit too.
// The form takes the amount in MXN when we have today's USD/MXN rate, and converts it on submit.
export const simulatorFormSchema = z.object({
  symbol: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Elige o escribe un activo")
    .regex(SYMBOL_PATTERN, "Escribe una clave válida, por ejemplo VOO"),
  amount: z
    .string()
    .trim()
    .min(1, "Ingresa una cantidad")
    .transform((value) => parseMoney(value) ?? Number.NaN)
    .pipe(
      z
        .number({ error: "Usa solo números, por ejemplo 2,000" })
        .positive("La cantidad debe ser mayor que 0")
        .max(1_000_000, "Revisa la cantidad"),
    ),
  years: z.union([z.literal(1), z.literal(3), z.literal(5)]),
});

export type SimulatorFormInput = z.input<typeof simulatorFormSchema>;
export type SimulatorFormOutput = z.output<typeof simulatorFormSchema>;
