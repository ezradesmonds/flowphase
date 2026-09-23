# Phase model v2 implementation report

Corrected phase model:
Accumulation → Pompom → Menggoreng → Distribution
Markdown separated as post-distribution market condition.

## Implementation

Four independent primary scores feed a causal state machine. Three-bar confirmation,
minimum duration, score margin and hysteresis prevent forced cycles and daily flicker.
Markdown requires a previously confirmed distribution and subsequent breakdown with
inventory-depletion evidence. Distribution can therefore begin while price still rises.
OHLCV-only labels explicitly say Price-Volume Phase Candidate, with confidence capped
at 35. Evidence is classified OBSERVED / DERIVED / INFERRED / UNAVAILABLE.

The chart uses real Lightweight Charts primitives for bounded regions, with dates,
price extrema, confidence, coverage and evidence. Scanner/dashboard expose state,
condition, phase duration/return, broker flow, crossing risk and alerts. Broker profiles
are configurable proxies with effective dates; they do not identify beneficial owners.

## Final formulas

For each phase, S = sum(weight × available normalized feature) / sum(available weights).
Unavailable features remain null. Accumulation and distribution subtract
35 × crossing risk. Configurable gates, minimum score 46 and ambiguity margin 7 apply.
Weights below are research defaults, versioned in src/config/phases.ts:

- AKUMULASI: 2 concentrated net buy + 2 inventory growth + seller dispersion + retail exit + absorption + controlled price impact + low-volume correction.
- POMPOM: attention growth + frequency growth + volume growth + participant broadening + breakout attempt + retail interest growth + retained inventory + narrative (unavailable).
- MENGGORENG: 2 extreme return + extreme volume + volatility expansion + distance from base + retail FOMO + frequency anomaly + rapid price-level consumption (unavailable).
- DISTRIBUSI: 2 previous-accumulator net sell + 2 inventory depletion + seller concentration + buyer dispersion + retail absorption + supply near high + failed breakout.

Confidence = rounded min(cap, top score × (0.5 + 0.5 × min(1, score margin / 20))
× coverage × quality). The broker-supported cap is 100; OHLCV-only cap is 35.
Coverage includes available feature weights and broker coverage. Quality includes
source quality and a further Pompom penalty because narrative is absent. Pending
confirmation caps confidence at 20; stale analysis receives an additional penalty.
These numbers are research scores, not calibrated probabilities.

Net lots = buy lots − sell lots. Observed change = cumulative net lots in the selected
period. Absolute inventory remains Unknown unless opening lots have a source and date.
Buy/sell average price = corresponding value / (lots × 100).
With a known opening cost, buys update the moving weighted average; sells reduce
quantity at that average. FIFO is not used. Unknown cost cannot be reconstructed.
Crossing is an aggregate gross-to-net proxy, not proof of matched counterparties.

## Migration

Run `node scripts/migrate-phase-cache.mjs`. It preserves legacy analysis-v1 JSON,
creates a SHA-256 manifest and prepares analysis-v2. Executed successfully for three
legacy records. Combined old labels are recomputed on demand, never blindly renamed.
There is no SQL database migration. Acquired broker and candle history is retained
across refreshes; unchanged broker observations keep their first availability time.

## Active and gated features

Active: daily price/volume candidates; available Sectors broker lot/value/frequency
features; inventory change and weighted cost where supported; crossing penalty;
phase regions; scanner filters; gated alerts; causal replay and walk-forward evaluation.
Evaluation reports stability, matured forward returns, MAE/MFE, liquidity buckets,
broker/no-broker comparison and concurrent inventory-direction agreement among prior
observed accumulators. Reviewed transition labels are required for accuracy, false
positive rate and lead time. Inventory agreement is not independent predictive proof.

Unavailable: verified narrative confirmation, tick-level trades, bid/offer event
consumption, exact crossing identification, beneficial ownership and unknown absolute
opening holdings. These are not fabricated. Production uses the existing integrations.

## Changed files by responsibility

- Domain/configuration: src/domain/market.ts, src/domain/intelligence.ts, src/domain/schemas.ts, src/config/phases.ts, src/config/brokers.ts.
- Engine: src/lib/phases/features.ts, detect.ts, styles.ts, backtest.ts.
- Intelligence: src/lib/intelligence/analyze.ts, alerts.ts, inventory.ts, cycles.ts, summary.ts, store.ts, history.ts.
- Chart: src/components/charts/tradingview-market-chart.tsx, phase-regions-primitive.ts.
- UI: src/components/intelligence-panels.tsx, intelligence-dashboard.tsx, stock-directory.tsx, stock-detail.tsx, overview.tsx, shell.tsx; src/app/methodology/page.tsx, broker-flow/page.tsx, globals.css; src/lib/format.ts.
- Tests: src/lib/phases/detect.test.ts, backtest.test.ts; src/lib/intelligence/history.test.ts, intelligence.test.ts; src/lib/core.test.ts; src/components/charts/phase-regions-primitive.test.ts; playwright.config.ts.
- Migration/docs: scripts/migrate-phase-cache.mjs, Remora_Day1-5_System_Specification.md, docs/phase-regions.md, docs/intelligence-upgrade.md, this report.

The working tree already contained substantial edits before this task. This list
identifies the relevant implementation surface, not an attribution of every existing
Git modification. Day 1–5 extraction was retained; downstream interpretation updated.

## Validation and remaining work

111 tests pass across 13 files. Production build and typecheck pass. Lint completes
with zero errors and one existing font warning in src/app/layout.tsx. Public-file
checks pass without printing secrets.
Manual browser checks covered methodology, the 962-stock Sectors directory, phase
filter/reset and BBCA real-data chart with 500 bars and phase overlays.
Automated Playwright execution was blocked before tests by browser launch `spawn UNKNOWN`
with both Chromium and Chrome. This is not a passing end-to-end test result.

Historical retrieval remains bounded: three broker windows and capped chart requests.
All acquired bars are analyzed, but complete lifetime history is not guaranteed.
A verified historical collector, point-in-time publication records, consistent
corporate-action adjustments and independently reviewed phase labels are prerequisites
for full-history claims and empirical calibration. Revised provider data also require
an immutable revision archive for a reproducible historical research dataset.
