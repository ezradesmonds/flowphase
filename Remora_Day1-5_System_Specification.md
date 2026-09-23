# Remora Trade Day 1–5 — System Specification

## 0. Document status

- Source: five Remora Trade MP3 recordings supplied by the user.
- Total source duration: approximately 17 hours 6 minutes.
- Transcription: Indonesian speech-to-text with timestamps, reviewed through topic and formula extraction.
- Purpose: translate the instructor's thought process into an implementable IDX market-intelligence system.
- Important: the recordings contain hypotheses, personal heuristics, examples, and claims that are not automatically universal market facts. This specification separates source rules from engineering extensions.

### Evidence labels

- **SOURCE** — explicitly stated or demonstrated in the recordings.
- **DERIVED** — direct mathematical formalization of a source statement.
- **ENGINEERING** — proposed implementation needed to make the idea testable and robust.
- **CONFIGURABLE** — threshold or classification that must not be hard-coded.

---

## 1. Executive summary

The core method is not a single indicator. It is a hierarchy of evidence:

1. **Price and volume** establish the initial market thesis.
2. **Broker summary and inventory** confirm who appears to collect or release shares.
3. **Bid–offer, running trade, frequency, and order patterns** reveal short-term execution behavior and timing.
4. **Foreign flow, shareholder count, ownership composition, free float, corporate action, and narrative** supply context.
5. A valid conclusion must distinguish accumulation from distribution, real demand from crossing, and genuine liquidity from displayed liquidity.

The central question is:

> When every transaction has both a buyer and a seller, who is buying, who is selling, how concentrated are they, how much inventory remains, and how does price react?

The system must therefore produce evidence-based probabilities, not absolute accusations of manipulation or guaranteed trade signals.

---

## 2. Extracted material by day

## 2.1 Day 1 — Foundation, market hierarchy, IPO inventory, and evidence stack

### Extracted thought process

1. Market participants are modeled as market maker/controlling interest, big players, commentators/influencers, and retail. The trader attempts to reason from the capital holder's constraints rather than react like late retail. **SOURCE — Day 1 00:05–00:07 and 01:40–01:45.**
2. IPO allocation and free-float rules can estimate how many lots are initially available outside the controlling group. **SOURCE — Day 1 00:02:30–00:20:40.**
3. Use lots rather than transaction value to compare inventory because price changes while one lot remains one lot. **SOURCE — Day 1 00:17:19–00:17:43.**
4. Estimate how much inventory a known large subscriber could receive from allocation percentage, then treat an unexpectedly large sell order as a warning that the seller may not be ordinary retail. **SOURCE — Day 1 00:07:55–00:12:15.**
5. Inventory thresholds are stock- and event-specific. The example's two million lots and 83,000 lots are not universal constants. They came from one IPO allocation case. **SOURCE + interpretation.**
6. Price-volume analysis, transaction analysis, bid–offer, ownership/interest, and retail participation progressively increase confidence. The percentages mentioned in class are pedagogical confidence examples, not calibrated probabilities. **SOURCE — Day 1 01:34:10–01:37:20.**
7. A volume spike accompanied by price strength suggests serious participation; a correction without material volume suggests the large holder may not have distributed. **SOURCE — Day 1 01:36:20–01:37:10.**
8. Retail FOMO can be observed through retail-associated broker participation after repeated upward moves. **SOURCE — Day 1 01:14:10–01:15:10.**
9. A “moon stock” candidate is described as a stock that has remained quiet/sideways before expansion. **SOURCE — Day 1 01:39:58–01:40:15.**

### Formalized IPO and inventory formulas

```text
offered_lots = offered_shares / shares_per_lot
```

For IDX, `shares_per_lot` is normally 100, but it must remain a market configuration.

```text
centralized_allocation_lots = offered_lots × centralized_allocation_pct
```

```text
estimated_investor_lots = subscription_value × allocation_rate / ipo_price / shares_per_lot
```

```text
estimated_public_float_lots = free_float_shares / shares_per_lot
```

```text
large_sell_ratio = observed_sell_lots / estimated_public_or_retail_lots
```

Interpretation:

- A high ratio is an anomaly, not proof of a specific owner.
- Allocation percentages must come from current official documents and rules.
- Nominee accounts, crossing, strategic allocation, and pre-existing holdings create uncertainty.

### Extracted execution heuristic

The recording uses a “three times my intended lot” buffer when comparing personal order size with visible bid capacity. Convert it into a configurable liquidity policy:

```text
required_visible_exit_capacity = planned_position_lots × liquidity_buffer
```

Default research value:

```text
liquidity_buffer = 3
```

This must be displayed as a user risk rule, not a market law.

