import { PageHeading, DemoNotice } from "@/components/ui";
import { demoMode } from "@/lib/server/mode";
import { PHASE_CONFIG, ALGORITHM_VERSION } from "@/config/phases";
export const metadata = { title: "Methodology" };
export default function Methodology() {
  return (
    <>
      <PageHeading
        title="Research methodology"
        description="Observed facts, derived measures, inferred candidates and unavailable evidence."
      />
      {demoMode && <DemoNotice />}
      <div className="panel evidence-inline">
        <h2>Akumulasi → Pompom → Menggoreng → Distribusi</h2>
        <p>
          Akumulasi is concentrated inventory collection while price impact
          remains controlled. Pompom is growing attention and participation; it
          does not require an aggressive breakout. Menggoreng Candidate
          describes unusually aggressive price advances, volume or frequency,
          and expanding volatility. Distribusi is depletion by earlier
          accumulators into dispersed buyers and retail proxies; price can still
          rise.
        </p>
        <p>
          Post-Distribution Markdown is a separate market condition after
          confirmed distribution and support breakdown. It is not one of the
          four primary phases. Transition, Uncertain and Insufficient Data are
          valid results. Missing phases are never invented.
        </p>
        <h2>Evidence and confidence</h2>
        <p>
          OBSERVED identifies source fields, DERIVED identifies calculations,
          INFERRED identifies hypotheses and UNAVAILABLE identifies missing
          evidence. Broker codes do not identify beneficial owners. POMPOM
          CANDIDATE — market-attention proxy only: an attention score is not
          evidence of coordinated promotion. Narrative, tick and order-book
          feeds are unavailable.
        </p>
        <p>
          Weighted available features produce raw scores. Confidence = raw phase
          confidence × data coverage × data quality. Small score margins, short
          history, high crossing, unavailable evidence and stale observations
          reduce it. OHLCV-only output is labeled Price-Volume Phase Candidate
          and confidence is capped at {PHASE_CONFIG.maxOhlcvConfidence}%. Scores
          are not calibrated probabilities.
        </p>
        <h2>Versioned features and segmentation</h2>
        <p>
          {ALGORITHM_VERSION} · {PHASE_CONFIG.version}. Trailing symbol
          percentiles use liquidity buckets where enough history exists; sparse
          buckets use symbol history with a quality penalty. Weights and
          thresholds reside in src/config/phases.ts. Three confirmation bars,
          minimum duration, hysteresis and online score change points limit
          flicker. Regions retain actual first/last timestamps and price
          extrema. A new accumulation after reset starts a new cycle.
        </p>
        <p>
          Historical decisions exclude unpublished broker rows. A backfill
          acquisition timestamp is not an original publication date. Current
          analysis can use data known now, while strict replay cannot
          retroactively claim it was available. Unknown historical publication
          times reduce feasible broker backtest coverage.
        </p>
        <h2>Observed Inventory Change Since period start</h2>
        <p>
          Net lots = buy lots − sell lots; cumulative net = sum of net lots.
          Opening inventory: Unknown unless explicitly supplied with date and
          source. Signed cumulative flow is not absolute holdings. Remaining
          lots, remaining ratio and depletion of absolute inventory remain
          unavailable without opening inventory. Observed net depletion is
          separately labeled.
        </p>
        <p>
          Average trade price = value / (lots × 100). Operational cost basis
          uses moving weighted average, never FIFO. With daily aggregates, buys
          precede sells by convention; intraday order is unknown. Gross-to-net
          ratio = (buy lots + sell lots) / max(abs(net lots), 1). High two-sided
          daily activity creates SUSPECTED_CROSSING, not a proven matched
          transaction, and penalizes phase scores.
        </p>
        <h2>Configurable broker hypotheses</h2>
        <p>
          Retail proxies: XL, XC, YP, PD, KK. Institutional proxies: AI, CS, BK,
          YU, AK. The registry supports effective dates, stock-specific
          overrides and disabling classifications. Multiple client types may use
          the same broker.
        </p>
        <h2>Data and chart capability</h2>
        <p>
          Phase 1 verified Sectors daily OHLCV, broker lots/value and daily
          aggregate frequency. TradingView remains the chart candle source. No
          verified tick, bid–offer event or narrative source is integrated, so
          extreme buy/sell executions, split execution, same-second bursts and
          replenishment alerts remain disabled. Daily frequency is not unique
          people or individual execution timestamps.
        </p>
        <p>
          Custom phase boxes use Lightweight Charts primitives. They are not
          drawings injected into an embedded TradingView widget. Price/time
          scales control the rectangles. Blue: Akumulasi; purple: Pompom;
          orange: Menggoreng; red: Distribusi; gray: ambiguous; dark red:
          post-distribution markdown.
        </p>
        <h2>Coverage and validation</h2>
        <p>
          The dashboard counts analysed stocks only. Fetch time is distinct from
          source time. Broker loading currently uses three disjoint 14-day
          windows and candle requests are bounded by the existing provider
          adapter. Lifetime completeness is unverified and is disclosed in each
          analysis. No fabricated market data is used as a production fallback.
        </p>
        <p>
          Walk-forward evaluation recomputes decisions from each data prefix and
          scores forward returns and adverse/favorable excursions only after the
          horizon matures. Results are separated by liquidity bucket and broker
          availability. Transition accuracy and false-positive rates require
          timestamped human review labels. No calibrated performance claim is
          made.
        </p>
      </div>
    </>
  );
}
