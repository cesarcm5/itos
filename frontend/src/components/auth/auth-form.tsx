"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
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
  const reduceMotion = useReducedMotion();
  const t = copy[mode];
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(mode === "login" ? loginSchema : registerSchema),
    defaultValues: { email: "", password: "" },
    // Validate on blur first, then live while fixing a field.
    mode: "onTouched",
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
      // Keep the button busy until the next page takes over.
      setRedirecting(true);
      router.replace(redirectTo);
      router.refresh();
    } catch {
      setFormError("No pudimos conectarnos. Intenta de nuevo.");
    }
  };

  const busy = isSubmitting || redirecting;

  return (
    <m.div
      initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-sm"
    >
      <h1 className="text-[2rem] leading-tight font-bold">{t.title}</h1>
      <p className="mt-2 text-muted-foreground">{t.description}</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoFocus
            placeholder="tu@correo.com"
            className="h-11 px-3 text-base md:text-base"
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
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete={t.autoComplete}
              className="h-11 pr-12 pl-3 text-base md:text-base"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? "password-error" : t.passwordHint ? "password-hint" : undefined}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-lg text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {showPassword ? <EyeOff className="size-5" strokeWidth={2} /> : <Eye className="size-5" strokeWidth={2} />}
            </button>
          </div>
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
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={busy} className="mt-1 h-11 w-full text-base hover:bg-ocean-700">
          {busy && <Loader2 className="size-5 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
          {busy ? t.pending : t.submit}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t.switchText}{" "}
        <Link
          href={t.switchHref}
          className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline"
        >
          {t.switchLink}
        </Link>
      </p>
    </m.div>
  );
}
