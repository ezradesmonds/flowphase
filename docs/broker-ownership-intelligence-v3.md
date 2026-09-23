# Broker, Ownership & Market Intelligence v3

## Audit and data contract

The existing Next.js application, Sectors client, TradingView transport and four-phase
engine are preserved. No authentication system or SQL database existed in this local
application; this change does not invent one. The existing filesystem cache remains.
AKUMULASI → POMPOM → MENGGORENG → DISTRIBUSI is unchanged; markdown is a condition.

Verified sources reused:
- Sectors `/broker-summary/{symbol}/`: daily lot/value and buy/sell frequency; source average prices retained. No chronological execution ordering.
- Sectors `/company/shareholders-composition/{symbol}/`: monthly categories and shareholder count; period date is not release date.
- Sectors `/company/report/{symbol}/?sections=overview,ownership`: company identity and reported major shareholders. Live BBCA verification found `share_percentage` numeric strings are fractions (0.54942 → 54.942%). Public and Treasury Stock are aggregate buckets, not legal-entity graph nodes.
- Sectors `/foreign-flow/{symbol}/`: investor-origin daily values; never inferred from broker nationality.
- Existing Sectors company directory and TradingView daily candles: taxonomy and prices/volume.

Every primary calculated value uses Metric: value, source, as_of, period_start,
period_end, calculation_method, data_status, confidence and quality_flags. Null means
unavailable; zero means observed/calculated zero. Source observations and shared row
metadata accompany graph, chart and seasonal values. API envelopes add dataCoverage
and calculationVersion. Hover numbers or expand Source & calculation for details.

Official broker affiliation, beneficial owners, management links and resolved
cross-company legal IDs are not in the verified feed. `src/config/relationships.ts`
provides typed, dated, sourced registry entries; it is intentionally empty. Behavior
hypotheses remain configurable in brokers.ts, independent of company affiliation.
No name-based identity matching occurs. Disclosure IDs are scoped to issuer and fetch.

## Valid calculations

- net_lot = buy_lot − sell_lot; gross_lot = buy_lot + sell_lot.
- net_value = buy_value − sell_value.
- total_frequency = buy_frequency + sell_frequency, null if either side missing.
- average_lot = gross_lot / max(total_frequency, 1); side averages use their own frequency.
- average_price = value / (lots × configured shares_per_lot); no average for no activity.
- observed opening = sum of loaded earlier signed net changes; observed closing = opening + period net. These are observed changes since the origin, NEVER absolute holdings. Negative balances explicitly warn of unseen opening holdings.
- gross_to_net = gross / max(abs(net), 1).
- crossing risk = sum over days of 2 × min(day buy, day sell) / gross. Cross-day round trips are not classified as same-day crossing. This proxy cannot establish counterparties.
- observed depletion = (peak observed net − latest observed net) / peak; unavailable without a positive observed peak. It can exceed 100% and is not absolute position depletion.
- known chronological execution ledger: buys update moving weighted average; sells realize sold lots × shares_per_lot × (sale price − cost). Unrealized = remaining lots × shares_per_lot × (current − cost). Reject unordered executions/negative positions. The live daily feed never enters this PnL engine; live PnL and cost remain unavailable with unknown opening/order.
- coverage = observed broker sessions / acquired candle sessions in range, capped at 1. This does not certify all brokers or all exchange sessions were supplied. Confidence incorporates this coverage and crossing penalty; it is not a calibrated probability.
- sector return = equal-weight return of acquired members on one common session. Relative strength = sector return − acquired-universe mean (percentage points). Relative volume = mean of member volume / prior 20-session mean (minimum five prior observations). Quadrants use zero relative strength and relative-volume-minus-one, or zero proxy flow and price momentum.
- foreign sector flow sums aligned investor-origin observations, only when every included member is present. Fetches are sequential, cached and capped at ten acquired symbols per refresh; missing data remains null.
- seasonality groups daily close returns by calendar month/day of week, reporting sample size, median, win rate, Wilson 95% win-rate interval and mean volume. It does not drive phases; month groups describe daily tendencies, not completed-month investment returns.
- risk lots = floor(maximum risk / max(abs(entry − stop), 1) / shares_per_lot). Required visible exit = lots × configurable buffer (default 3). Live bid capacity is unavailable; displayed liquidity is not an exit guarantee.