---

## 2.2 Day 2 — Price-volume logic, pattern probability, climax, and liquidity

### Extracted thought process

1. Patterns are probabilistic habits, not fixed rules. Behavior can change, so no historical pattern should be treated as deterministic. **SOURCE — Day 2 00:38–00:44.**
2. The strongest recurring price-volume principle is:
   - Price rising should be supported by increasing volume.
   - A decline on much lower volume implies that the previous large turnover cannot all have exited.
   - Volume represents completed transactions, not displayed intent. **SOURCE — Day 2 01:49:40–01:57:00.**
3. Selling climax is associated with support breaking and large panic volume, followed by evidence that selling pressure is exhausted. Bad news without further price decline can be a supporting clue. **SOURCE — Day 2 02:03–02:56.**
4. Liquidity must be assessed relative to intended position size. The instructor uses approximately three visible price levels/boards as a cut-loss buffer. **SOURCE — Day 2 02:22:25–02:23:00.**
5. Large returns are not useful if position size is too small relative to total equity; analysis must include portfolio capacity and liquidity. **SOURCE — Day 2 01:39:20–01:40:00.**
6. Transaction costs matter for high-turnover actors and can constrain market-making behavior. **SOURCE — Day 2 02:08:30–02:09:10.**

### Price-volume formulas

```text
return_t = (close_t - close_t-1) / close_t-1
```

```text
volume_ratio_n = volume_t / average(volume[t-n : t-1])
```

```text
turnover_ratio_n = traded_value_t / average(traded_value[t-n : t-1])
```

```text
down_volume_ratio = correction_volume / prior_impulse_volume
```

Interpretation candidate:

- Positive return + high volume ratio: confirmed demand/markup candidate.
- Negative return + low down-volume ratio: low-supply correction candidate.
- Negative return + extreme volume: distribution, liquidation, or selling-climax candidate; subsequent behavior is required to distinguish them.
- Positive return + low volume: weak confirmation or low-supply lift; needs broker and order-book evidence.

### Selling-climax candidate

```text
selling_climax_score =
    w1 × support_break_score
  + w2 × negative_return_extremeness
  + w3 × volume_extremeness
  + w4 × intraday_recovery_score
  + w5 × post_event_absorption_score
```

The event is confirmed only after subsequent price stabilization or recovery. A large red candle alone is insufficient.

### Liquidity formulas

```text
visible_bid_capacity_k = sum(bid_lots at first k levels)
```

```text
exit_coverage_ratio = visible_bid_capacity_k / planned_position_lots
```

```text
liquidity_pass = exit_coverage_ratio >= configured_buffer
```

Displayed orders can be cancelled; therefore calculate both displayed and executed liquidity.

---

## 2.3 Day 3 — Evidence roles, accumulation/distribution, broker inventory, and phase boundaries

### Evidence-role hierarchy

The recording explicitly distinguishes the tools:

| Evidence | Role |
|---|---|
| Price structure | Initial direction and support/resistance thesis |
| Volume | Participation, supply, confirmation, and abnormal activity |
| Broker summary | Confirmation of inventory transfer; not a standalone buy/sell signal |
| Bid–offer | Whether a stock appears ready to move and how orders are managed |
| Running trade/frequency | Execution details, split orders, repeated participation |
| Foreign flow | Additional ownership/flow context |

**SOURCE — Day 3 00:18:20–00:20:10 and 03:00:00–03:02:00.**

### Accumulation definition extracted from the recording

Accumulation is a transfer from many smaller sellers to fewer concentrated buyers. The recording describes “many retail sellers to one or a small group of buyers.” It also stresses that accumulation does not guarantee an immediate price increase. **SOURCE — Day 3 03:01:25–03:05:10.**

Formalization:

```text
net_lot_broker = broker_buy_lot - broker_sell_lot
```

```text
net_value_broker = broker_buy_value - broker_sell_value
```

```text
buyer_count = count(distinct brokers or participant proxies with net_lot > threshold)
```

```text
seller_count = count(distinct brokers or participant proxies with net_lot < -threshold)
```

```text
buyer_concentration = sum(top_k_positive_net_lot) / sum(all_positive_net_lot)
```

```text
seller_concentration = abs(sum(top_k_negative_net_lot)) / abs(sum(all_negative_net_lot))
```

Accumulation candidate:

```text
net_accumulation_lot > 0
AND buyer_concentration is high
AND seller_count > buyer_count
AND price impact is controlled
```

Distribution candidate is the inverse transfer:

```text
net_distribution_lot < 0
AND seller_concentration is high
AND buyer_count > seller_count
AND retail_proxy_absorption increases
```

### Critical clarification

