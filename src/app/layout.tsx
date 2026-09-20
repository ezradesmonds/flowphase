import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import { demoMode } from "@/lib/server/mode";
export const dynamic = "force-dynamic";
import "./globals.css";
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
      <body>
        <Shell demo={demoMode}>{children}</Shell>
      </body>
    </html>
  );
}
