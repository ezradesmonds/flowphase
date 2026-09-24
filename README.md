# FlowPhase

**FlowPhase mengubah data broker, ownership, free float, dan company intelligence dari Sectors menjadi kandidat fase pasar IDX yang explainable, lalu menggabungkannya dengan konteks price-volume TradingView agar periset bisa melihat bukan hanya fase yang terdeteksi, tetapi juga alasan dan keterbatasan buktinya.**

Track: **03 — Market Intelligence**. Alat informasi dan analisis, bukan rekomendasi investasi. Tidak ada pengiriman atau eksekusi order.

## Alur utama

1. Tinjau Dashboard dengan cakupan saham yang benar-benar sudah dianalisis; aggregate hanya mewakili acquired subset, bukan seluruh IDX secara realtime.
2. Filter Market Scanner menurut fase, confidence, evidence basis, broker flow, relative volume, alert, sektor dan watchlist.
3. Buka Stock Intelligence untuk chart TradingView, empat fase, cycle/replay, lalu baca **FlowPhase Evidence** yang memisahkan supporting evidence, evidence against, coverage, data quality, dan phase-score comparison.
4. Bedakan **SECTORS-BACKED FLOWPHASE CANDIDATE** dari **PRICE-VOLUME CANDIDATE ONLY**. Price-volume-only tidak dipresentasikan sebagai full FlowPhase signal.
5. Periksa observed broker inventory delta, crossing-risk proxy, ownership/foreign-flow context, dan alerts beserta provenance serta limitation-nya.

Tanpa Sectors, FlowPhase kehilangan universe, company/free-float/ownership research, broker-flow evidence, dan status **Sectors-backed** pada phase signal. TradingView OHLCV tetap dapat menghasilkan price-volume candidate sebagai konteks terbatas, tetapi bukan full FlowPhase evidence signal.

## Menjalankan aplikasi

Gunakan Node.js 22.20+ dan npm. Jalankan `npm ci`, salin `.env.example` ke file environment lokal, lalu isi API key Sectors milik Anda pada server. Jangan commit file tersebut.

```env
SECTORS_API_KEY=
SECTORS_API_BASE_URL=https://api.sectors.app/v2
MARKET_DATA_PROVIDER=tradingview
FLOWPHASE_MODE=production
```

TradingView anonim secara default. Session/signature opsional hanya untuk konfigurasi server yang sah. Jangan memakai `NEXT_PUBLIC_*` untuk kredensial.

```sh
npm run dev
```

Buka http://127.0.0.1:3000. Build produksi: `npm run build`, lalu `npm start`. Build/unit tests tidak memerlukan API key; akses data saat runtime memerlukannya. Tidak perlu database.

## Sumber data

| Data                      | Sumber                                                            |
| ------------------------- | ----------------------------------------------------------------- |
| Ticker, nama, klasifikasi | Sectors `/v2/companies/`, semua halaman, validasi total/duplikasi |
| Free float                | Sectors `/v2/free-float/`; rasio 0–1 ditampilkan sebagai persen   |
| Broker flow               | Sectors `/v2/broker-summary/{symbol}/`, per saham yang dibuka     |
| OHLCV                     | `@mathieuc/tradingview` server-only; renderer Lightweight Charts  |
| Phase candidates          | Model deterministik; TradingView OHLCV + Sectors broker evidence bila tersedia |
| Watchlist                 | Browser lokal, penyimpanan produksi terpisah dari demo            |

Verifikasi langsung 17 September 2026: 962 saham, 962 klasifikasi sektor/subsektor, 961 nilai free float. Ini hasil pengamatan, bukan konstanta aplikasi. Data hilang ditampilkan **Unavailable**, bukan nol/fixture.

Cache direktori/free float 24 jam; intelligence 15 menit dengan maksimal tiga jendela broker 14 hari per saham. Endpoint broker lama tetap memakai cache 5 menit. Hasil analisis disimpan lokal di `.flowphase/` (diabaikan Git); scanner memproses batch maksimal lima saham secara eksplisit. Satu refresh penuh pada cakupan tersebut sekitar 20 kredit Sectors, belum termasuk broker flow. Tidak ada polling seluruh bursa. Lihat [integrasi Sectors](docs/sectors.md).

## Routes dan pengujian

Navigasi utama: `/`, `/scanner`, `/stocks`, `/alerts`, `/methodology`. Detail: `/stocks/[ticker]`. Route broker/replay lama mengarahkan ke Stock Intelligence; watchlist dan settings tetap tersedia.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run format:check
npm run check:public-files
```

CI menjalankan lint, unit tests, build dan pemeriksaan file publik tanpa kredensial. Tests mencakup pagination, payload, missing data, hitungan broker/peer, fase, lifecycle TradingView, fixture dan watchlist.

`npm run test:e2e` mempertahankan suite demo dengan mode eksplisit di port 3100/output `.next-demo`. Chromium diperlukan. Peluncuran Playwright sempat diblokir OS pada lingkungan Windows pengembangan; pemeriksaan browser terhubung bukan klaim kelulusan seluruh suite otomatis.

## Demo dan batasan

Produksi adalah default. `FLOWPHASE_MODE=demo` membuka fixture lama; restart server setelah perubahan mode. Tidak ada fallback demo saat provider gagal.

Confidence adalah kekuatan aturan, bukan peluang profit; belum ada validasi prediktif independen. Label institutional-associated adalah klasifikasi/proxy riset, bukan identitas beneficial owner. Broker flow bukan kepemilikan manfaat, free float bukan likuiditas eksekusi. Realtime entitlement/delay TradingView belum terverifikasi. Stream dibatasi 55 detik dan bisa diaktifkan lagi. Deployment publik memerlukan kontrol akses/kuota bersama; deployment tidak wajib untuk lomba.

- [Checklist dan draft video submission](docs/submission.md)
- [Laporan upgrade intelligence dan validasi](docs/intelligence-upgrade.md)
- [Arsitektur](docs/architecture.md)
- [Integrasi Sectors](docs/sectors.md)
- [Integrasi TradingView](docs/tradingview.md)
- [Aturan phase regions](docs/phase-regions.md)

Framework/library pihak ketiga adalah dependensi, bukan produk jadi. Video harus menunjukkan workflow produksi sebenarnya. Tidak boleh ada commit/perubahan setelah submission sesuai aturan freeze.
