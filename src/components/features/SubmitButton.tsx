import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

/** Submit button with a spinner while a Server Action is running. */
export function SubmitButton({ pending, children, pendingText, className }: { pending: boolean; children: ReactNode; pendingText: string; className?: string }) {
  return (
    <Button type="submit" size="lg" className={className ?? "w-full"} disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
