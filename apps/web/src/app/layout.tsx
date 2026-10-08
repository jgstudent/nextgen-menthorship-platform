import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeScript } from "@/components/theme/theme-script";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "Pilye — Learning together",
    template: "%s · Pilye"
  },
  description: "A safe, human mentorship classroom where learners and mentors grow together."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
