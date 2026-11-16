"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { logout } from "@/lib/api-client";

export function AppHeader() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/dashboard" aria-label="ITOS, ir a tu plan" className="rounded-md">
          <Logo className="h-6" />
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
