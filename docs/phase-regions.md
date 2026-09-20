# Calculated market phase regions

The TradingView market chart now calculates regions independently for the selected ticker, timeframe and current candle snapshot. `PhaseRegion` is the normalized model in `src/domain/market.ts`; calculated regions have `status: "CALCULATED"`. Demo replay and the authored demo-analysis subsystem remain unchanged. No demo phase dates or symbol-specific thresholds enter this detector. Sectors broker support is attached separately by the intelligence engine and does not change OHLCV classification.

## Rules (version 1)

`src/lib/phases/detect.ts` is a pure, deterministic OHLCV heuristic. Each bar uses its trailing 20 bars plus the preceding close. The first 20 bars are warmup. ATR is the mean true range, including gaps from the preceding close. Directional efficiency is absolute net movement divided by total absolute close-to-close movement. Relative volume compares the current bar with the preceding 20-bar mean. The close-location proxy is the volume-weighted mean of `(2 × close − high − low) / (high − low)`; it is not broker flow.

Rules are evaluated in this order:

| Phase                      | Criteria                                                              |
| -------------------------- | --------------------------------------------------------------------- |
| EUPHORIA_RISK (MARKUP tag) | Net movement ≥ 5 ATR, efficiency ≥ 0.60, relative volume ≥ 1.60       |
| MARKUP                     | Net movement ≥ 1.80 ATR, efficiency ≥ 0.35                            |
| MARKDOWN                   | Net movement ≤ −1.80 ATR, efficiency ≥ 0.35                           |
| ACCUMULATION               | Efficiency < 0.35, total range ≤ 10 ATR, close-location proxy ≥ 0.10  |
| DISTRIBUTION               | Efficiency < 0.35, total range ≤ 10 ATR, close-location proxy ≤ −0.10 |
| UNCLASSIFIED               | Other conditions, insufficient data, zero movement/range/volume       |

Thresholds are heuristic defaults, not empirically calibrated. Consolidation labels describe price/volume behavior and do not establish real accumulation or distribution by investors. Confidence is a bounded 50–95 rule-strength score. Directional scores use efficiency and ATR movement; consolidation scores use efficiency and close-location strength; euphoria also uses relative volume. Percent notation is presentation, not a forecast probability.

At least three consecutive equal classifications form a region. An unclassified bar always breaks a region. The third matching bar starts the region at that bar, never at the first candidate. Earlier two-bar transitions remain uncolored. Individual classifications never read future bars. The final candle and final region are provisional; changing loaded history can change the warmup boundary and results. Invalid, duplicate or descending timestamps fail closed with no regions; inputs are never mutated.

Each region records its first open, last close, actual minimum low and maximum high. IDs include ticker, timeframe, phase and start timestamp. Evidence and warnings are available in the expandable list below the chart.

## Rendering

`PhaseRegionsPrimitive` uses the documented Lightweight Charts series primitive API, attached to the candlestick series. Every draw projects timestamps and prices through the current chart scales, so pan, zoom, price-scale changes, resize and new candles remain aligned. It uses media coordinates for device-pixel scaling, clips to the chart pane and does not alter autoscaling or capture pointer events. Primitive cleanup occurs before chart disposal.

The specified blue, green, amber, red and slate borders and transparent fills are shared with the legend. UNCLASSIFIED has no renderer style and is explicitly skipped. Labels use Indonesian names and confidence. An 18-pixel caption strip above the region's price high reduces candle occlusion. Labels are compressed to the visible region width and clipped at the viewport boundary. Zooming in makes narrow labels readable, and the complete accessible evidence list remains available at every zoom level. The regions can be hidden without replacing chart data or resetting the viewport.

## Verification

Tests exercise four core phases and the Euphoria Risk tag, warmup and ambiguous data, invalid snapshots, price-scale invariance, ticker/timeframe identity, region boundaries, streaming extension, immutable input and causal per-bar classification. Existing TradingView and demo tests remain in place.
