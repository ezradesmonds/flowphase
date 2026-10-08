# Paket submission FlowPhase — 8 Oktober 2026

Track: **03 — Market Intelligence**. Nama tim di portal: **Nasgor goreng**; nama produk: **FlowPhase**.

Batas resmi: **8 Oktober 2026, 23:59 WIB**. Repo DAN aplikasi harus dibekukan saat submit atau deadline, mana yang lebih dahulu. Selesaikan seluruh perbaikan sebelum menekan Submit final. Sumber: [aturan resmi](https://hackathon.sectors.app/rules), [track Market Intelligence](https://hackathon.sectors.app/tracks/market-intelligence).

## Isian portal yang bisa disalin

- Public repository URL: `https://github.com/ezradesmonds/flowphase`
- Problem statement, satu kalimat: **FlowPhase membantu periset saham IDX yang kesulitan menghubungkan pergerakan harga dengan broker flow untuk menemukan kandidat fase pasar, memahami bukti pendukung dan penyangkalnya, serta menentukan pemeriksaan riset berikutnya.**
- Track: **03 — Market Intelligence**.
- Teaser video URL: isi setelah mengunggah video satu menit; harus public.
- Judging video URL: isi setelah mengunggah video maksimal tiga menit; public atau unlisted, bisa dibuka tanpa meminta akses.
- Social media post URL: isi tautan posting Instagram, LinkedIn, Threads, atau TikTok dengan tag akun resmi Sectors dan thumbnail resmi.

Template thumbnail resmi yang ditautkan portal: [Canva](https://canva.link/mexgt4g89m17xln). Ambil handle akun resmi dari kanal penyelenggara; jangan menyalin placeholder tag di bawah sebagai tag sebenarnya.

## Posisi produk untuk juri

Pengguna: periset dan investor ritel yang melakukan riset saham IDX. Masalah: harga, volume, broker flow, dan ownership tersebar; label fase tanpa alasan mudah disalahartikan sebagai kepastian. Hasil: shortlist kandidat dan jejak alasan yang bisa diperiksa, termasuk alasan untuk meragukan hasil.

Pembeda yang ditunjukkan: Radar discovery berbasis Sectors → detail kandidat → phase evidence → ringkasan riset → konteks broker/ownership. Model deterministik menghitung fitur dan skor; bukan AI agent. Sectors menyediakan discovery, company, free float, broker flow, registry, serta ownership/foreign-flow context. TradingView menyediakan OHLCV. Dua trigger Radar berasal dari jenis data berbeda pada publisher Sectors yang sama; jangan menyebutnya bukti statistik independen.

Tanpa broker evidence Sectors, UI menurunkan hasil menjadi **PRICE-VOLUME CANDIDATE ONLY**. Confidence adalah kekuatan aturan, bukan peluang profit. Net broker bukan kepemilikan absolut dan tidak membuktikan beneficial owner atau manipulasi.

## Persiapan rekaman — lakukan sebelum record

1. Gunakan build produksi: `npm run build`, lalu `npm start`. Server lokal memakai `http://127.0.0.1:3000`; konfigurasi key server mengikuti README. Jangan merekam terminal environment atau API key.
2. Buka Radar, scanner, satu detail saham yang berhasil dimuat, dan methodology dalam tab yang siap. Pilih contoh dari hasil aktual, bukan ticker yang diasumsikan punya fase tertentu.
3. Uji chart terlihat, refresh, ganti tema lalu kembali, pindah timeframe, dan replay sebelum merekam. Pilih satu tema selama rekaman.
4. Tunggu provider selesai sebelum mulai. Jika broker tidak tersedia, tampilkan batasan tersebut; gunakan contoh lain yang benar-benar tersedia untuk jalur utama.
5. Rekam 1080p, browser zoom agar teks terbaca, cursor tenang, tanpa notifikasi. Tampilkan aplikasi, bukan editor, hampir sepanjang video.
6. Latihan satu kali dengan timer. Target teaser 55–60 detik; judging 2:40–2:55 agar tidak melewati batas tiga menit. Pangkas jeda loading tanpa mengubah isi hasil analisis.

Narasi di bawah tidak mengasumsikan fase tertentu. Jika terlihat pending/uncertain, sebutkan apa adanya. Jangan mengucapkan “akumulasi terkonfirmasi” ketika panel masih menunggu konfirmasi.

## Naskah teaser — sekitar satu menit

| Waktu     | Layar                                               |
| --------- | --------------------------------------------------- |
| 0:00–0:12 | Judul FlowPhase, lalu Radar                         |
| 0:12–0:25 | Buka kandidat yang sudah siap dianalisis            |
| 0:25–0:45 | Ringkasan riset dan evidence panel, zoom secukupnya |
| 0:45–0:55 | Broker context dan evidence basis                   |
| 0:55–1:00 | Judul, track, repo                                  |

**Narasi siap baca:**

“Grafik saham menunjukkan pergerakan harga. Tetapi untuk riset, kita juga perlu tahu: bukti apa yang mendukung, apa yang bertentangan, dan apa yang harus diperiksa berikutnya?

Kami membangun FlowPhase untuk periset saham Indonesia. Market Radar memakai data Sectors untuk menemukan kandidat berdasarkan perubahan harga dan aktivitas perdagangan. Dari sini, kita membuka analisis fase bersama konteks harga dan volume.

Ringkasan riset menjelaskan bukti pendukung, alasan untuk meragukan hasil, dan pemeriksaan berikutnya. Ketika bukti lemah atau fase belum terkonfirmasi, FlowPhase menampilkannya secara terbuka.

Data broker dan ownership dari Sectors memperkaya penelitian. Tanpa bukti broker, hasil diberi label price-volume candidate only.

FlowPhase: dari data pasar menuju riset yang bisa diperiksa. Alat analisis, bukan rekomendasi investasi.”

Judul unggahan: **FlowPhase — Explainable IDX Market Intelligence | Sectors Hackathon 2026**.

## Naskah judging — target 2:45, maksimal tiga menit

### 0:00–0:25 — masalah dan pengguna

Layar: judul singkat → Radar.

“FlowPhase membantu periset saham IDX menghubungkan pergerakan harga dengan bukti broker flow. Masalah yang kami selesaikan adalah proses riset yang terpecah: menemukan saham aktif, membaca chart, lalu memeriksa broker dan ownership di tempat berbeda. Kami menyatukannya menjadi alur yang menjelaskan hasil sekaligus keterbatasannya.”

### 0:25–0:55 — discovery menjadi kandidat

Layar: Radar → kandidat → Analyze with FlowPhase atau Open analysis sesuai status sebenarnya.

“Market Radar menggunakan Top Movers dan Most Traded dari Sectors. Saham dengan dua jenis trigger mendapat prioritas, sementara foreign flow menjadi konteks tambahan. Saya membuka satu kandidat dari hasil aktual. Analisis yang tersimpan kemudian masuk ke scanner; cakupannya hanya saham yang telah dianalisis, bukan klaim pemantauan seluruh IDX secara realtime.”

### 0:55–1:35 — alasan dan penyangkal

Layar: chart → FlowPhase Evidence → Ringkasan riset. Sebutkan label aktual jika perlu.

“Di detail saham, harga dan volume TradingView dipadukan dengan broker evidence Sectors bila tersedia. Model deterministik menghitung kandidat fase, skor pendukung, coverage, serta kualitas data. Ringkasan riset menerjemahkan hasil menjadi tiga pertanyaan: apa yang mendukung, apa yang perlu diragukan, dan apa yang harus diperiksa berikutnya. Status pending tidak dipromosikan menjadi fase terkonfirmasi. Skor ini adalah kekuatan aturan model, bukan probabilitas keuntungan.”

### 1:35–2:05 — broker dan batas sumber

Layar: broker rows → ownership/free float jika tersedia; bila tidak, cukup panel missing-data.

“Konteks broker memperlihatkan net flow teramati dan risiko crossing. Net broker bukan kepemilikan absolut. Registry metadata dipertahankan ketika chart dihitung ulang; jika registry tidak tersedia, fallback ditandai sebagai heuristic. Ownership dan free float membantu pemeriksaan lanjutan, tetapi tidak membuktikan identitas pemilik manfaat atau manipulasi. Data yang hilang ditampilkan sebagai unavailable, bukan angka nol.”

### 2:05–2:30 — replay dan ketergantungan Sectors

Layar: aktifkan replay dan maju beberapa candle; evidence basis.

“Replay menghitung fase menggunakan candle yang sudah terungkap. Broker evidence juga dibatasi oleh waktu ketersediaan data; riwayat yang baru diambil tidak dianggap sudah diketahui pada masa lalu. Tanpa dukungan broker Sectors, FlowPhase secara eksplisit menurunkan hasil menjadi price-volume candidate only. Ini membuat batas sumber dan kekuatan analisis terlihat.”

### 2:30–2:50 — engineering dan penutup

Layar: methodology → judul/repo; jangan habiskan waktu menampilkan terminal.

“Implementasi memakai Next.js dan TypeScript, dengan kredensial Sectors di server, cache untuk membatasi request, serta pengujian untuk missing data, perhitungan, dan replay. Sebanyak 145 unit tests dan build produksi telah lulus. FlowPhase membantu pengguna menentukan riset berikutnya dengan alasan yang bisa diperiksa. Kami tidak mengklaim prediksi profit. Terima kasih.”

Jika latihan melebihi tiga menit, potong kalimat registry metadata dan rincian stack; pertahankan masalah, alur nyata, peran Sectors, pembeda, dan batasan.

## Deskripsi video — siap salin

**FlowPhase | Track 03 — Market Intelligence | Team Nasgor goreng**

FlowPhase membantu periset saham IDX menemukan kandidat fase pasar dan memeriksa alasan pendukung, bukti penyangkal, serta langkah riset berikutnya. Sectors menyediakan discovery dan konteks broker/company/ownership; TradingView menyediakan OHLCV. Model fase bersifat deterministik dan menampilkan keterbatasan data.

Repository: https://github.com/ezradesmonds/flowphase

Informasi dan analisis, bukan rekomendasi investasi. Skor bukan peluang profit; net broker bukan kepemilikan absolut. Belum ada validasi prediktif independen.

## Caption sosial — draft siap edit

Kami membangun **FlowPhase** untuk Sectors Hackathon 2026, track Market Intelligence.

Dari Market Radar ke analisis saham IDX, FlowPhase menghubungkan data Sectors dengan konteks harga-volume untuk menjawab: apa yang mendukung kandidat fase, apa yang bertentangan, dan apa yang perlu diperiksa berikutnya?

Kami menampilkan batasan data dan membedakan Sectors-backed candidate dari price-volume-only candidate. Alat riset, bukan rekomendasi investasi.

Demo: [ISI TAUTAN TEASER PUBLIC]
Repo: https://github.com/ezradesmonds/flowphase
[TAG AKUN RESMI SECTORS]

Gunakan thumbnail resmi. Ganti semua placeholder sebelum posting; posting dan unggahan dilakukan oleh tim.

## Urutan penyelesaian malam ini

- [ ] Periksa eligibility, roster, dan onboarding pada portal; jangan menganggap dokumentasi repo sebagai bukti administratif.
- [ ] Pastikan repo public dan riwayat kontribusi sesuai aturan; jangan backdate history. Repo tetap public minimal 90 hari setelah pengumuman pemenang 17 Oktober 2026 sesuai aturan saat diperiksa.
- [ ] Pastikan chart dan satu alur produksi berjalan dengan key lokal; cek tidak ada kredensial dalam layar/rekaman/file publik.
- [ ] Rekam teaser dan judging; cek durasi, audio, keterbacaan, hasil aktual, dan disclaimer.
- [ ] Upload teaser public dan judging public/unlisted. Uji kedua URL pada browser incognito tanpa login.
- [ ] Buat posting sosial menggunakan template dan tag resmi; salin URL langsung posting.
- [ ] Isi seluruh field portal, pilih track, Save draft, lalu periksa semua tautan dan problem statement.
- [ ] Selesaikan semua commit/push dan perubahan aplikasi sebelum Submit final.
- [ ] Submit final sebelum 23:59 WIB, simpan bukti status diterima, lalu bekukan repo DAN aplikasi. Jangan memperbaiki kode setelah submit.

Pengecualian credential leak mengikuti aturan: beri tahu penyelenggara, revoke/rotate, lalu perubahan hanya untuk penghapusan kredensial. Tidak ada upload, posting sosial, atau submission portal yang dilakukan otomatis dalam sesi ini.

## Catatan validasi upgrade 8 Oktober

- 145 unit tests, 19 file, lulus; production build dan TypeScript lulus.
- Full ESLint: 0 errors, 32 warning lama; belum semuanya dibersihkan.
- Pemeriksaan file publik: 195 tracked files lulus sebelum perubahan dokumentasi terakhir; bukan audit keamanan menyeluruh.
- Perbaikan: metadata broker tetap terjaga saat reanalysis; ringkasan riset dengan pending/weak-evidence guards; rendering React dan umur cache; data chart dipasang ulang saat tema berubah.
- Tidak ada klaim studi pengguna, backtest profit, atau kelulusan seluruh authenticated E2E. Ketersediaan provider dan kredit dapat memengaruhi demo. Chart harus diuji ulang secara visual sebelum rekaman.
