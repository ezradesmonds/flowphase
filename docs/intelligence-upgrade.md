> Superseded phase/inventory interpretation: see [corrected v2 model](phase-regions.md). Historical verification below describes the earlier implementation, not current test results.

# Laporan upgrade FlowPhase

Tanggal validasi: 19 September 2026. Proyek lama diteruskan; integrasi TradingView/Sectors dan pemisahan demo tetap dipertahankan. Tidak deploy atau push.

## Konsolidasi produk

Navigasi utama menjadi Dashboard, Market Scanner, Stock Intelligence, Alerts, Methodology. Broker Flow dan Cycle Replay masuk halaman saham; route lama mengarahkan ke sana. Watchlist tetap tersimpan lokal dan tersedia sebagai filter scanner. Settings melalui profil. Sidebar tetap dapat diciutkan dan memakai drawer pada mobile.

Dashboard menunjukkan cakupan analisis tersimpan, distribusi fase, transisi, flow leaders, alert dan saham untuk diteliti. Tidak ada total pasar fiktif. Scanner memakai ringkasan analisis, pagination 50 baris, filter fase/confidence/transisi/grup flow/alert/sektor/watchlist, serta batch eksplisit maksimal lima saham yang belum dianalisis atau sudah stale. Detail saham memusatkan chart dengan tab intelligence, inventory, transactions dan cycle history. Alert center menyediakan filter dan dialog bukti. Methodology menjelaskan aturan dan batasan.

## Sumber dan perhitungan

- Universe seluruh halaman endpoint companies Sectors; metadata, sektor/subsektor, free float dan broker summary dari Sectors. Universe teramati 962 saham; bukan konstanta kode.
- TradingView menyediakan OHLCV dan timeframe. Tidak ada fallback fixture produksi. Timestamp candle dan waktu pengambilan ditampilkan; riwayat candle lebih tua dari tujuh hari diberi peringatan.
- Empat fase inti: accumulation, markup, distribution, markdown. Euphoria merupakan risk tag markup. UNCLASSIFIED tidak memiliki kotak. Region dimulai pada bar konfirmasi ketiga, tanpa backdating; replay hanya menganalisis prefix candle dan memotong broker flow yang belum tersedia pada tanggal replay.
- Siklus dapat ACTIVE, COMPLETE atau INCOMPLETE. Fase tidak dipaksa lengkap. Broker support adalah bukti harian terpisah, bukan penentu kepemilikan.
- Registry broker terpusat: XL/XC/YP/PD/KK retail-accessible, AI/CS/BK/YU/AK institutional-associated; lainnya mixed/unknown. Seed USER_HEURISTIC, confidence 40, belum tervalidasi. Semua grup termasuk unknown tetap terlihat.
- Inventory dihitung kronologis per ticker/broker/periode: running net = jumlah buyLot minus sellLot; peak = maksimum positif running net; remaining/depletion ratios require a sourced opening position; unknown holdings remain null. Observed peak net change is not absolute inventory. Net negatif tetap ditampilkan; bukan short selling atau holdings terverifikasi. Starting holdings tidak diketahui.
- Nilai transaksi IDR; bobot harga menggunakan lot × 100 saham. Harga rata-rata memakai nilai/volume bila tersedia. Riwayat broker maksimal tiga jendela 14 hari; periode yang tidak mencakup awal siklus tidak diklaim sebagai inventory penuh sejak awal siklus.
- Price-volume: return, rolling return, volume mean, relative volume, z-score, ATR, range expansion, wick proxies, price progress per volume, divergence, breakout/breakdown. Baseline 20 bar sebelumnya tidak menyertakan bar yang dinilai.
- Alert volume medium RVOL/z ≥2, high ≥3, critical RVOL ≥5 atau z ≥4. Baseline kurang, varians nol dan indikasi anomali perubahan harga ekstrem menahan alert. OHLCV total tidak disebut volume beli/jual agresor.
- Institutional block-flow adalah proxy agregat harian: broker institutional-associated, flow positif, rasio terhadap baseline ≥3 dan z-score ≥3 dari 20 observasi broker sebelumnya. Unusual net sell menggunakan baseline net sell. Bukan identifikasi satu transaksi blok. Confidence dibatasi oleh heuristic broker.

## Kapabilitas yang belum tersedia

Stealth detector sengaja nonaktif. Endpoint broker harian terverifikasi tidak menyediakan urutan transaksi granular dengan timestamp detik, verified aggressor side, ukuran lot/harga per transaksi dan identifier transaksi. Tidak dibuat hasil sintetis. Filter foreign flow, buy/sell aggressor volume, free-float turnover, true transaction VWAP dan volume profile tidak mengklaim dukungan tanpa field/unit yang dapat diverifikasi. Distribution risk ditinjau melalui konteks fase dan alert flow/volume; belum ada skor risiko terkalibrasi terpisah.

