import { z } from "zod";

// Mirrors the API's validation (backend/src/routes/auth.ts) so errors show before a round trip.
const email = z.string().trim().toLowerCase().pipe(z.email("Ingresa un correo válido").max(254));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Ingresa tu contraseña").max(200),
});

export const registerSchema = z.object({
  email,
  password: z
    .string()
    .min(8, "Usa al menos 8 caracteres")
    .refine((value) => new TextEncoder().encode(value).length <= 72, "Usa como máximo 72 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
