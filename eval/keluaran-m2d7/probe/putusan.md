# Putusan probe GLM `effort: "max"` (M2d-7 D-1, T-01)

Data mentah: `probe-1.json` (11 panggilan GLM-5.3, US$0,257023 nyata, tag `m2d7/probe/`, pagu probe US$0,30 ditegakkan kode). Tanpa penjaga dan tanpa ulangan. Pagar M2d-7: pengecualian penyedia M2d-6 + `provider.order: ["wafer"]` untuk GLM (`penyedia-urutan.ts`, diturunkan dari ledger M2d-6: Wafer satu-satunya penyedia dengan ≥ 10 panggilan per peran dan median penalaran di atas ambang M2d-6 — kritikus 7.657 dari 33 panggilan, penebak 865 dari 72; `bukti-urutan.json`). Badan permintaan hanya `reasoning: {effort: "max"}` — tanpa `reasoning.max_tokens` (dokumen OpenRouter `/docs/use-cases/reasoning-tokens`, dibaca 29 Sep: `effort` dan `max_tokens` "One of the following (not both)"; `"max"` ≈ 95 % `max_tokens`).

| panggilan | penyedia | selesai | token keluar | token penalaran | biaya | hasil |
|---|---|---|---:|---:|---:|---|
| kritikus o1 (TIRT M2d-6, tertebak 3/3 di luar) | Wafer | stop | 6.778 | 6.550 | US$0,0303 | 0 keberatan |
| kritikus o2 (TIRT M2d-6, lolos di luar) | Wafer | stop | 10.563 | 10.334 | US$0,0469 | 0 keberatan |
| kritikus o1 (sampel 2) | Wafer | stop | 7.066 | 6.855 | US$0,0315 | 0 keberatan |
| penebak m2d5-tirt-o2 (bocor, kunci d) ×2 | Wafer | stop | 3.262 / 1.039 | 3.140 / 946 | US$0,0192 | d/70, d/65 |
| penebak m2d4-tirt-o3 (bocor, kunci a) ×2 | Wafer | stop | 2.641 / 7.309 | 2.542 / 7.188 | US$0,0440 | a/60, b/55 |
| penebak m2d4-ultj-o1 (aman, kunci c) ×2 | Wafer | stop | 1.158 / 2.110 | 1.044 / 2.015 | US$0,0146 | c/58, c/62 |
| penebak m2d4-dada-o1 (aman, kunci a) ×2 | Wafer | **length** | 8.000 / 8.000 | 8.001 / 8.002 | US$0,0706 | tak terbaca (habis berpikir) |

## Putusan (aturan `putusanProbe()` ditulis SEBELUM probe dijalankan; angka = keluaran aturan itu)

1. **`"max"` diterima dan GLM berpikir.** Tidak ada panggilan yang ditolak penyedia; kritikus berpikir 6.550–10.334 token (3/3 ≥ 1.000; pembanding M2d-6 `"high"` di Wafer: median 7.657). Penebak GLM berpikir 946–8.002 token — jauh di atas M2d-6 `"high"` (median 187 di semua penyedia, 865 di Wafer).
2. **Kritikus: `max_tokens` 16.000, ambang 1.000.** Aturan: min(24.000, max(16.000, 1,5 × keluaran terpanjang 10.563 dibulatkan ke atas)) = 16.000; tidak ada yang terpotong.
3. **Penebak GLM: ambang 520, `max_tokens` 12.000.** Kuartil bawah penalaran tebakan yang terbaca = 1.044 → ½ = 522 → 520. Dua tebakan (soal aman DADA o1) habis di 8.000 token tanpa jawaban → 12.000.
4. **Temuan (bukan putusan):** kritikus `"max"` tidak berkeberatan atas omongan 1 TIRT M2d-6 yang tertebak 3/3 di luar (dua sampel). Penebak `"max"` menebak BENAR kedua soal bocor yang diperiksa (d/70, d/65; a/60) — tetapi juga soal aman ULTJ o1 (c/58, c/62; penguji luar 0/3). Penebak yang berpikir dalam lebih keras dari penguji luar pada soal ini; ini diukur di kalibrasi D-6.
5. **Ongkos:** tebakan `"max"` US$0,005–0,035 per panggilan (M2d-6 `"high"`: ±US$0,001–0,003). Tiga penebak per omongan ≈ US$0,03–0,10.