The transcript contains a sentence transcribed as “akumulasi pasti lebih banyak pembeli daripada penjual,” while the surrounding explanation says fewer concentrated buyers absorb many sellers. The system must not use raw transaction-side counts as a literal participant count. Use concentration and distinct proxy counts, then validate through examples. This is marked **AMBIGUOUS SOURCE**.

### Inventory formulas

```text
estimated_inventory_lot[b, t] =
    estimated_inventory_lot[b, t-1] + buy_lot[b, t] - sell_lot[b, t]
```

If opening inventory is unknown:

```text
cumulative_net_lot[b, start:t] = Σ(buy_lot - sell_lot)
```

```text
weighted_average_buy_price = Σ(buy_price × buy_lot) / Σ(buy_lot)
```

```text
weighted_average_sell_price = Σ(sell_price × sell_lot) / Σ(sell_lot)
```

For inventory cost after partial sells, the accounting method must be explicit:

- Moving weighted average for operational estimation.
- FIFO only if sufficient chronological transaction detail exists.
- Never silently mix the two.

```text
remaining_inventory_ratio = estimated_remaining_lot / estimated_peak_inventory_lot
```

```text
inventory_depletion_ratio = 1 - remaining_inventory_ratio
```

### Healthy correction

The recording's repeated rule:

```text
impulse: price up + volume up
correction: price down + volume materially lower
```

This suggests supply contraction. It does not prove no distribution occurred.

### Volume anomaly early in session

Compare early-session cumulative turnover with typical full-day turnover at the same elapsed time:

```text
intraday_volume_pace = cumulative_volume_at_minute_m / median(cumulative_volume_at_minute_m over lookback days)
```

This is superior to comparing 09:15 volume directly against full-day average.

### Phase boundary method

Do not hard-code dates. Detect candidate boundaries from:

- Change point in price slope.
- Change point in realized volatility.
- Breakout/breakdown from an established range.
- Change in volume regime.
- Change in broker net-flow regime.
- Change in concentration and inventory direction.

---

## 2.4 Day 4 — Crossing, ownership composition, balance position, and contextual intelligence

### Extracted thought process

1. Price can rise while distribution occurs; broker flow must be checked instead of assuming every rise is accumulation. **SOURCE — Day 4 00:01:40–00:03:40.**
2. Broker codes are not identities. Related brokers, foreign/local structures, nominee accounts, and crossing can distort naive classification. **SOURCE — Day 4 00:04:30–00:14:30.**
3. Inventory calculations become biased when the same controlling interest appears on both sides or when crossing dominates. **SOURCE — Day 4 00:10:40–00:14:30.**
4. Ownership composition can show how many shares appear held by retail, mutual funds, local corporations, foreign corporations, foundations, and other categories. **SOURCE — Day 4 02:43:45–02:47:00.**
5. Changes between scrip and scripless/registered ownership may signal that previously unavailable shares could become tradeable, but interpretation needs corporate context. **SOURCE — Day 4 02:43:40–02:57:00.**
6. Bid–offer provides earlier notice; broker summary is primarily confirmation. **SOURCE — Day 4 02:35:50–02:36:20.**
7. Backtesting is explicitly required because ownership and conversion interpretations are not universally reliable. **SOURCE — Day 4 02:55:00–02:56:00.**

### Crossing detection

```text
same_broker_cross_ratio = matched_buy_sell_lot_same_broker / total_traded_lot
```

```text
suspected_related_cross_ratio =
    matched_lot_between_related_broker_group / total_traded_lot
```

Potential crossing attributes:

- Similar buy and sell quantity.
- Similar average price.
- Same or related broker group.
- Minimal net inventory change despite very large gross volume.
- Repeated execution within a narrow time window.

Gross volume must not be interpreted as accumulation if net inventory barely changes.

### Ownership change formulas

```text
ownership_change_lot[group, t] = ownership_lot[group, t] - ownership_lot[group, t-1]
```

```text
ownership_change_pct_point = ownership_pct_t - ownership_pct_t-1
```

```text
shareholder_count_change = holder_count_t - holder_count_t-1
```

Potential concentration signal:

```text
holder_count decreases
AND institutional_or_concentrated_ownership increases
```

This is supporting evidence only. Corporate actions, record dates, custody migration, and reporting lag must be checked.

---

## 2.5 Day 5 — Screener, frequency, split orders, bid–offer manipulation, and execution footprints

### Extracted thought process

