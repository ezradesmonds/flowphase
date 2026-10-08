import { PHASE_CONFIG, PRIMARY_PHASES } from "@/config/phases";
import type {
  MarketPhase,
  PhaseEvidence,
  PhaseRegion,
  PrimaryPhase,
} from "@/domain/market";

const signalLabels: Record<string, string> = {
  volumeGrowth: "Pertumbuhan volume",
  attentionGrowth: "Peningkatan aktivitas",
  frequencyGrowth: "Pertumbuhan frekuensi transaksi",
  breakoutAttempt: "Upaya menembus batas harga",
  controlledPriceImpact: "Dampak harga terkendali",
  lowVolumeCorrection: "Koreksi volume rendah",
  inventoryGrowth: "Pertumbuhan observed net inventory",
  inventoryDepletion: "Penurunan observed net inventory",
  concentratedNetBuy: "Konsentrasi net buy broker",
  previousAccumulatorNetSell: "Net sell broker yang sebelumnya net buy",
  sellerDispersion: "Penyebaran seller",
  buyerDispersion: "Penyebaran buyer",
  sellerConcentration: "Konsentrasi seller",
  concentration: "Konsentrasi broker",
  retailExit: "Net sell cohort retail",
  retailAbsorption: "Net buy cohort retail",
  retailInterestGrowth: "Peningkatan aktivitas cohort retail",
  retainedInventory: "Net inventory yang masih teramati",
  participantBroadening: "Perluasan partisipasi broker",
  extremeReturn: "Perubahan harga ekstrem",
  extremeVolume: "Volume ekstrem",
  volatilityExpansion: "Pelebaran volatilitas",
  distanceFromBase: "Jarak harga dari rentang dasar",
  frequencyAnomaly: "Anomali frekuensi transaksi",
  supplyNearHigh: "Tekanan jual dekat harga tinggi",
  failedBreakout: "Breakout yang gagal bertahan",
  crossing: "Crossing-risk proxy",
  scoreMargin: "Jarak skor antarfase",
  pendingConfirmation: "Konfirmasi fase tertunda",
  brokerFlow: "Bukti broker flow",
  narrative: "Bukti narasi pasar",
  orderBook: "Data order book",
  beneficialOwner: "Identitas beneficial owner",
};

export function evidenceLabel(item: PhaseEvidence) {
  return (
    signalLabels[item.feature] ??
    item.feature.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ")
  );
}

const phaseMeaning: Record<MarketPhase, string> = {
  AKUMULASI: "Kandidat akumulasi — penyerapan dengan dampak harga terkendali",
  POMPOM:
    "Kandidat peningkatan aktivitas pasar — bukan bukti promosi terkoordinasi",
  MENGGORENG: "Kandidat ekspansi harga-volume — bukan bukti manipulasi",
  DISTRIBUSI:
    "Kandidat distribusi — perubahan arah broker yang sebelumnya net buy",
  POST_DISTRIBUTION_MARKDOWN: "Penurunan harga setelah kandidat distribusi",
  UNCERTAIN: "Bukti belum cukup kuat untuk menetapkan kandidat fase",
  TRANSITION:
    "Kandidat fase belum terkonfirmasi atau skor antarfase berdekatan",
  INSUFFICIENT_DATA: "Riwayat data belum cukup untuk analisis fase",
};

export function researchBrief(region: PhaseRegion) {
  const isCandidate = PRIMARY_PHASES.includes(region.phase as PrimaryPhase);
  const weights = isCandidate
    ? PHASE_CONFIG.weights[region.phase as PrimaryPhase]
    : {};
  const opposingFeatures = new Set(
    region.againstEvidence.map((item) => item.feature),
  );
  const pending = opposingFeatures.has("pendingConfirmation");
  const supporting = region.evidenceItems
    .filter(
      (item) =>
        !pending &&
        item.status === "DERIVED" &&
        Object.hasOwn(weights, item.feature) &&
        !opposingFeatures.has(item.feature) &&
        item.value !== null &&
        Number.isFinite(item.value) &&
        item.value >= 25 &&
        item.value <= 100,
    )
    .slice(0, 2)
    .map(
      (item) =>
        `${evidenceLabel(item)}: dukungan normalisasi ${item.value!.toFixed(1)}/100.`,
    );
  // Prefer contradictory evidence over the model's permanent unavailable capabilities.
  const caution = [...region.againstEvidence]
    .sort(
      (a, b) =>
        Number(a.status === "UNAVAILABLE") - Number(b.status === "UNAVAILABLE"),
    )
    .slice(0, 2)
    .map((item) => `${evidenceLabel(item)} — ${item.description}`);
  const nextCheck =
    !isCandidate || pending
      ? "Periksa kecukupan riwayat dan konfirmasi fase sebelum memasukkan saham ke shortlist riset."
      : region.brokerEvidence !== "BROKER_SUPPORTED"
        ? "Periksa ketersediaan broker flow Sectors pada periode ini; konteks price-volume saja belum menjadi sinyal FlowPhase lengkap."
        : opposingFeatures.has("crossing")
          ? "Bandingkan aktivitas gross dengan net broker; volume besar saja belum membuktikan akumulasi atau distribusi."
          : "Bandingkan net buyer dan net seller pada periode ini, lalu periksa ownership dan konteks perusahaan sebelum melanjutkan riset.";
  return {
    conclusion: pending
      ? `Label ${region.phase.replaceAll("_", " ")} masih menunggu konfirmasi; bukti terbaru belum mengonfirmasi fase ini`
      : phaseMeaning[region.phase],
    supporting,
    caution,
    nextCheck,
  };
}
