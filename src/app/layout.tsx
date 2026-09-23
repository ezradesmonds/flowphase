import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import { demoMode } from "@/lib/server/mode";
export const dynamic = "force-dynamic";
import "./globals.css";
import "./visual-theme.css";
export const metadata: Metadata = {
  title: {
    default: "FlowPhase — Market intelligence",
    template: "%s | FlowPhase",
  },
  description:
    "Indonesian stock research with Sectors company intelligence and TradingView charts.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Shell demo={demoMode}>{children}</Shell>
      </body>
    </html>
  );
}
