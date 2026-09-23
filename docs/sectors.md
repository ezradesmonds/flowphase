# Sectors integration

Verified endpoints:

- [Companies screener](https://docs.sectors.app/api-references/v2/indonesia/screener/companies): `/v2/companies/`, limit 200/offset pagination. `order_by=sub_sector` or `sector` plus `include_query_values=true` yields each classification. All pages validate total_count and duplicate symbols. No natural-language query is used.
- [Free float](https://docs.sectors.app/api-references/v2/indonesia/screener/free-float): `/v2/free-float/`, unfiltered, ratios joined by ticker. Zero is valid; absent data is unavailable.
- [Broker summary](https://docs.sectors.app/api-references/v2/indonesia/brokers/broker-summary-by-symbol): `/v2/broker-summary/{symbol}/`, provider default window up to 14 days. Response dates are displayed. `blot`/`slot` are lots, `bval`/`sval` are IDR; nullable averages are preserved. IDX equity conversion is 100 shares per lot; weighted average price uses IDR / (lots × 100).

`.JK` suffixes normalize to IDX tickers. Company names remain provider names. No universe-wide phase scores are fabricated; phases are calculated on selected TradingView charts.

SECTORS_API_KEY and SECTORS_API_BASE_URL are server-only. Authorization is sent to the exact allowed origin. No NEXT_PUBLIC secret, JSON credential response or credential logging. `.env.example` contains placeholders; integration code does not create secret files.

Daily directory cache, 15-minute intelligence broker-history cache, one pending universe request per process, broker calls only for opened stocks or explicit batches of up to five stocks. The shared client now allows at most two retries for 429/5xx with backoff/jitter; a Retry-After above ten seconds stops retries. The diagnostic limits retries to one and stops remaining probes after an exhausted quota/network failure. At 962 companies a full refresh costs approximately 20 credits (two passes × five pages plus about ten free-float credits). Actual billing remains provider-controlled. Cache deletion/deployment may incur a new refresh. Never create extra accounts for competition credits.

The [Phase 1 capability audit](sectors-api-capability-audit.md) and [machine-readable evidence](sectors-audit/capabilities.json) supersede assumptions about current endpoint coverage. Sectors daily OHLCV is tested only by the diagnostic; the production chart provider remains TradingView.

Incomplete pagination fails closed. Missing optional enrichment creates warnings. Broker errors/no rows show unavailable states. Cached successful data may still render after a credential fails; its fetch timestamp remains visible. Retained provider data is never replaced by fixtures.

Stock Intelligence uses three disjoint 14-calendar-day requests (42 days total), ending yesterday in Jakarta. Twenty prior reported broker sessions are required for adaptive broker alerts; sparse brokers remain insufficient. Stop on the first failed window and discard partial history. Daily summaries contain no verified second-level aggressor-side trades, so stealth detection remains disabled. Units: [IDX lot convention](https://www.idx.id/en/products-services/trading-hours-and-mechanism/). The legacy single-window repository remains compatible with existing integration tests.