1. Scan for accumulation percentages, then visually confirm rather than accepting screener output alone. **SOURCE — Day 5 01:35:30–01:41:00.**
2. Very high accumulation percentages may occur in illiquid stocks; moderate percentages in liquid stocks can be more actionable. **SOURCE — Day 5 02:06:30–02:10:00.**
3. Falling shareholder count while certain ownership categories rise can indicate concentration. **SOURCE — Day 5 01:40:50–01:42:00.**
4. Large gross buy and sell by the same actor can be crossing rather than genuine accumulation. **SOURCE — Day 5 01:52:30–01:54:00.**
5. Queue/order number is bookkeeping; position in the queue matters for execution, but must not be overinterpreted as directional intelligence. **SOURCE — Day 5 02:44:10–02:46:45.**
6. Small repeated lots are associated with retail-like activity; large intended positions may be split into irregular smaller orders to avoid being obvious. **SOURCE — Day 5 02:46:30–02:51:20.**
7. Frequency represents order/trade occurrences, not unique humans. One large order can be split into multiple frequency counts because of maximum order size or deliberate splitting. **SOURCE — Day 5 02:49:40–02:52:30.**
8. Thick bid/offer can be genuine, reloaded, rolled, or cancelled. Displayed depth must be compared with executed transactions. **SOURCE — Day 5 02:52:30–03:04:00.**
9. Good distribution can maintain optimism while inventory is supplied slowly into demand. **SOURCE — Day 5 03:01:30–03:04:00.**
10. Repeated trades within identical seconds and similar lot patterns are unlikely to be independent manual actions and can indicate split execution or automation. **SOURCE — Day 5 03:07:20–03:10:00.**
11. Accumulation footprint example: a level is consumed slowly by many sells, then a large buyer replenishes the bid and repeats the cycle. **SOURCE — Day 5 03:13:10–03:16:30.**

### Frequency and average lot

```text
average_lot_per_trade = total_executed_lot / trade_frequency
```

```text
average_lot_per_order = submitted_lot / order_count
```

Do not confuse these metrics if the API only supplies trades rather than order submissions.

### Split-order similarity

```text
lot_similarity(i, j) = 1 - abs(lot_i - lot_j) / max(lot_i, lot_j)
```

```text
time_gap(i, j) = timestamp_j - timestamp_i
```

```text
split_cluster_score =
    w1 × lot_similarity_score
  + w2 × time_proximity_score
  + w3 × same_price_score
  + w4 × same_side_score
  + w5 × repetition_score
```

Candidate conditions:

- Same symbol and side.
- Same broker if broker detail is available.
- Time gap within a configurable number of seconds.
- Lot values equal or sufficiently similar.
- At least N repeated events.
- Cluster volume is material relative to normal volume.

Label as `Suspected Split Execution`, never “confirmed smart money.”

### Reloading/iceberg-like behavior

```text
replenishment_ratio = replenished_display_lot / executed_lot_at_level
```

```text
level_persistence = time_level_remains_best_bid_or_offer
```

```text
absorption_score =
    executed_sell_lot_at_bid / max(price_decline_ticks, 1)
```

High sell execution with little price decline and repeated bid replenishment is an accumulation/absorption candidate.

### Spoof/rolling-depth candidate

```text
cancel_ratio = cancelled_lot / submitted_lot
```

```text
display_to_execution_ratio = displayed_lot / executed_lot
```

High cancellation or repeated relocation without execution is suspicious displayed liquidity. Only calculate if order-event data is available.

---

## 3. Unified four-phase system

Corrected phase model:
Accumulation → Pompom → Menggoreng → Distribution
Markdown separated as post-distribution market condition.

Primary cycle: **AKUMULASI → POMPOM → MENGGORENG → DISTRIBUSI**.
A sample may show only part of a cycle. Never manufacture missing phases.

### Akumulasi

Concentrated buyers collect observed net lots from dispersed sellers while price
forms a base or declines in a controlled way. Institutional-proxy inventory change
grows; retail proxies may sell. Absorption and bid replenishment require execution
or order-book evidence. Accumulation does not guarantee a rally.

### Pompom

Attention and participation build: daily frequency/volume growth, participant
broadening, higher lows or breakout attempts and retained observed net accumulation.
Pompom is not automatically an aggressive price advance. Without narrative data use
**POMPOM CANDIDATE — market-attention proxy only**. Attention is not proof of
coordinated promotion.

### Menggoreng

Aggressive price advance: historically extreme returns, extreme volume and/or
frequency, volatility expansion, distance from the base and retail participation.
Use **Menggoreng Candidate**, never a factual manipulation claim. Price-level
consumption requires suitable execution data.

### Distribusi

Earlier accumulators release observed net accumulation into dispersed buyers and
retail proxies. Concentrated selling and net depletion matter more than candle
color. Price may still rise or remain near highs. Crossing-heavy gross activity
cannot confirm distribution.

