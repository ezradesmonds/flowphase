# Architecture

Production: server page → SecuritiesRepository → Sectors server client → normalized stock universe / broker snapshot → UI. Universe is complete or fails visibly; no short hard-coded list or demo fallback. Two screener traversals obtain subsector and sector query values; free float joins by ticker. Extra provider fields, including prices, are discarded.

Chart: browser fetch/EventSource → FlowPhase market API → server-only TradingView repository → normalized OHLCV → Lightweight Charts and phase primitives. No Sectors price endpoint is used. Phase detection sees only the current candles or replay prefix, not demo labels or future candles.

Research: `src/lib/research.ts` computes subsector median excluding the selected company and broker participation/concentration from reported lots. Missing values remain null. These are descriptive statistics, not advice, ownership estimates or a tested strategy.

The original demo repository is guarded by `FLOWPHASE_MODE=demo` and loaded lazily. Watchlist storage keys differ between modes. Old demo pages/tests remain isolated from production.

Secrets stay behind server-only imports. Sectors URLs are restricted to the verified HTTPS origin/v2 path and redirects rejected. Raw errors/credentials are not returned to browsers.

Caching uses Next's supported `unstable_cache` compatibility API: 24 hours for directory/free float, 15 minutes for intelligence broker history (legacy single-window access remains 5 minutes). Cache Components are not enabled globally to avoid unrelated route changes. Fetch timestamps are shown, source observation dates are not invented. Revalidation may serve the last successful snapshot while refreshing. Computed daily intelligence is atomically persisted per ticker under ignored `.flowphase/analysis-v1/`. Dashboard reads stored results; scanner receives compact summaries, paginates 50 rows, and processes explicit batches sequentially (at most five). No background full-market polling exists. Public multi-instance deployment needs shared quota/access controls.

See submission.md for judging workflow and remaining operations. Production checks should cover filtering, broker evidence, chart, replay, missing data and watchlist persistence.

## Focused intelligence modules

- `src/config/brokers.ts`: editable initial broker hypotheses; disabled/unlisted → unknown/mixed.
- `src/config/analysis.ts`: baseline and severity calibration parameters; granular capability gate.
- `src/lib/intelligence/`: inventory, price-volume, cycles, alerts, provider history, analysis cache and compact summaries.
- `/api/intelligence`: GET cached summaries/status; POST one verified ticker, two simultaneous computations maximum, reused within 15 minutes. The UI batches five sequential requests and stops on failure; no retries burn quota.
- `/alerts`: historical/batch evidence with filters and modal detail. No unsupported live toggle.
- Broker Flow redirects into Stock Intelligence, Cycle Replay redirects to its replay control. Watchlist data and its legacy route remain intact as a scanner view. Settings stays in the profile link.

Local persistence suits the current single-machine project. Shared storage, authentication and shared quota coordination are prerequisites for a public multi-instance service. No public deployment is performed.
