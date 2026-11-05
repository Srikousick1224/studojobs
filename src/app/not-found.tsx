import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <h1 className="text-4xl font-extrabold">This page could not be found</h1>
      <p className="max-w-md text-ink-500">The opportunity may have closed, or the link may be wrong. Let’s get you back on track.</p>
      <div className="flex gap-3">
        <Button href="/jobs">Browse jobs</Button>
        <Button href="/" variant="secondary">Home</Button>
      </div>
    </main>
  );
}
