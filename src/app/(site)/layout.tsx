import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { AuthNav } from "@/components/layout/AuthNav";
import { Suspense } from "react";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lift">
        Skip to content
      </a>
      <Suspense fallback={null}>
        <SiteHeader desktopAuth={<AuthNav variant="desktop" />} mobileAuth={<AuthNav variant="mobile" />} />
      </Suspense>
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
