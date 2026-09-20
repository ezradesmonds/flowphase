import { DemoNotice, PageHeading, PhaseBadge } from "@/components/ui";
import { demoMode } from "@/lib/server/mode";
import type { MarketPhase } from "@/domain/market";
export const metadata = { title: "Methodology" };
const descriptions: [MarketPhase, string][] = [
  [
    "ACCUMULATION",
    "A potential base-building period: compressed price ranges and consistent positive flow from a defined broker cohort may provide accumulation evidence.",
  ],
  [
    "MARKUP",
    "A potential advancing phase: price moves above an earlier range, with supportive volume and flow evidence.",
  ],
  [
    "EUPHORIA",
    "An unusually extended advance: rapid price progress, high relative volume and expanding volatility may indicate elevated risk.",
  ],
  [
    "DISTRIBUTION",
    "A potential transfer of supply: earlier accumulators turn into net sellers, while high volume produces weaker price progress.",
  ],
  [
    "MARKDOWN",
    "A potential declining phase: price breaks below support and persistent negative flow may reinforce the downtrend.",
  ],
  [
    "UNCLASSIFIED",
    "Evidence is insufficient, weak or conflicting. A responsible engine should leave the phase unclassified rather than force a label.",
  ],
];
export default function Methodology() {
  if (!demoMode)
    return (
      <>
        <PageHeading
          title="Research methodology"
          description="Transparent source boundaries and calculated evidence."
        />
        <div className="panel evidence-inline">
          <h2>Four phases, incomplete cycles</h2>
          <p>
            Accumulation → Markup → Distribution → Markdown describes a possible
            complete cycle, never a required sequence. Euphoria Risk is a tag
            inside extended Markup. Ambiguous bars stay unclassified; the first
            two matching bars are transition candidates, with no colored
            rectangle. The third matching bar starts the confirmed region
            without backpainting earlier bars.
          </p>
          <h2>Price &amp; volume · TradingView</h2>
          <p>
            Trailing 20-bar directional movement relative to ATR, efficiency and
            volume-weighted close location define the phase. Markup/markdown
            require 1.8 ATR movement and 0.35 efficiency. Consolidation requires
            efficiency below 0.35, range within 10 ATR and close-location proxy
            beyond ±0.10. Euphoria Risk requires 5 ATR, 0.60 efficiency and
            1.60× relative volume. Confidence is a rule-strength score, not
            probability.
          </p>
          <p>
            A new confirmed accumulation after a distribution or markdown closes
            a cycle candidate. Missing or skipped phases remain incomplete. The
            latest cycle stays active. Historical classifications use only the
            candle prefix; active candles, region bounds and summaries can
            change. There is no trained change-point model or hindsight
            optimization.
          </p>
          <h2>Broker classification · user heuristic</h2>
          <p>
            XL, XC, YP, PD and KK start as retail-accessible. AI, CS, BK, YU and
            AK start as institutional-associated proxies. Other or disabled
            codes are unknown/mixed. All three groups stay visible. The registry
            in src/config/brokers.ts can be edited centrally; initial confidence
            is 40%, uncalibrated. These are hypotheses, not verified client
            identities. One broker represents many clients.
          </p>
          <h2>Estimated inventory</h2>
          <p>
            Sort daily Sectors rows chronologically for each ticker and broker.
            Cumulative net = cumulative buy lots − sell lots. Peak = maximum
            positive cumulative net; remaining = max(0, ending net); reduction =
            peak − remaining; ratio = remaining / peak, unavailable when peak is
            zero. Starting holdings before the selected cycle or available
            period are unknown. Negative net flow does not establish short
            selling. Broker flow is not beneficial ownership.
          </p>
          <p>
            Sectors blot/slot are lots; bval/sval are IDR. One IDX equity lot is
            100 shares. Weighted average price = gross value / (gross lots ×
            100), or a lot-weighted provider average when gross values are
            absent. Missing values stay unavailable. If the cycle predates
            broker coverage, the interface says available history, never
            full-cycle inventory. Market value uses the selected TradingView
            close and is an estimate.
          </p>
          <h2>Price-volume evidence</h2>
          <p>
            Volume relative to the preceding 20 bars, population z-score,
            rolling return, ATR, range expansion, wick ratios, price progress
            per unit volume, and prior-range breakout/breakdown provide context.
            Rising price on weak volume and falling price on weak volume are
            ambiguous. Close location and wick absorption are proxies, not
            verified aggressor side. True VWAP, turnover and free-float turnover
            remain unavailable without verified transaction prices and share
            denominators.
          </p>
          <h2>Alerts &amp; baselines</h2>
          <p>
            Initial configurable volume thresholds: medium RVOL ≥2 or z ≥2; high
            ≥3/3; critical ≥5/4. Require 20 prior bars and nonzero variance.
            Large absolute close-to-close changes above 40% anywhere in the
            baseline suppress volume alerts as a possible corporate-action/data
            anomaly; this is not a corporate-action adjustment feed. Total OHLCV
            cannot establish buy versus sell volume.
          </p>
          <p>
            Institutional block-flow and unusual net sell require a configured
            institutional-associated broker, 20 prior reported broker sessions,
            at least 3× its own baseline and z ≥3. Zero variance or missing
            baseline suppresses the signal. These are daily aggregate proxies,
            not verified block trades. Lot amounts are not compared with raw
            TradingView volume until cross-source volume units and session
            coverage are verified.
          </p>
          <h2>Stealth detection is disabled</h2>
          <p>
            The integrated endpoint supplies daily summaries. Missing:
            second-level timestamps, verified aggressor side, per-trade lot
            size, per-trade price and transaction identifiers. Repeated daily
            accumulation cannot establish orders split seconds apart. No
            granular events are invented.
          </p>
          <h2>Freshness, coverage &amp; sources</h2>
          <p>
            Sectors supplies the complete paginated IDX universe, company names,
            sector/subsector, free-float ratio and daily broker data when
            available. TradingView supplies OHLCV exclusively. FlowPhase
            supplies calculations. Fetch time is not market observation time.
            Realtime entitlement and exchange delay are unknown.
          </p>
          <p>
            Directory cache: 24 hours. Analysis cache: 15 minutes per ticker,
            locally persisted. Broker history: three sequential, disjoint 14-day
            windows, at most three credits per uncached stock. On-demand batches
            contain at most five stocks; no market-wide recalculation on
            Dashboard requests. The dashboard and scanner disclose actual
            analysed coverage. NEW alerts mean the latest analysed session, not
            realtime; older events are historical/EXPIRED.
          </p>
          <h2>Validation &amp; interpretation</h2>
          <p>
            All thresholds and broker labels need walk-forward, out-of-sample
            backtests across multiple stocks, regimes and periods. Include
            costs, corporate actions, missing sessions and historical data
            availability. Test whether institutional-associated brokers precede
            markup, retain net accumulation, accumulate at lower prices and
            reduce estimates near distribution. Lower classification confidence
            when these hypotheses fail. Avoid optimizing on the evaluation
            period.
          </p>
          <p>
            False positives are expected. No result is investment advice, an
            ownership assertion, proof of manipulation or an order-execution
            instruction.
          </p>
        </div>
      </>
    );
  return (
    <>
      <PageHeading
        title="Understand the evidence."
        eyebrow="REFERENCE / METHODOLOGY"
        description="Clear definitions, visible limitations and no claims of certainty."
      />
      <DemoNotice />
      <div className="prose">
        <section>
          <h2>What this prototype does</h2>
          <p>
            FlowPhase currently uses deterministic synthetic fixtures. Real
            ticker and company labels help navigation; every price, volume,
            broker flow, phase, confidence score and cycle date is fictional. No
            market data provider is connected. The demo contains 12 stocks, not
            the entire IDX universe.
          </p>
          <p>
            Phase labels and cycle boundaries are authored examples. They are
            not automatically detected, and the interface does not perform a
            live scan. A production analysis engine will be implemented and
            validated separately.
          </p>
        </section>
        <section>
          <h2>The six market phases</h2>
          <div className="phase-explanations">
            {descriptions.map(([phase, description]) => (
              <article key={phase}>
                <PhaseBadge phase={phase} />
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section>
          <h2>Phase confidence is not a forecast</h2>
          <p>
            Demo confidence scores are fixed illustrative values from 0 to 100.
            In a future engine, confidence will describe the strength, agreement
            and completeness of observed evidence. It will not mean a
            probability of profit or a guaranteed direction. Missing history,
            incomplete broker coverage and contradictory evidence must reduce
            confidence or produce Unclassified.
          </p>
        </section>
        <section>
          <h2>Cumulative broker net flow</h2>
          <p>
            For each broker and stock, daily net lots equal buy lots minus sell
            lots. Cumulative net flow is the sum within the selected period. The
            scanner shows the fixed fictional cohort D1 + D2. Summing over all
            matched market counterparties would cancel to zero, so it is not
            meaningful to call total market net flow an accumulation signal.
          </p>
        </section>
        <section>
          <h2>Estimated inventory since cycle start</h2>
          <p>
            The ledger starts at zero on the period start date. Peak estimated
            inventory is the highest positive cumulative net flow reached.
            Estimated remaining inventory is the larger of zero and current
            cumulative net flow. The remaining ratio divides this estimate by
            the peak; when there has been no positive peak it is unavailable,
            not zero.
          </p>
          <p>
            This estimates transaction-flow changes relative to a chosen
            starting point. Brokers may have pre-existing positions,
            intermediate client activity or transfers that this calculation
            cannot see. A negative cumulative value is preserved as signed flow;
            it does not imply literal short inventory. Resetting the period can
            materially change the estimate.
          </p>
        </section>
        <section>
          <h2>Flow does not prove ownership</h2>
          <p>
            Broker summary data describes transactions executed through a
            broker, potentially for many unrelated clients. It does not
            establish beneficial ownership, investment intent or manipulation. A
            dominant accumulator or distributor is simply a broker with the
            largest positive or negative net flow in the measured window. A
            broker should not automatically be called “smart money.”
          </p>
        </section>
        <section>
          <h2>Other demo measurements</h2>
          <p>
            Relative volume is the last demo session’s volume divided by the
            average of the preceding 20 sessions. Price progress compares the
            first and last closing price within a period. Flow concentration is
            the share of absolute net broker lots accounted for by the top two
            brokers. Distribution risk is an authored illustrative score, not a
            calculated trading recommendation.
          </p>
          <p>
            Fixture dates use weekdays without an exchange holiday calendar.
            Candle prices are unadjusted synthetic numbers. Historical splits,
            corporate actions, free float, foreign flow and order-book data are
            not modeled. The phase timeline follows the chart’s selected session
            window but does not follow manual chart panning or zooming.
          </p>
        </section>
        <section>
          <h2>Research limitations & disclaimer</h2>
          <p>
            Future classification will require verified data, point-in-time
            history, corporate-action treatment and tests for look-ahead bias.
            Regimes change; historical relationships may not persist. This
            prototype has no backtest and makes no performance claim.
          </p>
          <p>
            FlowPhase is for research and demonstration only. It is not
            investment advice, a buy/sell signal or a guarantee of future
            returns. All current values are demo data.
          </p>
        </section>
      </div>
    </>
  );
}
