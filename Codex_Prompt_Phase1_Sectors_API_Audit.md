# Prompt Codex — Phase 1 Audit Sectors API

Salin seluruh prompt ini ke Codex dari root folder project market-intelligence saya.

---

Anda adalah senior full-stack engineer dan quantitative market-data engineer. Kerjakan langsung di repository yang sedang dibuka. Jangan hanya memberikan tutorial atau contoh kode di chat.

## Konteks produk

Saya sedang membuat website market intelligence untuk seluruh saham Indonesia/IDX. Produk akan menggabungkan:

- Sectors API sebagai sumber data IDX yang resmi tersedia untuk akun saya.
- Worker TradingView yang sudah pernah diuji di folder/project `tradingview-test`.
- Dashboard modern bergaya terminal finansial, terinspirasi kerapian Sectors dan TradingView tanpa menyalin merek.
- Analisis price-volume, broker flow, broker inventory, foreign flow, ownership, bid–offer, transaction frequency, dan split order hanya apabila data sumbernya benar-benar tersedia.
- Klasifikasi fase: Accumulation, Markup/Pompom, Euphoria/Menggoreng, Distribution, Markdown, serta Transition/Unclassified.

Dokumen `Remora_Day1-5_System_Specification.md` adalah sumber kebutuhan analisis utama. Baca dokumen itu sepenuhnya sebelum mengambil keputusan arsitektur. Jika file tersebut belum ada di repository, laporkan sebagai blocker tetapi tetap lakukan audit repository dan API berdasarkan konteks prompt ini.

## Batas scope saat ini

Kerjakan **PHASE 1 SAJA: repository audit dan Sectors API capability audit**.

Jangan membangun dashboard lengkap, phase engine, broker inventory engine, database production, atau integrasi real-time multi-saham pada fase ini. Tujuannya memastikan kemampuan data nyata sebelum arsitektur berikutnya dikunci.

Setelah Phase 1 selesai dan diverifikasi, berhenti dan laporkan hasilnya. Jangan lanjut otomatis ke Phase 2.

## Aturan keselamatan dan integritas data

1. Jangan mengarang endpoint, response field, broker data, bid–offer, tick trade, foreign flow, ownership, atau data pasar.
2. Jangan mengganti data tidak tersedia dengan dummy data pada production path.
3. Jangan menampilkan API key atau isi secret dalam terminal output, source code, browser, log, screenshot, test fixture, atau dokumentasi.
4. API key hanya boleh digunakan server-side dari environment variable yang sudah ada.
5. Jangan mengubah nilai secret di `.env`.
6. Pastikan `.env` berada di `.gitignore`; buat `.env.example` hanya dengan placeholder aman jika belum ada.
7. Jangan menulis API key ke frontend atau variable `NEXT_PUBLIC_*`.
8. Jangan melakukan request besar ke seluruh saham. Gunakan satu ticker diagnostik terlebih dahulu, misalnya `BBCA`, kecuali format API memerlukan kode berbeda.
9. Gunakan concurrency konservatif, retry terbatas, timeout, dan pencatatan rate-limit/quota.
10. Jika endpoint tidak tersedia atau tidak terdokumentasi, tulis `UNAVAILABLE` atau `UNVERIFIED`. Jangan menebak.
11. Order-book analytics hanya boleh direncanakan jika endpoint bid–offer/order-book terverifikasi. Jika tidak tersedia, hasil sistem nanti harus menampilkan `Order-book data unavailable`.
12. Broker code adalah proxy, bukan bukti beneficial owner. Jangan menyebut aktivitas sebagai manipulasi yang sudah terbukti.
13. Pertahankan perubahan user yang sudah ada. Jangan menghapus atau merombak file yang tidak berkaitan.

## Langkah kerja wajib

### 1. Audit repository

Periksa dan dokumentasikan:

- Struktur folder dan package manager.
- Framework frontend/backend.
- Isi `package.json`, scripts, TypeScript config, lint/test config, ORM/database config, dan routing.
- Folder `tradingview-test` atau implementasi TradingView lain.
- Cara worker TradingView dijalankan.
- Semua file yang berkaitan dengan Sectors API.
- Semua environment-variable name tanpa mencetak nilainya.
- Dummy/mock/hard-coded stock data yang sudah ada.
- Status Git dan perubahan yang sudah ada; jangan menimpa perubahan user.
- Apakah aplikasi saat ini dapat build, lint, type-check, dan test.

Gunakan `rg`/`rg --files` untuk pencarian repository. Jangan membaca atau mencetak file secret secara utuh. Untuk memeriksa environment, cukup cek keberadaan nama variable secara aman.

