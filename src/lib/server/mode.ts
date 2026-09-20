import "server-only";
/** No automatic fallback to demo when a provider is unavailable. */
export const demoMode = process.env.FLOWPHASE_MODE === "demo";
