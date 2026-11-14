import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { AppearanceSync } from "@/components/features/AppearanceSync";
import { FxLayer } from "@/components/features/FxLayer";
import { INIT_SCRIPT } from "@/lib/appearance/settings";

export const metadata: Metadata = {
  title: {
    default: "StudoJob — Your first real opportunity",
    template: "%s · StudoJob",
  },
  description:
    "StudoJob connects students and fresh graduates with internships, entry-level jobs and employers who want to hire beginners.",
};

export const viewport: Viewport = {
  themeColor: "#faf8f4",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AppearanceSync />
        <FxLayer />
        {children}
      </body>
    </html>
  );
}