### 2. Inventaris dokumentasi dan endpoint Sectors

Cari dokumentasi yang sudah ada di repository terlebih dahulu. Bila akses internet/dokumentasi tersedia, gunakan dokumentasi resmi Sectors saja sebagai sumber endpoint teknis.

Buat capability matrix dengan kolom:

| Capability | Endpoint | Method | Required params | Time resolution | Historical depth | Key fields | Pagination | Rate limit | Verified status | Notes/blocker |
|---|---|---|---|---|---|---|---|---|---|---|

Audit minimal capability berikut:

- Daftar seluruh saham IDX dan metadata perusahaan.
- Sector/industry classification.
- Daily OHLCV.
- Intraday OHLCV.
- Latest price/market snapshot.
- Corporate actions.
- Company fundamentals.
- Broker summary: buy lot, sell lot, buy value, sell value, average prices.
- Historical broker summary.
- Foreign buy/sell or foreign flow.
- Tick-by-tick trades.
- Running trade and transaction frequency.
- Bid–offer/order-book snapshots.
- Order-book event/cancellation data.
- Shareholder count.
- Ownership category/KSEI or balance position.
- Free float.
- IPO allocation/prospectus fields.

Status hanya boleh:

- `VERIFIED_WORKING`
- `VERIFIED_BUT_LIMITED`
- `DOCUMENTED_NOT_TESTED`
- `UNVERIFIED`
- `UNAVAILABLE`
- `AUTH_OR_PLAN_BLOCKED`

### 3. Buat Sectors API client yang aman

Ikuti gaya bahasa dan struktur project yang sudah ada. Jangan memaksakan stack baru.

Client minimal harus mempunyai:

- Base URL yang dikonfigurasi.
- Authorization dari environment variable yang sudah digunakan project.
- Timeout.
- Typed error.
- Status-code handling.
- Parsing JSON yang aman.
- Retry hanya untuk error sementara seperti 429/5xx dengan exponential backoff dan jitter.
- Batas retry kecil.
- Dukungan pagination bila endpoint memerlukannya.
- Redaksi secret dari log/error.
- Identifikasi response freshness bila field timestamp tersedia.
- Optional request tracing yang tidak membocorkan credential.

Jangan menambahkan dependency besar apabila fungsi bawaan runtime sudah memadai.

### 4. Tambahkan diagnostik satu ticker

Buat script atau server-only diagnostic route untuk satu saham, default `BBCA`.

Diagnostik harus:

- Mengecek keberadaan API key tanpa menampilkan nilainya.
- Memanggil hanya endpoint yang sudah ditemukan/didokumentasikan.
- Menampilkan nama capability, status HTTP, latency, jumlah record, field-level availability, timestamp terbaru, dan error yang sudah disanitasi.
- Tidak mencetak seluruh payload besar ke terminal.
- Tidak gagal total hanya karena satu endpoint unavailable.
- Memberikan exit code non-zero hanya untuk kegagalan setup utama atau endpoint minimum yang disepakati.
- Dapat dijalankan ulang melalui script package manager yang jelas, misalnya `npm run sectors:diagnose -- BBCA`, disesuaikan dengan project.

### 5. Simpan sample payload yang disanitasi

Buat folder dokumentasi/fixture yang sesuai struktur repository.

Untuk setiap endpoint working yang penting:

- Simpan satu response kecil yang telah disanitasi.
- Hilangkan token, account identifier, request signature, atau data sensitif lain.
- Batasi record agar repository tidak membengkak.
- Sertakan metadata: endpoint/capability, waktu pengambilan, ticker, status, dan catatan pagination.
- Tandai fixture sebagai contoh schema, bukan sumber data production.

Jika aturan layanan melarang penyimpanan payload, jangan simpan payload; dokumentasikan larangannya dan simpan schema ringkas buatan sendiri tanpa data sensitif.

### 6. Buat dokumentasi hasil audit

Buat file seperti `docs/sectors-api-capability-audit.md` yang memuat:

- Ringkasan repository.
- Cara menjalankan diagnostic.
- Capability matrix lengkap.
- Endpoint dan field yang berhasil diverifikasi.
- Endpoint yang unavailable atau terblokir plan/auth.
- Data minimum yang tersedia untuk MVP.
- Fitur dari `Remora_Day1-5_System_Specification.md` yang feasible sekarang.
- Fitur yang harus disembunyikan/capability-gated.
- Risiko data delay, entitlement, pagination, quota, dan historical depth.
- Usulan Phase 2 berdasarkan bukti audit.

Buat juga machine-readable capability file, misalnya:

```json
{
  "generatedAt": "ISO-8601",
  "capabilities": {
    "dailyOhlcv": { "status": "VERIFIED_WORKING" },
    "brokerSummary": { "status": "UNAVAILABLE" },
    "orderBook": { "status": "UNVERIFIED" }
  }
}
```

Gunakan format yang sesuai dengan stack project.

### 7. Tambahkan test

Minimal test:

- Authorization header dibentuk tanpa mengekspos API key.
- Error 401/403 ditangani sebagai auth/plan problem.
- Error 429 melakukan retry terbatas.
- 5xx melakukan retry terbatas.
- 4xx non-retryable tidak diulang.
- Timeout ditangani.
- Invalid JSON ditangani.
- Secret direduksi dari error/log.
- Pagination tidak mengulang halaman yang sama.
- Normalizer untuk minimal satu endpoint working.

Mock hanya untuk unit test client; jangan gunakan mock sebagai data dashboard/production.

## Minimum viable data decision

Tentukan hasil akhir audit menggunakan aturan berikut:

### MVP-A: Price-volume only

Layak bila tersedia:

- Stock universe.
- Historical daily OHLCV.
- Metadata sector/company.

Fitur berikutnya yang boleh dibangun:

- Phase candidate berbasis price-volume.
- Scanner semua saham.
- TradingView phase boxes.
- Volume anomaly.

### MVP-B: Broker inventory

Layak hanya jika tersedia historical broker buy/sell lot dan value dengan periode/timestamp yang memadai.

### MVP-C: Microstructure

Layak hanya jika tersedia tick trades dan/atau order-book event data. Snapshot bid–offer sesekali tidak cukup untuk membuktikan cancellation, spoofing, atau reload.

### MVP-D: Ownership intelligence

Layak hanya jika tersedia holder count, ownership category, free float, atau sumber resmi lain yang boleh digunakan.

## Arsitektur yang harus dipertahankan

- TradingView/realtime collector dijalankan sebagai persistent Node.js worker, bukan browser-only component dan bukan Vercel serverless long-running process.
- Sectors data diambil server-side.
- Data production nantinya disimpan/cache di PostgreSQL.
- Next.js hanya membaca normalized data melalui backend/server routes.
- Sync harus incremental, resumable, quota-aware, dan menyimpan freshness timestamp.
- Development boleh memakai manual sync command; arsitektur harus siap scheduled worker kemudian.

Jangan membuat PostgreSQL schema lengkap pada Phase 1 kecuali project sudah mempunyainya dan perubahan kecil diperlukan untuk diagnostik. Desain schema final menunggu capability audit.

## Quality gates

Setelah perubahan:

1. Jalankan install hanya bila diperlukan.
2. Jalankan formatter bila tersedia.
3. Jalankan lint.
4. Jalankan TypeScript type-check.
5. Jalankan unit tests.
6. Jalankan build bila aman dan relevan.
7. Jalankan diagnostic satu ticker.
8. Pastikan tidak ada secret yang masuk Git diff.
9. Periksa kembali `git diff` dan daftar file baru.

Jangan mengubah aturan lint/test hanya untuk membuat pemeriksaan lolos.

## Output akhir yang wajib diberikan

Laporkan secara ringkas tetapi konkret:

1. Kondisi awal repository.
2. File yang dibuat/diubah dan fungsi masing-masing.
3. Command untuk menjalankan diagnostic.
4. Capability matrix ringkas:
   - working,
   - limited,
   - unavailable,
   - blocked/unverified.
5. Data freshness dan historical depth yang ditemukan.
6. Quality gates beserta hasil nyata.
7. Blocker dan keterbatasan.
8. Rekomendasi scope Phase 2 berdasarkan data yang benar-benar tersedia.

Jangan mengatakan “selesai” jika diagnostic belum pernah dijalankan. Jika request terblokir oleh credential, plan, network, atau dokumentasi, selesaikan seluruh pekerjaan offline yang aman lalu laporkan exact blocker tanpa memalsukan hasil.

## Definition of done Phase 1

Phase 1 selesai hanya jika:

- Repository telah diaudit.
- API key digunakan secara aman.
- Sectors client tersedia dan diuji.
- Diagnostic satu ticker tersedia.
- Minimal satu endpoint riil telah diuji, atau blocker eksternal dibuktikan dengan jelas.
- Capability matrix dan dokumentasi tersedia.
- Tidak ada data production palsu.
- Lint/type-check/tests/build relevan telah dijalankan dan hasilnya dilaporkan.
- Codex berhenti sebelum Phase 2.

Mulai sekarang. Baca repository dan `Remora_Day1-5_System_Specification.md`, buat rencana singkat, lalu kerjakan Phase 1 sampai terverifikasi.