### Post-distribution condition and abstention

**Post-Distribution Markdown** is a separate condition after distribution, support
breakdown, negative slope and weakening demand. It is never a substitute for
Distribusi. A new base and confirmed accumulation after reset begins a new cycle.

Allowed states: AKUMULASI, POMPOM, MENGGORENG, DISTRIBUSI, TRANSITION, UNCERTAIN,
POST_DISTRIBUTION_MARKDOWN, INSUFFICIENT_DATA. Only the first four are primary phases.

---

## 4. Feature catalogue

### Price and volume

- Returns over 1/5/20/60 periods.
- Price slope and slope change.
- Range width and compression.
- Breakout distance.
- Volume ratio and z-score.
- Intraday volume pace.
- Up-volume vs down-volume.
- Price impact per million lots.
- Climax and absorption metrics.

### Broker flow and inventory

- Buy lot, sell lot, net lot.
- Buy value, sell value, net value.
- Weighted average buy/sell price.
- Observed cumulative net lot change since an explicit start date; absolute inventory only with sourced opening holdings.
- Inventory change and depletion.
- Buyer/seller concentration.
- Retail-proxy and institutional-proxy aggregate flow.
- Broker behavior change.
- Gross-to-net ratio to detect crossing.

### Order-book and transaction behavior

- Depth per level.
- Depth imbalance.
- Executed lot per side.
- Replenishment.
- Cancellation/relocation.
- Average lot per trade.
- Frequency anomaly.
- Repeated-lot cluster.
- Same-second burst.
- Possible split execution.

### Ownership/context

- Free float.
- Holder count.
- Ownership by investor category.
- Foreign flow.
- Scrip/scripless or available-to-trade changes when available.
- Corporate actions.
- IPO allocation and listing age.
- Sector relative strength.

---

## 5. Phase scoring

Research weights live in versioned src/config/phases.ts, not universal truths.
Price/frequency growth features use trailing symbol percentiles conditioned on
liquidity bucket when sufficient history exists. Sparse references lower quality.
Broker concentration/dispersion are bounded ratios; their calibration remains a
backtesting task.

    accumulation = 2*concentrated_net_buy + 2*inventory_growth
                 + seller_dispersion + retail_exit + absorption
                 + controlled_price_impact + low_volume_correction - crossing_penalty
    pompom = attention_growth + frequency_growth + volume_growth
           + participant_broadening + breakout_attempt + retail_interest_growth
           + retained_inventory + narrative
    menggoreng = 2*extreme_return + extreme_volume + volatility_expansion
               + distance_from_base + retail_fomo + frequency_anomaly
               + rapid_price_level_consumption
    distribution = 2*previous_accumulator_net_sell + 2*inventory_depletion
                 + seller_concentration + buyer_dispersion + retail_absorption
                 + supply_near_high + failed_breakout - crossing_penalty

Each positive sum is divided by the sum of available feature weights before the
crossing penalty. Missing features stay null and lower coverage. Narrative,
order-book absorption and price-level consumption are unavailable in this adapter.
Depletion without a supplied opening position refers only to observed net changes,
never absolute inventory.

    final_confidence = raw_phase_confidence * data_coverage * data_quality_factor
    gross_to_net_ratio = (buy_lot + sell_lot) / max(abs(buy_lot - sell_lot), 1)

Confidence is reduced for close score margins, missing brokers/narrative/order book,
short history, sparse liquidity references, crossing, unknown publication times and
staleness. OHLCV-only confidence is capped at 35 and labeled
**Price-Volume Phase Candidate**. Thresholds require out-of-sample calibration.

---

## 6. Dynamic phase segmentation

1. Build daily feature vectors.
2. Detect structural change points in price slope, volume regime, volatility, broker net flow, and concentration.
3. Create candidate segments between change points.
4. Enforce minimum duration appropriate to timeframe.
5. Score every segment for each phase.
6. Merge adjacent segments with the same phase if evidence remains similar.
7. Mark short ambiguous areas as transition.
8. Persist start/end date, actual segment high/low, confidence, coverage, three leading evidence items, counterevidence and algorithm/config version.
9. Begin a new cycle after markdown/reset followed by a new base and confirmed accumulation.

Suggested algorithm options:

- MVP: rolling-window thresholds + hysteresis.
- Improved: PELT/Bayesian change-point detection.
- Later: supervised or hidden Markov model only after a reviewed labeled dataset exists.

Hysteresis prevents daily label flicker:

```text
switch phase only if candidate_score >= current_score + margin
for at least confirmation_periods
```

---

## 7. Broker classification model

Do not permanently hard-code “retail” or “smart money.” Store hypotheses:

