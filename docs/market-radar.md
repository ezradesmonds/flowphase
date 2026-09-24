# Market Radar V1

Market Radar adalah tahap **DISCOVER** sebelum FlowPhase menjalankan analisis phase yang lebih mahal. Production mode tidak memakai fixture atau synthetic fallback.

## Data source

- Sectors `/v2/companies/top-changes/`: hanya `1d`, top gainers + top losers, maksimum 10 per sisi, minimum market cap Rp1 triliun.
- Sectors `/v2/most-traded/`: maksimum 10 ticker, `adjusted=true`, sehingga ranking memakai volume × closing price.
- Sectors `/v2/foreign-flow/{symbol}/`: konteks untuk maksimum 10 kandidat prioritas; tidak digunakan untuk mengubah ranking discovery.
- Sectors company universe: kandidat yang tidak ada di universe tervalidasi dibuang.

Cold provider usage Radar maksimum 14 credits: 2 Top Movers + 2 Most Traded + 10 foreign-flow calls. Ranking feeds di-cache 5 menit; foreign flow 15 menit.

## Ranking logic

Radar tidak membuat weighted prediction score.

1. Normalisasi setiap feed menjadi ticker + ordinal rank + session date.
2. Untuk setiap ticker, hanya trigger dari **session terbaru ticker tersebut** yang boleh digabungkan. Trigger dari tanggal berbeda tidak dihitung sebagai confluence.
3. `discoveryStrength` adalah jumlah jenis trigger independen pada session tersebut:
   - activity: Most Traded;
   - move: Top Gainer atau Top Loser.
4. Kandidat dengan `2/2` trigger ditempatkan di atas kandidat `1/2`.
5. Tie-break menggunakan ordinal source rank terbaik, kemudian ticker untuk deterministic ordering.
6. Foreign flow ditampilkan sebagai konteks investor-origin. Nilai absolut foreign flow tidak dipakai untuk ranking karena tidak comparable lintas ukuran perusahaan tanpa normalisasi tambahan.

Output Radar berarti **research candidate**, bukan prediksi arah dan bukan phase classification.

## Integration

- Jika kandidat sudah punya cached FlowPhase analysis, Radar menampilkan current phase dan evidence basis lalu menyediakan `OPEN ANALYSIS`.
- Jika belum, `ANALYZE WITH FLOWPHASE` memanggil existing `POST /api/intelligence`, sehingga pipeline TradingView candles, Sectors broker flow, phase engine, evidence, ownership, dan replay tetap satu sumber kebenaran.
- Provider failure menghasilkan explicit unavailable/error state; tidak ada fake production candidate.
