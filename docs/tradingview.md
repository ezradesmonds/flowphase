# TradingView chart integration

## Inspection and scope

`C:\sectors\tradingview-test` is a nested standalone npm project. At inspection it contained only package.json, package-lock.json and node_modules. Its declared index.js did not exist. No application source, README, AGENTS.md, environment files, authentication setup, symbol resolver, session management or verified working experiment was present. Dependencies were @mathieuc/tradingview 3.5.2 and dotenv. It remains isolated and unchanged. The main application pins the same provider package version; reusable behavior was checked against that installed package's client and chart-session implementations and the upstream repository at https://github.com/Mathieu2301/TradingView-API.

The existing TradingView chart, domain models and phase regions remain intact. Production company identity, free float and broker flow now come from [Sectors](sectors.md). Mock data is restricted to explicit demo mode. No Sectors OHLCV requests or chart fallback exist.

## Boundaries

- `src/domain/chart-market.ts`: JSON-only UTC timestamp candle contract; existing DailyCandle is unchanged.
- `src/lib/tradingview`: strict IDX symbol normalization, request/payload validation, adapters, server-only client and session lifecycle.
- `src/lib/repositories/market-data-repository.ts`: chart repository contract. Its TradingView implementation is server-only. Existing MarketRepository/demoRepository remain the independent analysis source.
- `src/lib/services/market-data-service.ts`: 15-second bounded cache, maximum four active upstream sessions per process and 100 cached queries.
- `/api/market/symbols?ticker=bbca`: canonical IDX mapping, explicitly not an availability search or listing verification.
- `/api/market/candles?ticker=BBCA&timeframe=1D&limit=200`: normalized history; limits 2–500, timeframes 1/5/15/60/1D/1W. Upstream may restrict an otherwise valid timeframe.
- `/api/market/candles/stream`: optional SSE snapshots of upstream candle updates. Sessions stop after 55 seconds; users can toggle updates to start a new session. No reconnect storm or entitlement bypass.
- `TradingViewMarketChart`: browser fetch/EventSource and Lightweight Charts. No iframe, embedded widget, upstream sessions or credentials in the browser.

Candles are validated, sorted ascending and deduplicated by UTC Unix timestamp. Provider max/min map to high/low. Volume is preserved, never fabricated. Requests use regular sessions and split adjustment. The last candle may be incomplete. Daily timestamps remain the provider's session timestamp; no conversion into a fictitious midnight candle is performed. Intraday chart labels use UTC. Provider delay and exchange realtime entitlement are unknown, even while transport updates are arriving. Missing/invalid data shows an error, never a silent demo fallback.

## Security and deployment

Anonymous access is preferred. `.env.example` contains only empty TRADINGVIEW_SESSION/TRADINGVIEW_SIGNATURE placeholders; no .env.local was created. If legitimately required, an operator may configure both server environment variables through the deployment secret manager, using an authorized session and permitted manual account procedures. This application provides no official TradingView credential provisioning flow, cookie extraction, login automation or credential scraping. Never use NEXT_PUBLIC variables, paste credentials into chat, commit them, or enable the package's debug logger. Provider errors are replaced with fixed messages so secrets cannot enter JSON responses or logs.

This package is a third-party protocol client, not an official data-service SLA. Confirm TradingView/exchange access and redistribution permissions before public deployment; this implementation does not expand account entitlements. Use a Node runtime with outbound WebSocket access and SSE support (not Edge/static export). A public deployment also needs authentication, shared rate limits and a shared connection/cache service. Current bounds are per process, not fleet-wide. Browser unmount, query changes, cancellation, provider failure and timeout clean up chart sessions. The package cannot abort a socket still connecting through its public API; late opens are closed explicitly. A host-level network connection timeout is still relevant for a stalled handshake.

## Verification

An anonymous direct request for IDX:BBCA daily history returned five candles during local verification on 17 September 2026. This is a point-in-time check, not proof that all symbols/timeframes or realtime entitlements are available. Unit tests cover normalization, malformed input, OHLC constraints, sorting/deduplication, cleanup, abort and timeout. No tests require private credentials.

Sectors currently supplies the production company directory, classifications, free float and broker flow. Other non-chart intelligence remains future work. TradingView is the exclusive provider for actual market prices, OHLCV and technical price/volume calculations. Fixtures remain isolated in explicit demo mode.