```text
broker_classification:
  broker_code
  label: retail_proxy | institutional_proxy | mixed | unknown
  confidence
  effective_from
  effective_to
  rationale
  source
```

Initial user hypotheses:

- Retail proxies: XL, XC, YP, PD, KK.
- Smart-money/institutional proxies: AI, CS, BK, YU, AK.

The recordings themselves show that behavior may change, a broker can be “ridden” by another participant, and related/crossing activity can invalidate naive labels. Classification must therefore be time-varying and editable.

---

## 8. Alert catalogue

Each alert contains symbol, timestamp, severity, evidence, baseline, actual value, confidence, data coverage, and link to chart.

- ACCUMULATION_CANDIDATE
- POMPOM_ATTENTION_CANDIDATE
- AGGRESSIVE_MARKUP_CANDIDATE
- DISTRIBUTION_CANDIDATE
- POST_DISTRIBUTION_MARKDOWN
- INSUFFICIENT_DATA

Alerts require the relevant available evidence. Catalogue entries are not a claim
that every detector is enabled. Tick execution, split, same-second and bid
replenishment alerts are disabled without a verified source.


- `EXTREME_VOLUME`
- `EXTREME_BUY_EXECUTION`
- `EXTREME_SELL_EXECUTION`
- `CONCENTRATED_NET_BUY`
- `CONCENTRATED_NET_SELL`
- `INVENTORY_GROWTH`
- `INVENTORY_DEPLETION`
- `RETAIL_EXIT`
- `RETAIL_ABSORPTION`
- `BREAKOUT_WITH_VOLUME`
- `LOW_VOLUME_CORRECTION`
- `SELLING_CLIMAX_CANDIDATE`
- `FAILED_BREAKOUT`
- `SUSPECTED_CROSSING`
- `SUSPECTED_SPLIT_EXECUTION`
- `BID_REPLENISHMENT`
- `DISPLAYED_LIQUIDITY_CANCELLED`
- `SAME_SECOND_BURST`
- `SHAREHOLDER_CONCENTRATION_CHANGE`
- `PHASE_TRANSITION`
- `CONFIDENCE_DROP`

---

## 9. Data requirements and API capability matrix

| Feature | Minimum data | If unavailable |
|---|---|---|
| Price-volume phase | Daily/intraday OHLCV | Cannot classify intraday behavior |
| Broker inventory | Broker buy/sell lot and value by period | Hide inventory module |
| Weighted average broker price | Broker price/value and lots | Show net lot only |
| Split execution | Tick timestamp, lot, price, side, ideally broker | Feature unavailable |
| Bid replenishment/spoof | Order-book event stream | Do not infer from snapshots alone |
| Foreign flow | Foreign buy/sell | Hide foreign component |
| Holder concentration | Periodic holder count/ownership | Use broker proxies only |
| IPO inventory | Prospectus/allocation/free-float data | Disable IPO-specific thresholds |

Before coding against Sectors API:

1. Enumerate actual endpoints.
2. Save example responses and schemas.
3. Map each field to this matrix.
4. Mark unsupported features explicitly.
5. Never fill unavailable fields with dummy production data.

---

## 10. System architecture

```text
Sectors API / licensed market feeds
        ↓
Ingestion and source snapshots
        ↓
Normalization and data-quality checks
        ↓
Feature engineering
        ↓
Price-volume engine ─ Broker inventory engine ─ Microstructure engine
        ↓
Phase segmentation and confidence engine
        ↓
Alert engine and evidence store
        ↓
Backend API
        ↓
Dashboard + TradingView-compatible chart overlay
```

Recommended stack:

- Next.js + TypeScript.
- Tailwind CSS.
- PostgreSQL + Prisma.
- Worker/cron for ingestion and recomputation.
- Redis only if queues/cache are required.
- TradingView integration already present in `tradingview-test`; inspect license and drawing capability before replacement.

---

## 11. Core database entities

- `stocks`
- `daily_prices`
- `intraday_bars`
- `trades`
- `orderbook_events`
- `broker_daily_flows`
- `broker_period_flows`
- `broker_inventory_snapshots`
- `broker_classifications`
- `foreign_flows`
- `ownership_snapshots`
- `shareholder_counts`
- `ipo_allocations`
- `corporate_actions`
- `feature_snapshots`
- `phase_segments`
- `phase_evidence`
- `alerts`
- `analysis_configs`
- `ingestion_runs`
- `data_quality_issues`

All analytical records require source timestamp, ingestion timestamp, timezone, data source, data quality status, algorithm/config version, and reproducibility key.

---

## 12. Backend API specification

