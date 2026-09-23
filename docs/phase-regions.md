# Corrected phase regions — model v2

The primary cycle is AKUMULASI → POMPOM → MENGGORENG → DISTRIBUSI.
Post-Distribution Markdown is a separate condition. Transition, Uncertain and
Insufficient Data are valid abstention states. All available loaded candles are
processed; no sample dates or ticker-specific boundaries are used.

## Scoring and segmentation

src/config/phases.ts versions weights and thresholds; src/lib/phases/features.ts
derives causal trailing features with nulls for unsupported evidence.
src/lib/phases/detect.ts applies weighted scores, crossing penalties, evidence gates,
minimum duration, three-bar confirmation, hysteresis and online score change points.
Regions with the same state and similar evidence merge. A change in evidence
coverage or material scores can start a new segment. Labels are not backpainted.

Pompom measures attention building; Menggoreng requires aggressive historical return
extremeness plus volume/frequency and volatility expansion. Distribution uses prior
accumulator selling and depletion even while price rises. Markdown requires earlier
confirmed distribution. No stage is synthesized to complete a cycle.

Confidence = raw confidence × coverage × quality. OHLCV-only results are
Price-Volume Phase Candidate, capped at 35%. Narrative, ticks and order-book evidence
are unavailable. Broker publication watermarks gate historical decisions.

## Chart

Lightweight Charts custom series primitives project each segment start/end and actual
high/low through current chart scales. No embedded TradingView widget drawing API is
claimed. Labels have a small caption strip; evidence panels retain full dates,
confidence, coverage, leading evidence, counterevidence and algorithm version.

Colors: Akumulasi blue, Pompom purple, Menggoreng orange, Distribusi red,
Transition/Uncertain gray, post-distribution markdown dark red at distinct opacity.
Insufficient Data remains visible in the timeline and is not drawn over candles.

## Migration and validation

scripts/migrate-phase-cache.mjs preserves v1 files and records checksums.
Production reads analysis-v2 only; legacy classifications require recomputation.
Unit tests cover each phase, ambiguity, OHLCV confidence caps, crossing, rising-price
distribution, inventory unknowns, causal prefixes and chart projection.
Walk-forward evaluation is in src/lib/phases/backtest.ts. Research defaults are
not calibrated performance estimates.

Interactive upstream requests remain bounded; lifetime history is not established.
Missing broker publication timestamps prevent valid historical broker confirmation.
