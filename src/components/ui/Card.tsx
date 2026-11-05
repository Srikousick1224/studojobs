import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl bg-white p-5 shadow-soft ring-1 ring-ink-100", className)} {...rest} />;
}
