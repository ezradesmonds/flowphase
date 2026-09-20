import type { NextConfig } from "next";
const config: NextConfig = {
  distDir: process.env.FLOWPHASE_MODE === "demo" ? ".next-demo" : ".next",
  poweredByHeader: false,
  serverExternalPackages: ["@mathieuc/tradingview"],
};
export default config;
