import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-20 top-20 h-80 w-80 rounded-full bg-brand-500/40 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-mint-500/20 blur-3xl" aria-hidden="true" />
        <Logo light className="relative" />
        <div className="relative max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight">Every career starts with one good first step.</h2>
          <p className="mt-4 text-lg text-ink-300">Find internships and fresher roles with clear pay and verified employers.</p>
        </div>
        <p className="relative text-sm text-ink-400">Phase 1 preview</p>
      </div>
      <div className="flex flex-col justify-center px-4 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden"><Logo /></div>
          {children}
          <p className="mt-8 text-center text-sm text-ink-500"><Link href="/" className="hover:text-brand-600">← Back to home</Link></p>
        </div>
      </div>
    </div>
  );
}
