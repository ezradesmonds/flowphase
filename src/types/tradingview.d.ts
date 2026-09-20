declare module "@mathieuc/tradingview" {
  const api: {
    Client: new (options?: {
      token?: string;
      signature?: string;
    }) => import("../lib/tradingview/transport").ChartClient;
  };
  export default api;
}