```text
GET /api/stocks
GET /api/scanner
GET /api/stocks/:symbol/overview
GET /api/stocks/:symbol/bars
GET /api/stocks/:symbol/phases
GET /api/stocks/:symbol/phase-evidence
GET /api/stocks/:symbol/broker-flow
GET /api/stocks/:symbol/inventory
GET /api/stocks/:symbol/orderbook-analysis
GET /api/stocks/:symbol/ownership
GET /api/alerts
GET /api/data-status
GET /api/config
PATCH /api/config
POST /api/recompute/:symbol
POST /api/backtests
```

Every analytical endpoint returns:

```json
{
  "data": {},
  "asOf": "ISO-8601",
  "timezone": "Asia/Jakarta",
  "source": [],
  "dataCoverage": 0.0,
  "qualityFlags": [],
  "algorithmVersion": "..."
}
```

---

## 13. Dashboard specification

### Main dashboard

- Count of analysed stocks by the four primary phases, abstention states and separate markdown condition.
- Highest-confidence accumulation, attention-only Pompom, aggressive Menggoreng and inventory-supported Distribusi candidates.
- Candidate phase transitions and post-distribution markdown warnings.
- Extreme volume, concentrated net flow, institutional-proxy accumulation and retail-absorption alerts; execution alerts only with verified tick data.
- Data freshness/status.

### Scanner

Columns:

- Symbol and company.
- Sector.
- Active phase and separate market condition.
- Confidence and coverage.
- Phase start and duration.
- Price return.
- Relative volume.
- Top net buyer, top net seller and crossing risk.
- Retail proxy flow.
- Observed Inventory Change Since [start date], with broker/cohort identified.
- Latest alert.

### Stock analysis

- Candlestick and volume chart.
- Colored phase regions on chart.
- Marker alerts with evidence drill-down.
- Price-volume panel.
- Broker inventory table.
- Buyer/seller concentration.
- Ownership and holder-count changes.
- Order-book behavior when available.
- Explanation: evidence for and against current classification.

### Phase colors

- Accumulation: blue.
- Pompom: purple.
- Menggoreng: orange.
- Distribusi: red.
- Post-Distribution Markdown: dark red with distinct opacity.
- Transition/Uncertain: gray.

---

## 14. Backtesting and validation

### Avoid look-ahead bias

- A phase result at date T may only use data available by T.
- Ownership reports with publication delay use publication date, not period-end date.
- Revised data must preserve revision history.

### Evaluation

- Phase stability.
- Forward return distribution by phase.
- Maximum adverse/favorable excursion.
- Precision of breakout/markdown alerts.
- Inventory-direction consistency.
- Alert lead time.
- False-positive rate by liquidity bucket.
- Calibration: events labeled 70% confidence should succeed near 70% under the defined target.

### Human review dataset

Create labeled examples with:

- Symbol and date range.
- Phase label.
- Evidence screenshots/data.
- Alternative interpretation.
- Reviewer confidence.
- Disagreement notes.

---

## 15. Safety and interpretation rules

1. Never claim a broker code proves beneficial ownership.
2. Never claim manipulation as fact from patterns alone.
3. Never label all price rises as smart-money buying.
4. Never label all declines as smart-money selling.
5. Treat accumulation as inventory-transfer evidence, not a guaranteed rally.
6. Treat displayed bid/offer as revocable intent until executed.
7. Separate gross activity, net activity, and estimated inventory.
8. Report missing data and lower confidence. Evidence statuses are OBSERVED, DERIVED, INFERRED and UNAVAILABLE. Unknown opening inventory must never be silently set to zero.
9. Use the system as research support, not personalized financial advice.

---

## 16. MVP priorities

### MVP 1 — feasible with OHLCV

- Real IDX stock universe.
- Price-volume features.
- Dynamic phase candidate regions.
- TradingView chart and boxes.
- Scanner and basic alerts.
- Evidence/confidence/data freshness.

### MVP 2 — if broker summary exists

- Broker flow.
- Inventory estimation.
- Concentration and retail/institutional proxy flow.
- Crossing warning.

### MVP 3 — only with tick/order-book data

- Same-second clusters.
- Split execution.
- Replenishment/reload.
- Displayed-vs-executed liquidity.
- Microstructure alerts.

### MVP 4 — ownership intelligence

- Holder-count trends.
- Ownership-category changes.
- IPO/free-float inventory model.
- Corporate-action context.

---

## 17. Acceptance criteria