## Storage and migration

`node scripts/migrate-intelligence-v3.mjs` prepares named collections under
`.flowphase/intelligence-v3/` and writes a manifest with SHA-256 hashes of legacy
analysis-v1/v2 records. Executed with seven legacy records preserved. Idempotent,
no rename/delete/relabel. There is no SQL migration because there is no SQL database.

Ownership, broker phase and sector snapshots are content-addressed append-only JSON;
source revisions produce new records. Broker snapshots contain normalized daily
observations/phase ledger/cost availability metadata. Other proposed collections are
reserved in the migration, not claimed as populated tables. Watchlists and alert
preferences use versioned browser storage; no shared-account persistence is claimed.

## Internal GET APIs

- `/api/stocks/:symbol/broker-inventory-by-phase?start=YYYY-MM-DD&end=YYYY-MM-DD`
- `/api/stocks/:symbol/broker-timeline`
- `/api/brokers`, `/api/brokers/:code`, `/api/brokers/:code/stocks`, `/api/brokers/:code/phase-activity`
- `/api/stocks/:symbol/ownership`, `/ownership-history`, `/relations`, `/foreign-flow`
- `/api/entities/:id`, `/api/entities/:id/holdings`, `/api/entities/:id/relations` (explicit configured legal IDs only; otherwise unavailable)
- `/api/market-summary`, `/api/sectors/activity`, `/api/sectors/rotation`
- `/api/institutional-flow`, `/api/whale-activity`, `/api/research-alerts`

The catch-all analytical Route Handler leaves existing concrete API routes intact.
It validates symbol/date inputs, verifies supported symbols before provider requests,
and returns sanitized failure envelopes. No upstream errors, tokens or response bodies
are exposed. No additional provider endpoint was invented.

## UI delivered

Stock detail: original price chart remains; hover/select a phase exposes top broker
buyers/sellers, net value/frequency/averages/crossing and links to Broker Stalker.
Below it, tabs provide phase inventory, ownership, institutional/foreign flow,
seasonality and a position-sizing calculator.

Inventory: all brokers, phase/cycle/custom ranges, separate affiliation/proxy filters,
sort, expandable per-phase ledger, metric provenance, CSV of filtered rows, comparison
up to five brokers, signed cumulative line chart, stacked phase changes, net inventory
waterfall and broker timeline. A phase with no observations remains unavailable.

Broker Stalker: code/name search, acquired symbols/company/sector/phase, aggregate
flow and frequency, prices, observed net changes, crossing, source details and save.
The name placeholder is excluded from search to avoid false matches (AI vs unavailable).
Coverage is explicit; it does not claim all traded IDX stocks have been collected.

Ownership: summary, provider shareholders, selectable relationship graph, selected
entity/source details and monthly history. Filters support period, percentage,
verified-only and inferred inclusion. Owner selection is disclosure scoped. Group/
broker-affiliation views are unavailable until official identity data is configured.
Legal ownership is blue; provider-reported edges are dashed, verified edges solid.
Indirect path calculations accept only explicitly identified, dated verified OWNS
edges and never derive a UBO from broker trades. Cross-company holdings are gated.

Market: subset summary, phase distribution, sector activity table, interactive
quadrant with selectable axes and sector drill-down. Watchlist supports existing
stocks plus brokers, disclosure owners and sectors; saved keyword rules filter the
extended alert center. Data Status explains source gates. Existing Settings remains.

