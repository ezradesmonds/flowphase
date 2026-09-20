# FlowPhase

**FlowPhase membantu periset saham IDX menyusun shortlist dan memahami struktur free float serta partisipasi broker dari Sectors, lalu memeriksa konteks harga melalui chart TradingView.**

Track: **03 — Market Intelligence**. Alat informasi dan analisis, bukan rekomendasi investasi. Tidak ada pengiriman atau eksekusi order.

## Alur utama

1. Tinjau Dashboard dengan cakupan saham yang benar-benar sudah dianalisis.
2. Filter Market Scanner menurut fase, confidence, broker flow, relative volume, alert, sektor dan watchlist.
3. Buka Stock Intelligence untuk chart TradingView, empat fase, cycle/replay dan bukti setiap periode.
4. Periksa estimasi inventory broker, klasifikasi heuristic dan alert berbasis baseline historis.
5. Buka Alerts untuk memeriksa evidence, batasan dan sumber peristiwa.

Tanpa Sectors, direktori, filter, identitas perusahaan, perbandingan free float dan analisis broker tidak dapat bekerja. Chart adalah konteks tambahan; OHLCV tetap eksklusif dari TradingView.

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
| Phase regions             | Perhitungan deterministik dari candle TradingView yang dimuat     |
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

Confidence adalah kekuatan aturan, bukan peluang profit; belum ada validasi prediktif independen. Broker flow bukan kepemilikan manfaat, free float bukan likuiditas eksekusi. Realtime entitlement/delay TradingView belum terverifikasi. Stream dibatasi 55 detik dan bisa diaktifkan lagi. Deployment publik memerlukan kontrol akses/kuota bersama; deployment tidak wajib untuk lomba.

- [Checklist dan draft video submission](docs/submission.md)
- [Laporan upgrade intelligence dan validasi](docs/intelligence-upgrade.md)
- [Arsitektur](docs/architecture.md)
- [Integrasi Sectors](docs/sectors.md)
- [Integrasi TradingView](docs/tradingview.md)
- [Aturan phase regions](docs/phase-regions.md)

Framework/library pihak ketiga adalah dependensi, bukan produk jadi. Video harus menunjukkan workflow produksi sebenarnya. Tidak boleh ada commit/perubahan setelah submission sesuai aturan freeze.
