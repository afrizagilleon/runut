# Putusan probe penalar GLM (M2d-6 D-1, T-04)

Data mentah: `probe-1.json`, `probe-2.json`, `probe-3.json` (23 panggilan GLM-5.3, US$0,3126 nyata, tag `m2d6/probe/`, pagu probe US$0,40 ditegakkan kode). Bahan: omongan 2 TIRT M2d-5 (bocor di uji luar: 3/3 penguji menebak benar tanpa kartu) dengan paket M2d-5-nya — kritikus (cek makna) dan penebak GLM (petunjuk M2d-5). Tanpa penjaga dan tanpa ulangan: angka mentah per panggilan.

## Data (token penalaran dari `usage.completion_tokens_details.reasoning_tokens`)

| peran | effort | penyedia → token penalaran | keberatan / tebakan |
|---|---|---|---|
| kritikus | high | Wafer 3.678, PrimeIntellect 1.731, Wafer 7.611, Wafer 5.126 (p1); Wafer 11.880, 11.040, 6.457 (p2); Wafer 6.589, 7.296 (p3) | "tertebak" di 6 dari 9, "bahasa" 2, tanpa keberatan 2 |
| kritikus | medium | Wafer 125, 20, 238 | 0 keberatan di ketiganya |
| penebak GLM | high | Relace 685, InferenceNet 267, 98, 263 (p1); InferenceNet 181, 628, 311, 60, 111, 329 (p2); Relace 161, Sail Research 340, Parasail 371, Sail Research 615 (p3) | kunci d: 0 dari 14 benar |
| penebak GLM | medium | InferenceNet 175, 0, 0 | 0 dari 2 terbaca benar (1 tak terbaca) |

Pembanding M2d-5 (`reasoning.max_tokens`, tanpa effort; ledger): kritikus 33–260 token, penebak GLM 0–123 — dan 0 keberatan di 9 putusan kritikus.

## Putusan (ditetapkan SEBELUM kalibrasi dan jalan TIRT)

1. **`effort: "high"`**, bukan `"medium"`: "medium" tidak berpikir (kritikus ≤ 238, penebak 0–175) — sama dengan M2d-5. "high" membuat kritikus berpikir 1.731–11.880 token dan, untuk pertama kalinya di OpenRouter, mengajukan keberatan (paling sering "tertebak" — omongan ini memang bocor di uji luar).
2. **Kritikus: `max_tokens` 24.000, ambang 1.000.** Penalaran terpanjang 11.880 dari batas 16.000 terlalu dekat; 24.000 = batas M2d-4. Ambang 1.000 memisahkan dua gugus yang terukur: tidak berpikir ≤ 260 (M2d-5 dan "medium") dan berpikir ≥ 1.731 ("high"). Kontrak: ≥ 500.
3. **Penebak GLM: `max_tokens` 8.000, ambang 300.** Keluaran terpanjang 738. Ambang 300 di atas penebak GLM M2d-5 yang tidak berpikir (0–123) dan di bawah keluaran penebak GLM Featherless M2d-4 yang berpikir (439–1.463 token keluar). Gugus penebak lebih rapat daripada kritikus — ambang ini lebih rapuh (lihat keraguan).
4. **Pengecualian penyedia (D-2, dari bukti):** InferenceNet (GLM) — dengan `effort: "high"` diminta, 6 dari 9 tebakan di bawah ambang 300 (60–267 token) → `provider.ignore` untuk GLM. Probe putaran 3 dijalankan sesudah pengecualian itu: Relace 161 (di bawah ambang, satu kali — tidak cukup untuk dikecualikan), Sail Research 340/615, Parasail 371. Penjaga D-1 menangani panggilan tunggal di bawah ambang (diulang ke penyedia lain).
5. **Temuan untuk kalibrasi:** penebak GLM yang berpikir TETAP menebak salah omongan 2 (0 dari 14 benar; penguji luar 3/3 benar). Berpikir saja tidak membuat penebak GLM menangkap soal ini — itulah yang diuji kalibrasi D-3 (susunan dan petunjuk).

## Dokumentasi OpenRouter (dibaca 29 Sep, `openrouter.ai/docs/use-cases/reasoning-tokens`, `/docs/features/provider-routing`)

- `reasoning.effort` dan `reasoning.max_tokens` **tidak boleh digabung** (salah satu saja) — M2d-6 hanya mengirim `effort`.
- Untuk model yang memakai anggaran token, `effort: "high"` ≈ 80 % dari `max_tokens` (medium ≈ 50 %). Karena itu `max_tokens` menentukan anggaran penalaran: kritikus 24.000 → ±19.200; penebak GLM 8.000 → ±6.400. Anggaran itu BATAS; yang membuktikan berpikir tetap `usage.completion_tokens_details.reasoning_tokens` (penjaga D-1).
- `provider.ignore` menerima **slug** penyedia (mis. `deepinfra`), bukan nama tampilan; slug dasar mencakup semua endpoint penyedia itu. Kode memetakan nama respons → slug (`SLUG_PENYEDIA`, dari medan `tag` `GET /models/<id>/endpoints`).
