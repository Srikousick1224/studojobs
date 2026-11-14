"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";
import { logoutAction } from "@/lib/auth/actions";
import { LogOut } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function DashboardShell({ role, items, userName, children }: { role: string; items: NavItem[]; userName?: string; children: ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === items[0].href ? pathname === href : pathname.startsWith(href));

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="hidden border-r border-ink-100 bg-white lg:block">
        <div className="sticky top-0 flex h-screen flex-col p-5">
          <Logo />
          <p className="mt-8 px-3 text-xs font-bold uppercase tracking-wider text-ink-400">{role}</p>
          <nav aria-label={`${role} navigation`} className="mt-2 flex flex-col gap-1">
            {items.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                aria-current={isActive(i.href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  isActive(i.href) ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
                )}
              >
                <i.icon className="h-5 w-5" aria-hidden="true" />
                {i.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto space-y-1">
            {userName && <p className="truncate px-3 text-sm font-semibold text-ink-800" title={userName}>{userName}</p>}
            <form action={logoutAction}>
              <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-50 hover:text-ink-900">
                <LogOut className="h-5 w-5" aria-hidden="true" />
                Log out
              </button>
            </form>
            <Link href="/" className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-500 hover:bg-ink-50">
              ← Back to site
            </Link>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="sticky top-0 z-30 border-b border-ink-100 bg-white/90 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Logo />
            <div className="flex items-center gap-3">
              <Link href="/" className="text-sm font-semibold text-ink-500">Site</Link>
              <form action={logoutAction}>
                <button type="submit" className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-ink-600 hover:bg-ink-100">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Log out
                </button>
              </form>
            </div>
          </div>
          <nav aria-label={`${role} navigation`} className="flex gap-1 overflow-x-auto px-3 pb-2">
            {items.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                aria-current={isActive(i.href) ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold",
                  isActive(i.href) ? "bg-brand-500 text-white" : "bg-ink-100 text-ink-700",
                )}
              >
                <i.icon className="h-4 w-4" aria-hidden="true" />
                {i.label}
              </Link>
            ))}
          </nav>
        </div>
        <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
