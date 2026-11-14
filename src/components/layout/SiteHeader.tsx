"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";
import { PaletteButton } from "@/components/features/CommandPalette";
import { ThemeToggle } from "@/components/features/ThemeToggle";
import { cn } from "@/lib/utils";

const links = [
  { href: "/jobs", label: "Jobs" },
  { href: "/internships", label: "Internships" },
  { href: "/companies", label: "Companies" },
  { href: "/community", label: "Community" },
  { href: "/resources", label: "Career resources" },
];

export function SiteHeader({ desktopAuth, mobileAuth }: { desktopAuth: ReactNode; mobileAuth: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-sand/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname.startsWith(l.href) ? "page" : undefined}
              className={cn(
                "rounded-lg px-3.5 py-2 text-sm font-semibold transition",
                pathname.startsWith(l.href) ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <PaletteButton />
          <ThemeToggle />
          {desktopAuth}
        </div>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-700 hover:bg-ink-100 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="animate-rise border-t border-ink-100 bg-sand px-4 pb-5 pt-3 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-base font-semibold text-ink-800 hover:bg-ink-100">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex items-center gap-2 border-t border-ink-100 pt-3">
            <ThemeToggle />
            <Link href="/settings" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100">Settings</Link>
          </div>
          <div className="mt-3">{mobileAuth}</div>
        </div>
      )}
    </header>
  );
}