- No sample symbol or date is hard-coded as the production universe.
- All IDX symbols returned by the supported source can be scanned.
- Phase regions have start/end timestamps and visible evidence.
- Every phase has confidence and data coverage, evidence for/against and algorithm version.
- Pompom and Menggoreng have distinct definitions and features; distribution can occur while price rises. Markdown is a separate post-distribution condition.
- Safe cache migration preserves legacy records and recomputes ambiguous labels rather than renaming them.
- Broker inventory distinguishes observed net changes from absolute holdings. Unknown opening inventory leaves remaining/depletion ratios unavailable. Moving weighted average is the operational cost convention, never FIFO.
- Crossing-heavy periods do not inflate accumulation score without warning.
- Microstructure features disappear cleanly when tick/order-event data is absent.
- API secrets remain server-side and `.env` is ignored by Git.
- Production mode contains no fabricated market data.
- Build, lint, type-check, unit tests, and primary user flows pass.
- Backtest reproduces the same result for the same data/config/version.

---

## 18. Key unresolved questions

1. Which Sectors endpoints provide historical broker summary, tick trades, bid–offer, foreign flow, holder count, and ownership categories?
2. Does `tradingview-test` use a widget, Charting Library, or another API capable of custom phase regions?
3. What accounting convention should broker inventory use when starting inventory is unknown?
4. How should broker classifications change across symbols and time?
5. Which official IPO/allocation/free-float sources can be licensed and automated?
6. What forward outcome defines a correct phase during backtesting?
7. What minimum liquidity universe should the scanner enforce?

Until these are answered, unsupported modules must remain capability-gated.

---

## 19. Final implementation principle

The intended system is an evidence engine, not a label generator. Its most valuable output is not merely “AKUMULASI,” but:

```text
Accumulation candidate — confidence 74%

For:
- price remained within an 8% range for 24 sessions;
- top three net buyers absorbed 67% of positive net lot;
- retail proxies were net sellers;
- down-volume was 41% of impulse volume;
- two bid-replenishment clusters were observed.

Against:
- ownership data unavailable;
- 32% of gross broker activity may be crossing;
- current breakout is not confirmed.
```

That structure faithfully preserves the recordings' repeated principle: form a thesis, confirm it with independent evidence, identify what can invalidate it, and never rely on one indicator alone.

## 20. Implementation record — corrected model v2

The Day 1–5 extraction in section 2 is preserved. Runtime model:
remora-phases-2.0.0; configuration: research-defaults-2.0.0.

scripts/migrate-phase-cache.mjs inventories v1 JSON records with SHA-256 and
preserves them verbatim. New analysis uses .flowphase/analysis-v2; no SQL database
exists here. Old combined labels require recomputation; they are not reinterpreted.

Inventory formulas:

    net_lot = buy_lot - sell_lot
    net_value = buy_value - sell_value
    observed_change = sum(net_lot) since period start
    average_buy_price = buy_value / (buy_lot * 100)
    average_sell_price = sell_value / (sell_lot * 100)
    estimated_inventory_t = sourced_opening_lots + sum(net_lot)
    remaining_ratio = estimated_remaining_lots / estimated_peak_lots
    depletion_ratio = 1 - remaining_ratio

Opening inventory remains Unknown without a supplied estimate, source and date.
Broker classifications support effective dates and stock-specific hypotheses.

Phase 1 verified daily broker lot/value and frequency aggregates. Tick, bid–offer
and narrative were not verified. The application preserves existing Sectors and
TradingView transports; no speculative provider endpoint was added. Regions use
Lightweight Charts primitives, not embedded-widget drawing claims.

Walk-forward evaluation in src/lib/phases/backtest.ts excludes unavailable broker
records, separates broker/no-broker runs and liquidity buckets, and reports matured
forward return distributions, adverse/favorable excursion and phase stability.
Transition accuracy, false-positive rate and lead time require external review
events; unavailable ground truth is not fabricated.

Known limitation: existing interactive retrieval is bounded (three broker windows
and capped chart requests); lifetime completeness is unverified. All loaded bars
are analysed, but this is not a claim to retrieve all exchange history. A licensed
historical collector with publication watermarks and corporate-action alignment is
needed before claiming complete-cycle broker coverage or calibrated performance.


## 21. Broker, ownership and market intelligence extension

See `docs/broker-ownership-intelligence-v3.md` for the implementation and source audit.
The Day 1–5 source extraction above remains unchanged. Broker affiliation and behavior
proxy are separate. Phase inventory carries signed observed changes between segments;
pre-period holdings remain Unknown. Daily aggregates do not authorize realized PnL.
Ownership graph edges require disclosures; no broker flow or name similarity creates
legal ownership. Public/Treasury rows are aggregate categories, not owners. Market
and sector outputs disclose acquired coverage, aligned sessions and unavailable inputs.
All new primary metrics carry provenance, periods, status, method and quality flags.
