"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "cn";
import { Logo } from "@/components/logo";
import { logout } from "@/lib/api-client";

const NAV = [
  { id: "dashboard", href: "/dashboard", label: "Tu plan", icon: "/itos_icons/dashboard_itos.svg" },
  { id: "alerts", href: "/alerts", label: "Alertas", icon: "/itos_icons/alerts_itos.svg" },
  { id: "profile", href: "/profile", label: "Perfil", icon: "/itos_icons/avatar_itos.svg" },
] as const;

export type NavSection = (typeof NAV)[number]["id"];

// The page passes its own section instead of reading usePathname(), which would make
// every page's static shell depend on request data under Cache Components.
export function AppHeader({ current }: { current?: NavSection }) {
  return (
    <header className="border-b bg-background">
      {/* Mobile: logo + Salir on the first row, nav tabs on the second. Desktop: one row. */}
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center px-4 pt-3 sm:flex-nowrap sm:gap-8 sm:px-6 sm:py-3">
        <Link href="/dashboard" aria-label="ITOS, ir a tu plan" className="flex min-h-11 items-center rounded-md">
          <Logo className="h-6" />
        </Link>

        <nav aria-label="Principal" className="order-last -mx-2 mt-1 w-[calc(100%+1rem)] sm:order-none sm:mx-0 sm:mt-0 sm:w-auto">
          <NavLinks current={current} />
        </nav>

        <button
          type="button"
          onClick={() => void logout()}
          className="ml-auto inline-flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
        >
          Salir
        </button>
      </div>
    </header>
  );
}

function NavLinks({ current }: { current?: NavSection }) {
  return (
    <ul className="flex sm:gap-1">
      {NAV.map((item) => {
        const active = item.id === current;
        return (
          <li key={item.href} className="flex-1 sm:flex-none">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors duration-150",
                "after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full sm:after:hidden",
                active
                  ? "text-ocean-700 after:bg-primary sm:bg-ocean-50"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Image src={item.icon} alt="" width={20} height={20} className="size-5" />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
