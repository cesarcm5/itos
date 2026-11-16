"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toApiError, type ApiError } from "@/lib/api-client";
import { loginSchema, registerSchema, type LoginInput } from "@/lib/schemas/auth";

type Mode = "login" | "register";

const copy = {
  login: {
    title: "Inicia sesión",
    description: "Entra para ver cuánto y dónde invertir este mes.",
    submit: "Entrar",
    pending: "Entrando…",
    switchText: "¿No tienes cuenta?",
    switchLink: "Crea una",
    switchHref: "/register",
    passwordHint: undefined,
    autoComplete: "current-password",
  },
  register: {
    title: "Crea tu cuenta",
    description: "Empieza a invertir con un plan hecho a tu medida.",
    submit: "Crear cuenta",
    pending: "Creando cuenta…",
    switchText: "¿Ya tienes cuenta?",
    switchLink: "Inicia sesión",
    switchHref: "/login",
    passwordHint: "Mínimo 8 caracteres.",
    autoComplete: "new-password",
  },
} as const;

function errorMessage(error: ApiError): string {
  switch (error.code) {
    case "INVALID_CREDENTIALS":
      return "Correo o contraseña incorrectos.";
    case "EMAIL_TAKEN":
      return "Ya existe una cuenta con este correo.";
    case "TOO_MANY_REQUESTS": {
      if (!error.retryAfter) return "Demasiados intentos. Intenta de nuevo más tarde.";
      const minutes = Math.ceil(error.retryAfter / 60);
      return `Demasiados intentos. Intenta de nuevo en ${minutes} min.`;
    }
    case "VALIDATION_ERROR":
      return error.message;
    default:
      return "No pudimos conectarnos. Intenta de nuevo.";
  }
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const t = copy[mode];
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(mode === "login" ? loginSchema : registerSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginInput) => {
    setFormError(null);
    // Read at submit time (not render) so the page stays static. Validated server-side.
    const next = new URLSearchParams(window.location.search).get("next") ?? undefined;
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, next }),
      });
      if (!res.ok) {
        setFormError(errorMessage(await toApiError(res)));
        return;
      }
      const { redirectTo } = (await res.json()) as { redirectTo: string };
      router.replace(redirectTo);
      router.refresh();
    } catch {
      setFormError("No pudimos conectarnos. Intenta de nuevo.");
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="tu@correo.com"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete={t.autoComplete}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? "password-error" : t.passwordHint ? "password-hint" : undefined}
              {...register("password")}
            />
            {errors.password ? (
              <p id="password-error" className="text-sm text-destructive">
                {errors.password.message}
              </p>
            ) : (
              t.passwordHint && (
                <p id="password-hint" className="text-sm text-muted-foreground">
                  {t.passwordHint}
                </p>
              )
            )}
          </div>

          {formError && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}
        </CardContent>

        <CardFooter className="mt-6 flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t.pending : t.submit}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t.switchText}{" "}
            <Link href={t.switchHref} className="font-medium text-foreground underline underline-offset-4">
              {t.switchLink}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
