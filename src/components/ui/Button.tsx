import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "mint" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "btn-primary bg-brand-500 text-white hover:bg-brand-600 shadow-soft hover:shadow-lift",
  secondary: "bg-white text-ink-800 ring-1 ring-ink-200 hover:ring-ink-300 hover:bg-ink-50",
  ghost: "text-ink-700 hover:bg-ink-100",
  mint: "bg-mint-500 text-ink-950 hover:bg-mint-400",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
  /** Plain download link (a file or API route). Next.js <Link> must not be used for these: it would try a page navigation. */
  download?: boolean;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", href, download, className, children, ...rest }: Props) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
    variants[variant],
    sizes[size],
    className,
  );
  if (href && download) {
    return (
      <a href={href} download className={classes}>
        {children}
      </a>
    );
  }
  if (href && /^https?:\/\//i.test(href)) {
    // External address (e.g. an interview meeting link): plain anchor, new tab, no access to our page.
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
      </a>
    );
  }
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