Alerts: broker net-flow anomalies, frequency/average-lot spikes, crossing, observed
inventory growth/depletion, previous accumulator selling and Whale Activity Candidate.
New-position candidate requires loaded inactive sessions and explicitly does not
claim new actual ownership. Context alerts compare monthly shareholder count/foreign
category shares and comparable sector snapshots. Sector alerts require the same
constituents. Ownership alerts are dated at fetch availability, never backdated to
period end. Controlling-owner, free-float, verified relationship, legal affiliation,
PnL and tick-specific alerts remain gated.

## Validation and limitations

Foundation and API integration tests cover arithmetic, null vs zero, partial sells,
chronological ordering, unknown opening, negative net, crossing, period transfer,
affiliation separation, ownership fractions/direct/indirect paths, effective dates,
sector quadrants, unavailable endpoints, invalid dates and sanitized failures.
Manual checks use real BBCA disclosures, Broker Stalker AI and acquired sector data.

No synthetic data enters production. `.env` is unchanged; existing source credentials
stay server-only. The public-file check is a limited guard, not a full security audit.

Remaining prerequisites: complete licensed historical collection, publication-time
watermarks, corporate-action consistency, officially verified broker/entity registry,
and chronological execution/order-event data. These are needed for actual inventory,
PnL, split execution, UBO/indirect holdings and full-market assertions. IHSG and total
market traded value remain unavailable without verified index/market-wide inputs.
The application is local and has no new multi-user authentication or transactional DB.

## Implementation files

New calculation/service files: `src/lib/intelligence/extended/model.ts`,
`inventory.ts`, `ownership.ts`, `market.ts`, `alerts.ts`, `context-alerts.ts`,
`service.ts`, `persistence.ts`, `engine.test.ts`, `api.test.ts`.

New configuration and API: `src/config/relationships.ts`,
`src/app/api/[...intelligence]/route.ts`.

New components: `broker-inventory-workspace.tsx`, `broker-stalker.tsx`,
`ownership-workspace.tsx`, `sector-workspace.tsx`, `stock-research-tabs.tsx`,
`phase-broker-evidence.tsx`, `inventory-charts.tsx`, `foreign-flow-panel.tsx`,
`extended-alerts.tsx`, `research-primitives.tsx`, `research-watchlist.tsx`, all
under `src/components/`.

New pages: `src/app/brokers/page.tsx`, `ownership/page.tsx`, `sectors/page.tsx`,
`institutional-flow/page.tsx`, `data-status/page.tsx`.

Updated integration files: `src/components/production-market.tsx`, `shell.tsx`,
`intelligence-dashboard.tsx`, `charts/tradingview-market-chart.tsx`,
`src/app/alerts/page.tsx`, `src/app/watchlist/page.tsx`, `src/app/globals.css`.
Migration: `scripts/migrate-intelligence-v3.mjs`. Documentation: this report and
section 21 of `Remora_Day1-5_System_Specification.md`.
Client credential guard: `scripts/check-client-secrets.mjs` (run after build with
`node scripts/check-client-secrets.mjs`).

The working tree had existing changes before this extension; this is not an
attribution of every file shown by Git status.

## Final verification notes

127 unit/integration tests pass across 15 files. Typecheck passes. Lint has zero
errors and one pre-existing custom-font warning in the root layout. Production
build passes. Public-file checks pass. Browser verification covers actual BBCA
ownership percentages, verified-only filtering, selected owner details, AI broker
search, sector axis selection and Financials drill-down.

The market summary explicitly excludes the current Jakarta session; mixing a
partial-day volume with completed daily baselines produced misleading relative
volume during testing and has been corrected. Tests cover this exclusion and
zero-versus-null foreign-flow aggregation. SVG tooltips use one text node to avoid
React server/client hydration mismatches. This is manual browser validation, not
a claim that the complete Playwright suite passed.

Final browser checks also exercised POMPOM inventory filtering and position sizing:
Rp100,000 risk, entry 1,000 and stop 900 produced 10 lots and a required 30-lot exit
buffer. No new browser console errors remained after the SVG correction. The client
credential guard scanned 26 generated client assets against the one configured
credential without finding literal or URI-encoded values. No credential was printed.
