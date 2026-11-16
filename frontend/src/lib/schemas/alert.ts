import { z } from "zod";
import { parseMoney } from "@/lib/schemas/profile";

// Mirrors the API's createBody (backend/src/routes/alerts.ts), plus a check against the
// current price: an "above" target under today's price would fire on the next check.
export function alertFormSchema(currentPrice: number | null) {
  return z
    .object({
      condition: z.enum(["above", "below"]),
      targetPrice: z
        .string()
        .trim()
        .min(1, "Ingresa un precio")
        .transform((value) => parseMoney(value) ?? Number.NaN)
        .pipe(
          z
            .number({ error: "Usa solo números, por ejemplo 215.50" })
            .positive("El precio debe ser mayor que 0")
            .max(9_999_999_999, "Revisa el precio"),
        ),
    })
    .superRefine((value, ctx) => {
      if (currentPrice === null) return;
      if (value.condition === "above" && value.targetPrice <= currentPrice) {
        ctx.addIssue({ code: "custom", path: ["targetPrice"], message: "Para “sube a”, elige un precio mayor al actual" });
      }
      if (value.condition === "below" && value.targetPrice >= currentPrice) {
        ctx.addIssue({ code: "custom", path: ["targetPrice"], message: "Para “baja a”, elige un precio menor al actual" });
      }
    });
}

export type AlertFormInput = z.input<ReturnType<typeof alertFormSchema>>;
export type AlertFormOutput = z.output<ReturnType<typeof alertFormSchema>>;
