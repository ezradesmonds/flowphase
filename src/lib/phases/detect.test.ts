import { describe, expect, it } from "vitest";
import { classifyCandle, detectPhaseRegions, scoreFrame } from "./detect";
import { buildFeatureFrames, type FeatureFrame } from "./features";
import { PHASE_CONFIG, PRIMARY_PHASES, type FeatureKey } from "@/config/phases";
import type { MarketCandle } from "@/domain/chart-market";
const candles = (n=100): MarketCandle[] => Array.from({length:n},(_,i)=>({time:1700000000+i*86400,open:100,high:102,low:98,close:100+(i%2?0.2:-0.2),volume:100+i%7}));
function frame(): FeatureFrame {
 const f=buildFeatureFrames(candles()).at(-1)!;
 return {...f,sufficient:true,brokerAvailable:true,brokerCoverage:1,quality:1,crossingRisk:0,positiveSlope:true,controlled:true,priceReturn:0.01,rangeExpansion:2,previousAccumulatorSelling:true,
 features:Object.fromEntries(Object.keys(f.features).map(k=>[k,0])) as FeatureFrame["features"]};
}
function support(phase: typeof PRIMARY_PHASES[number]) {
 const f=frame();
 for(const key of Object.keys(PHASE_CONFIG.weights[phase])) f.features[key as FeatureKey]=100;
 f.features.narrative=null;
 return f;
}
describe("corrected phase semantics",()=>{
 it.each(PRIMARY_PHASES)("scores distinct %s evidence",phase=>expect(scoreFrame(support(phase)).phase).toBe(phase));
 it("distribution occurs with rising price when earlier accumulators release stock",()=>{
  const f=support("DISTRIBUSI");f.priceReturn=0.08;f.positiveSlope=true;
  expect(scoreFrame(f).phase).toBe("DISTRIBUSI");
 });
 it("falling price alone proves neither distribution nor post-distribution markdown",()=>{
  const c=candles().map((b,i)=>({...b,open:200-i,high:202-i,low:198-i,close:200-i}));
  expect(detectPhaseRegions("TEST","1D",c).some(r=>r.phase==="POST_DISTRIBUTION_MARKDOWN")).toBe(false);
  const f=frame();f.priceReturn=-0.1;f.positiveSlope=false;
  expect(scoreFrame(f).phase).toBe("UNCERTAIN");
 });
 it("pompom is attention evidence, never proof of promotion",()=>{
  const f=support("POMPOM");f.priceReturn=0.005;
  const r=scoreFrame(f);expect(r.label).toBe("POMPOM CANDIDATE — market-attention proxy only");
  expect(r.againstEvidence.some(e=>e.feature==="narrative"&&e.status==="UNAVAILABLE")).toBe(true);
 });
 it("high gross crossing cannot confirm accumulation",()=>{
  const f=support("AKUMULASI");f.crossingRisk=0.99;
  expect(scoreFrame(f).phase).not.toBe("AKUMULASI");
 });
 it("close scores produce transition and weak scores uncertain",()=>{
  const f=support("POMPOM");
  for(const k of Object.keys(PHASE_CONFIG.weights.MENGGORENG))f.features[k as FeatureKey]=100;
  expect(scoreFrame(f).phase).toBe("TRANSITION");
  expect(scoreFrame(frame()).phase).toBe("UNCERTAIN");
 });
 it("OHLCV-only candidates have capped confidence and no smart-money claim",()=>{
  for(const r of detectPhaseRegions("TEST","1D",candles())){
   expect(r.confidence).toBeLessThanOrEqual(35);
   if(PRIMARY_PHASES.includes(r.phase as typeof PRIMARY_PHASES[number]))expect(r.label).toContain("Price-Volume Phase Candidate");
  }
 });
 it("short and zero-volume history explicitly reports insufficient data",()=>{
  expect(detectPhaseRegions("TEST","1D",candles(10))[0].phase).toBe("INSUFFICIENT_DATA");
  expect(detectPhaseRegions("TEST","1D",candles().map(c=>({...c,volume:0}))).every(r=>r.phase==="INSUFFICIENT_DATA")).toBe(true);
 });
 it("regions preserve timestamps and exact segment price extrema",()=>{
  const c=candles(),copy=structuredClone(c),regions=detectPhaseRegions("TEST","1D",c);
  for(const r of regions){
   const bars=c.filter(b=>b.time>=r.startTimestamp&&b.time<=r.endTimestamp);
   expect(r.lowPrice).toBe(Math.min(...bars.map(b=>b.low)));
   expect(r.highPrice).toBe(Math.max(...bars.map(b=>b.high)));
   expect(r.startTimestamp).toBeLessThanOrEqual(r.endTimestamp);
   expect(r.algorithmVersion).toBeTruthy();
  }
  expect(c).toEqual(copy);
 });
 it("decisions and completed segments do not use future bars",()=>{
  const c=candles();
  expect(classifyCandle(c,40)).toEqual(classifyCandle(c.slice(0,41),40));
  const full=detectPhaseRegions("TEST","1D",c);
  for(let i=25;i<c.length;i+=10){
   const prefix=detectPhaseRegions("TEST","1D",c.slice(0,i+1));
   expect(prefix.at(-1)!.phase).toBe(full.find(r=>r.startTimestamp<=c[i].time&&r.endTimestamp>=c[i].time)!.phase);
  }
 });
 it("rejects malformed or unordered candles",()=>{
  expect(detectPhaseRegions("TEST","1D",candles().reverse())).toEqual([]);
  expect(detectPhaseRegions("TEST","1D",candles().map(c=>({...c,volume:NaN})))).toEqual([]);
 });
 it("excludes unpublished broker data in strict point-in-time mode",()=>{
  const c=candles();const flows=[{ticker:"TEST",date:"2023-11-14",brokerCode:"AI",buyLot:100,sellLot:0,availableAt:"2099-01-01"}];
  expect(buildFeatureFrames(c,{flows,strictAvailability:true}).every(f=>!f.brokerAvailable)).toBe(true);
 });
 it("confirms distribution before a decline and separates the later markdown region",()=>{
  const c=candles(110).map((b,i)=>{
   const close=i<70 ? 100+(i%2?0.2:-0.2) : i<90 ? 100+(i-70)*0.2 : 102-(i-90)*2;
   return {...b,open:close-0.1,close,high:close+1,low:close-1,volume:i<70?100+i%7:500+i%9};
  });
  const flows=c.flatMap((b,i)=>{
   const date=new Date(b.time*1000).toISOString().slice(0,10);
   const selling=i>=70;
   return [{ticker:"TEST",date,brokerCode:"AI",buyLot:selling?0:100,sellLot:selling?300:0},
    ...["XL","XC","YP","PD","KK"].map(brokerCode=>({ticker:"TEST",date,brokerCode,buyLot:selling?60:0,sellLot:selling?0:20}))];
  });
  const regions=detectPhaseRegions("TEST","1D",c,{flows});
  const distribution=regions.find(r=>r.phase==="DISTRIBUSI");
  expect(distribution).toBeDefined();
  expect(distribution!.startTimestamp).toBeLessThan(c[90].time);
  const markdown=regions.find(r=>r.phase==="POST_DISTRIBUTION_MARKDOWN");
  expect(markdown).toBeDefined();
  expect(markdown!.marketCondition).toBe("POST_DISTRIBUTION_MARKDOWN");
  expect(markdown!.startTimestamp).toBeGreaterThan(distribution!.startTimestamp);
 });
});