Data broker adalah reported historical/batch; delay dan entitlement realtime TradingView belum diverifikasi. NEW berarti sesi analisis terakhir, bukan live. Status ACKNOWLEDGED belum mempunyai workflow penyimpanan pengguna. Confidence aturan bukan probabilitas keuntungan.

## Arsitektur dan file

- `src/domain/intelligence.ts`, `src/domain/market.ts`: model region, cycle, inventory, alert dan intelligence.
- `src/config/analysis.ts`, `src/config/brokers.ts`: threshold dan registry.
- `src/lib/intelligence/`: inventory, price-volume, alerts, cycles, analyze, broker-history, store, summary, format dan tests.
- `src/lib/phases/detect.ts` dan tests: empat fase serta konfirmasi kausal.
- `src/components/charts/tradingview-market-chart.tsx`, `phase-regions-primitive.ts`: overlay, markers, replay, interaksi dan warning candle stale; perbaikan snapshot saat Weekly kembali ke Daily.
- `src/components/intelligence-dashboard.tsx`, `intelligence-panels.tsx`, `alert-center.tsx`, `stock-directory.tsx`, `production-market.tsx`, `source-status.tsx`, `shell.tsx`: konsolidasi antarmuka.
- `src/app/alerts`, `src/app/api/intelligence`, route scanner/stock/redirect/methodology dan `globals.css`.
- README, architecture, sectors, phase-regions dan laporan ini; `.flowphase/` diabaikan Git/formatter.

Analisis tersimpan secara atomic di `.flowphase/analysis-v1`, cache 15 menit, batas concurrency dua saham dan deduplikasi request. Direktori 24 jam. Halaman tidak menghitung seluruh bursa dari awal. Penyimpanan ini sesuai satu server lokal; deployment multi-instance membutuhkan storage bersama, scheduler, autentikasi/rate limit dan anggaran kuota. Registry dapat diubah dalam konfigurasi; editor admin belum dibuat.

## Validasi

67 tes deterministik dalam 9 file lulus; semua API eksternal dimock dalam unit tests. Mencakup registry, units, inventory, fase/siklus, causal replay, baseline, alert, duplikasi dan penolakan broker payload salah. Stealth diuji dalam keadaan disabled; pola granular tidak diklaim diuji karena detector tidak diaktifkan.

Pemeriksaan browser terhubung mencakup AADI, AALI dan ABBA; chart, timeline/evidence, inventory, alert dialog dan state tanpa data. AADI mobile 390×844 telah diperiksa tanpa overflow halaman. AALI Daily → Weekly → Daily dan replay pertama mengungkap bug snapshot, lalu perbaikan diverifikasi dengan session 1/200 dan broker masa depan tidak muncul. ABBA mengungkap riwayat candle lama yang kini diberi peringatan. Ini pemeriksaan interaktif, bukan kelulusan suite Playwright otomatis (peluncuran suite sebelumnya diblokir Windows).

Lint, TypeScript, production build dan format check lulus. Pemeriksaan 117 file tracked tidak menemukan file rahasia/build terlarang atau token private-key umum; ini bukan audit keamanan menyeluruh. Filter scanner fase lama dan kombinasi tanpa hasil, filter alert AALI/NEW serta dialog evidence BK juga diverifikasi. Dashboard desktop dan mobile 390×844 diperiksa; lebar dokumen 375 px, tanpa overflow horizontal. Console browser bersih dan request server yang diperiksa berstatus 200. Transisi berurutan dengan fase sama dikeluarkan dari daftar perubahan fase. Tidak ada backtest prediktif yang diklaim telah selesai.

## Prioritas berikut sebelum submission

1. Backtest walk-forward lintas saham likuid/tidak likuid dan beberapa rezim pasar, dengan pemisahan train/calibration/test menurut waktu, corporate actions, delisting dan pencatatan kapan data benar-benar tersedia.
2. Ukur false-positive alert, precision fase/transisi, kestabilan region, lead/lag dan return forward hanya sebagai evaluasi sesudah sinyal; jangan memasukkan return masa depan ke classifier.
3. Bandingkan registry broker terhadap baseline unknown/random dan per sektor/periode. Turunkan confidence broker yang tidak konsisten; sertakan biaya/slippage jika mengevaluasi strategi.
4. Tambahkan arsip broker lebih panjang dan ingestion terjadwal berbatas kuota agar estimasi bisa mencakup awal siklus. Laporkan coverage historis, jangan isi tanggal hilang dengan nol.
5. Lengkapi video demo, bukti kepatuhan dan artefak submission sesuai `docs/submission.md`; bekukan perubahan setelah submission.
