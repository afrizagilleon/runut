# Bukti: pengecoh dari data di lingkar agen TIRT (M2d-7)

Berkas ini ditulis oleh `npm run pengecoh:laporan` dari keluaran mentah di `eval/keluaran-m2d7/` (probe, kalibrasi, riwayat dan jejak jalan TIRT, jawaban mentah penguji luar, putusan mekanis), ledger OpenRouter (biaya NYATA `usage.cost`), dan ringkasan M2d-6. Angka dihitung ulang tiap kali perintah itu dijalankan; hanya bagian "Catatan penulis" yang ditulis tangan (`eval/keluaran-m2d7/laporan-tangan.md`). Draf **tidak** dipasang ke produk.

## Pra-registrasi (D-0)

Patokan "layak tayang" (keputusan pemilik: **setara soal manusia**) ditulis di `docs/bukti/m2d7-praregistrasi.md` dan di-commit **34f37da 2026-09-29T23:33:06+07:00**; panggilan berbayar M2d-7 pertama di ledger: **2026-09-29T16:37:42.046Z**. Berkas itu dites tidak berubah sejak commit tersebut, dan kode putusan (`pengecoh-putusan.ts`) dites sama dengan teksnya (petunjuk kartu, daftar kosong, 2/6, mayoritas 2 dari 3).

(a) terbit · (b) tebak buta luar: proporsi lolos ≥ 2/6 soal manusia, yaitu ≥ 1 dari 3 omongan · (c) jawab-dengan-kartu K-05 3/3 · (d) nol masalah makna (≥ 2 dari 3 penguji kartu pada butir yang sama, atau `gPenilaian`/`gKembar`). Kealamian dilaporkan, bukan syarat.

## Gerbang yang tertidur: `max_tokens` bukan `effort` (bahan README)

Kritikus GLM-5.3 memutuskan apakah soal lolos. Di M2d-5 ia dikirimi `reasoning.max_tokens` — itu hanya BATAS ATAS, dan penyedia boleh berpikir jauh lebih sedikit. Di M2d-6 permintaannya diganti `reasoning.effort` dan buktinya dibaca dari respons (`usage.completion_tokens_details.reasoning_tokens`). Data ledger, penyedia yang SAMA:

| milestone | parameter | kritikus (semua penyedia) | kritikus di Wafer |
|---|---|---|---|
| M2d-5 | `reasoning.max_tokens` | 14 panggilan, median 191, maks 608 | 7 panggilan, median 260, maks 608 |
| M2d-6 | `reasoning.effort: "high"` | 30 panggilan, median 6.588, maks 24.002 | 20 panggilan, median 10.044, maks 24.002 |
| M2d-7 | `reasoning.effort: "max"` | 15 panggilan, median 24.000, maks 24.002 | 15 panggilan, median 24.000, maks 24.002 |

Di M2d-7 (`"max"`) arah masalahnya berbalik: 12 dari 15 panggilan kritikus di jalan TIRT berpikir sampai seluruh `max_tokens` habis (16.000 di jalan 1, 24.000 di jalan 2) tanpa jawaban — dibayar, dibaca "tidak menjawab".

Pelajarannya: gerbang yang "menjawab" belum tentu berpikir. Kritikus M2d-5 tidak mengajukan satu keberatan pun; gerbang itu tampak bekerja dan tertidur. Bukti berpikir harus dibaca dari respons, bukan dari badan permintaan.

## Metode M2d-7 (ditetapkan kode, `GENERASI_M2D7` di `agen-pengecoh.ts`)

- **D-1 GLM `effort: "max"`** untuk kritikus (`max_tokens` 24.000, ambang 1.000) dan penebak ×3 (`max_tokens` 12.000, ambang 520), tanpa `reasoning.max_tokens`; `provider.order` ["wafer"] dari bukti ledger (fallback tetap), pengecualian M2d-6 tetap.
- **D-2 Bank pengecoh dari data** (`bank-pengecoh.ts`): kandidat = nilai nyata fakta lain di paket (periode keliru, operand keliru, konsep lain, alasan lain, pengumuman lain); tiap rujukan lolos validator; tanpa kandidat senilai kunci.
- **D-3 Penulis dipecah**: pesan (fakta sudut + salah kaprah dari bank; label BETUL/KELIRU ditetapkan kode) → pilihan (kunci + tiga pengecoh DIPILIH dari bank, sumber tiap pilihan dicatat dan diperiksa G-ikatan-bank) → penjelasan. Kartu dan huruf kunci dari kode.
- **D-4 Gerbang artefak** sebelum kritikus: pilihan-saja (DeepSeek ×2, hanya empat pilihan), meresmikan, keseimbangan. Ambang akhir sesudah kalibrasi: `{"rasio":1.5,"maksKata":3,"pilihanSajaYakin":60,"penebakYakin":false}`.
- **D-5 Umpan balik beralternatif**: tiap penolakan = lokasi + nilai teramati + alternatif yang diizinkan (kandidat bank yang belum dipakai); hanya bagian gagal ditulis ulang; maks 2 perbaikan per bagian, lalu sudut baru.

## Probe `effort: "max"` (D-1)

Putusan: `eval/keluaran-m2d7/probe/putusan.md`.

| panggilan | penyedia | selesai | token penalaran | biaya | hasil |
|---|---|---|---:|---:|---|
| kritikus/o1 | Wafer | stop | 6.550 | US$0.0303 | 0 keberatan (-) |
| kritikus/o2 | Wafer | stop | 10.334 | US$0.0469 | 0 keberatan (-) |
| kritikus/o1-b | Wafer | stop | 6.855 | US$0.0315 | 0 keberatan (-) |
| penebak/m2d5-tirt-o2/1 | Wafer | stop | 3.140 | US$0.0145 | d/70 (kunci d, bocor) |
| penebak/m2d5-tirt-o2/2 | Wafer | stop | 946 | US$0.0047 | d/65 (kunci d, bocor) |
| penebak/m2d4-tirt-o3/1 | Wafer | stop | 2.542 | US$0.0117 | a/60 (kunci a, bocor) |
| penebak/m2d4-tirt-o3/2 | Wafer | stop | 7.188 | US$0.0323 | b/55 (kunci a, bocor) |
| penebak/m2d4-ultj-o1/1 | Wafer | stop | 1.044 | US$0.0052 | c/58 (kunci c, aman) |
| penebak/m2d4-ultj-o1/2 | Wafer | stop | 2.015 | US$0.0094 | c/62 (kunci c, aman) |
| penebak/m2d4-dada-o1/1 | Wafer | length | 8.001 | US$0.0353 | tak terbaca |
| penebak/m2d4-dada-o1/2 | Wafer | length | 8.002 | US$0.0353 | tak terbaca |

- effort "max": 0 panggilan ditolak penyedia (4xx); kritikus berpikir ≥ 1000 token 3/3 → "max"
- kritikus: keluaran terpanjang 10563 → max_tokens 16000; ambang 1000
- penebak: 6 tebakan terbaca, kuartil bawah penalaran 1044 → ambang 520; max_tokens 12000 (ada yang terpotong)

## Kalibrasi ulang cepat (D-4, D-6)

Himpunan = himpunan bocor/aman M2d-6 (label dari jawaban mentah penguji luar). Biaya US$0.5528 dari pagu US$0.6000 (ditegakkan kode). **Kalibrasi berhenti di pagu**: 7 dari 10 soal inti dan 1 dari 2 soal tambahan terukur; yang tidak terukur tidak dilengkapi tangan.

| gerbang (ambang awal) | bocor ditolak | aman ditolak |
|---|---:|---:|
| meresmikan | 2/3 | 1/4 |
| keseimbangan | 0/3 | 1/4 |
| pilihan_saja | 1/3 | 2/4 |
| penebak | 3/3 | 3/4 |
| gabungan | 3/3 | 3/4 |

| gerbang (ambang akhir) | bocor ditolak | aman ditolak |
|---|---:|---:|
| meresmikan | 2/3 | 0/4 |
| keseimbangan | 0/3 | 0/4 |
| pilihan_saja | 0/3 | 0/4 |
| penebak | 3/3 | 3/4 |
| gabungan | 3/3 | 3/4 |

Langkah aturan penurunan ambang (dihitung ulang dari data mentah):

- awal: aman ditolak 3/4
- keseimbangan 1,3 → 1,5 → aman ditolak 3/4
- meresmikan kata 2 → 3 → aman ditolak 3/4
- pilihan-saja: juga rata-rata yakin ≥ 60 → aman ditolak 3/4
- penebak: hanya ≥ 2/3 benar → aman ditolak 3/4

| soal | kelompok | uji luar | meresmikan | keseimbangan | pilihan-saja | penebak (GLM "max") |
|---|---|---|---|---|---|---|
| m2d5-tirt-o2 (kunci d) | bocor | d/40 · d/40 · d/40 (3/3 benar) | **tolak** (rp58) | lolos (0.702) | lolos (b/60 b/65) | **tolak** (d/65 d/70 d/62) |
| m2d4-tirt-o3 (kunci a) | bocor | b/55 · a/40 · b/55 (1/3 benar, yakin 40) | **tolak** (ragu, langsung, usaha) | lolos (1.089) | lolos (b/55 b/60) | **tolak** (a/65 a/68 b/55) |
| m2d4-tirt-o1 (kunci a) | bocor | b/50 · a/50 · b/50 (1/3 benar, yakin 50) | lolos (—) | lolos (1.037) | **tolak** (a/45 a/55) | **tolak** (a/65 a/70 a/65) |
| m2d4-ultj-o1 (kunci c) | aman | b/45 · b/55 · b/50 (0/3) | lolos (—) | lolos (1) | **tolak** (c/40 c/55) | **tolak** (c/60 c/60 c/60) |
| m2d4-ultj-o2 (kunci a) | aman | b/45 · b/40 · b/40 (0/3) | **tolak** (sepanjang, januari) | lolos (1.286) | **tolak** (a/55 a/45) | **tolak** (a/55 a/60 a/70) |
| m2d4-ultj-o3 (kunci a) | aman | b/55 · b/45 · b/55 (0/3) | lolos (—) | lolos (1.179) | lolos (b/60 b/60) | lolos (b/55 b/55 b/65) |
| m2d4-dada-o2 (kunci b) | aman | d/45 · d/40 · d/40 (0/3) | lolos (agustus) | **tolak** (1.327) | lolos (d/40 b/40) | **tolak** (b/60 b/58 b/60) |
| m2d6-tirt-o1 (kunci c) *tambahan* | bocor | c/55 · c/50 · c/50 (3/3 benar) | lolos (—) | lolos (1.044) | **tolak** (c/55 c/60) | lolos (a/65 a/60 a/60) |

Pilihan-saja atas keenam soal manusia yang hidup (D-4):

| soal | pilihan-saja | ambang awal | ambang akhir |
|---|---|---|---|
| s1-kata-bursa (kunci b) | d/60 d/45 | lolos | lolos |
| s2-dividen-pemilik-kecil (kunci a) | c/68 c/60 | lolos | lolos |
| s3-siapa-yang-menjual (kunci c) | d/55 a/30 | lolos | lolos |
| turun-di-tanggal-ex (kunci b) | c/60 b/55 | lolos | lolos |
| riwayat-dividen (kunci a) | c/55 c/60 | lolos | lolos |
| siapa-yang-membeli (kunci d) | d/45 d/55 | **tolak** | lolos |

## Hasil TIRT (D-7)

| jalan | hasil | putaran | omongan dikunci | panggilan | biaya NYATA |
|---:|---|---:|---:|---:|---:|
| 1 | tidak terbit (omongan 2 gagal di 3 sudut (naik-2025-11-26-2025-12-09, kelipatan-2025-11-26-2025-12-09, harga-2025-12-09); simulasi tidak terbit) | 9 | 0 | 88 | US$0.3438 |
| 2 | tidak terbit (omongan 3 gagal di 3 sudut (rups-2025-09-25, kelipatan-2025-11-26-2025-12-09, volume-2025-12-10); simulasi tidak terbit) | 9 | 0 | 109 | US$1.1539 |

### Jalan 1

- omongan 1 (klaim Keliru): 1. `susp-2025-12-10` → dibuang (1–3); 2. `susp-2025-01-21` → dibuang (4–6); 3. `volume-2025-12-10` → berjalan (7–…)
- omongan 2 (klaim Betul): 1. `naik-2025-11-26-2025-12-09` → dibuang (1–3); 2. `kelipatan-2025-11-26-2025-12-09` → dibuang (4–6); 3. `harga-2025-12-09` → dibuang (7–9)
- omongan 3 (klaim Keliru): 1. `rups-2025-09-25` → dibuang (1–3); 2. `hari-naik-beruntun` → dibuang (4–6); 3. `volume-2025-12-09` → berjalan (7–…)
- Status per versi: ditolak-kartu 6, ditolak-pemeriksa 20, kritikus-tidak-menjawab 1.
- Sumber penolakan (butir umpan terarah): pemeriksa: OPSI_PANJANG_TIMPANG 36, gerbang artefak: meresmikan 18, pembaca kartu 10, pemeriksa: G-mirip 8, pemeriksa: G-angka-cukup 6, pemeriksa: OPSI_TAK_DUA_DUA 4, kritikus-tidak-menjawab 1.
- Bagian yang ditulis: pesan 10, pilihan penuh 18, pilihan SEBAGIAN 8, penjelasan 26; perbaikan terbanyak satu bagian di satu sudut: 3.
- Pilihan-saja: 7 versi diperiksa, 0 ditolak.
- Kritikus: 1 putusan, menjawab 0, tanpa keberatan 0; penalaran median 16.001.
- Penebak (GLM "max", tanpa kartu): 0/0 tebakan benar; penalaran median —.

### Jalan 2

- omongan 1 (klaim Keliru): 1. `susp-2025-12-10` → dibuang (1–3); 2. `susp-2025-01-21` → dibuang (4–8); 3. `harga-2025-12-09` → berjalan (9–…)
- omongan 2 (klaim Betul): 1. `naik-2025-11-26-2025-12-09` → dibuang (1–4); 2. `hari-naik-beruntun` → dibuang (5–9); 3. `volume-2025-12-09` → berjalan (10–…)
- omongan 3 (klaim Keliru): 1. `rups-2025-09-25` → dibuang (1–3); 2. `kelipatan-2025-11-26-2025-12-09` → dibuang (4–6); 3. `volume-2025-12-10` → dibuang (7–9)
- Status per versi: ditolak-pemeriksa 15, ditolak-tebak 1, ditolak-kritikus 2, ditolak-artefak 1, kritikus-tidak-menjawab 5, ditolak-kartu 3.
- Sumber penolakan (butir umpan terarah): pemeriksa: OPSI_PANJANG_TIMPANG 28, gerbang artefak: meresmikan 16, kritikus-tidak-menjawab 5, pemeriksa: G-ikatan-bank 4, kritikus: ambigu 4, gerbang pilihan-saja 4, pemeriksa: G-mirip 4, pembaca kartu 4, penebak tanpa kartu 3, pemeriksa: FAKTA_DI_LUAR_PAKET 3, pemeriksa: ANGKA_TANPA_RUJUKAN 2, pemeriksa: PENJELASAN_PANJANG 2, kritikus: arahan 2, gerbang artefak: keseimbangan 1, pemeriksa: ANGKA_TAK_COCOK 1, pemeriksa: G-satu-klausa 1, kritikus: kunci 1, pemeriksa: RUJUKAN_PANJANG 1, kritikus: tertebak 1.
- Bagian yang ditulis: pesan 12, pilihan penuh 18, pilihan SEBAGIAN 2, penjelasan 23; perbaikan terbanyak satu bagian di satu sudut: 3.
- Pilihan-saja: 12 versi diperiksa, 1 ditolak.
- Kritikus: 8 putusan, menjawab 3, tanpa keberatan 1; penalaran median 24.001.
- Penebak (GLM "max", tanpa kartu): 3/3 tebakan benar; penalaran median 2.588.

### Draf

Jalan 2: TIRT tidak terbit; omongan yang dikunci (0):

Versi yang sampai kritikus/penebak di jalan 1 (1; ditampilkan yang pertama per omongan):

**Jalan 1 putaran 7, omongan 1** — kritikus-tidak-menjawab: [kritikus-tidak-menjawab] lokasi: pilihan c · teramati: "" · masalah: kritikus-tidak-menjawab · alternatif yang diizinkan: label "Keliru," + nilai kunci [[volume-2025-12-10\|0 lembar]], satu klausa, sependek pengecoh, tanpa mengulang kata pesan yang tidak ada di pengecoh

> **Sinta (20.15):** Gw yakin volume hari ini 1.461.200 lembar, rame banget yang masuk.

- a) Betul, volume perdagangan 1.461.200 lembar.
- b) Keliru, harga penutupan Rp106.
- **c) Keliru, volume perdagangan 0 lembar.** (kunci)
- d) Betul, kenaikan harga penutupan Rp58.

Kartu: `volume-2025-12-10` (penentu), `volume-2025-12-09`, `harga-2025-12-09`, `naik-2025-11-26-2025-12-09`

Penjelasan: Sinta menyebut volume hari ini 1.461.200 lembar. Tapi catatan untuk 10 Desember 2025 menunjukkan 0 lembar. Jadi ucapannya tidak cocok: angka yang disebut ada di data 9 Desember 2025, bukan di tanggal simulasi. Pilihan yang tampak benar karena menyebut 1.461.200 lembar keliru, sebab itu bukan volume hari ini. Pilihan tentang Rp106 juga tidak menjawab pertanyaan volume. Salah-kaprah yang umum: mengira angka besar yang muncul di dokumen otomatis berlaku untuk hari ini.

Versi yang sampai kritikus/penebak di jalan 2 (8; ditampilkan yang pertama per omongan):

**Jalan 2 putaran 2, omongan 2** — ditolak-tebak: [penebak tanpa kartu] lokasi: pilihan a · teramati: "Betul, volume perdagangannya 1.461.200 lembar dari akhir November sampai awal Desember." · masalah: 3/3 penebak TANPA kartu memilih kunci (d/65, d/70, d/78); pengecoh ini mudah disingkirkan. Alasan mereka: "Klaim Rian soal harga naik hanya bisa di

> **Rian (19.42):** Dari akhir November sampai awal Desember harganya naik, gw udah tahu polanya.

- a) Betul, volume perdagangannya 1.461.200 lembar dari akhir November sampai awal Desember.
- b) Keliru, kenaikannya cuma 2,21 kali dari akhir November sampai awal Desember.
- c) Keliru, harga penutupannya Rp97 dari akhir November sampai awal Desember.
- **d) Betul, kenaikannya Rp58 dari akhir November sampai awal Desember.** (kunci)

Kartu: `naik-2025-11-26-2025-12-09` (penentu), `volume-2025-12-09`, `kelipatan-2025-11-26-2025-12-09`, `harga-2025-12-08`

Penjelasan: Rian menyebut harga naik dari akhir November sampai awal Desember. Rujukan 26 November–9 Desember 2025 menunjukkan penutupan bergerak dari Rp48 ke Rp106, selisihnya Rp58. Jadi ucapannya cocok. Pengecoh yang menggoda: 1.461.200 lembar itu volume, bukan kenaikan; Rp97 itu penutupan sehari sebelumnya, bukan rentang akhir November–awal Desember; 2,21 kali itu perbandingan, bukan selisih. Salah-kaprah yang umum: menganggap volume, harga satu hari, atau angka kelipatan sebagai besarnya kenaikan.

**Jalan 2 putaran 9, omongan 3** — ditolak-kritikus: [kritikus: tertebak] lokasi: pesan · teramati: "gw ragu, katanya volume saham Perusahaan T tanggal 10 Desember 1.461.200 lembar." · masalah: Pembuka 'gw ragu' membocorkan lewat nada bahwa klaimnya keliru, dan karena d satu-satunya opsi Keliru yang membahas volume, jawaban bisa didapat tanpa membaca 

> **Sari (20.15):** gw ragu, katanya volume saham Perusahaan T tanggal 10 Desember 1.461.200 lembar.

- a) Betul, volume saham Perusahaan T tanggal itu 1.461.200 lembar.
- b) Keliru, pengumumannya soal rapat umum pemegang saham.
- c) Betul, penghentian perdagangan sahamnya karena keraguan atas kelangsungan usaha.
- **d) Keliru, volume saham Perusahaan T hari itu 0 lembar.** (kunci)

Kartu: `volume-2025-12-10` (penentu), `volume-2025-12-09`, `rups-2025-09-25`, `susp-2025-01-21`

Penjelasan: Sari menyebut volume Perusahaan T hari itu sama dengan 9 Desember 2025: 1.461.200 lembar. Yang tercatat untuk 10 Desember 2025: 0 lembar, karena perdagangan dihentikan sementara sehingga tidak ada volume. Jadi pernyataannya keliru. Angka yang disebut Sari memang ada, tetapi untuk tanggal sebelumnya, bukan tanggal itu. Alasan keraguan atas kelangsungan usaha juga menggoda, namun itu tercatat untuk penghentian 21 Januari 2025, bukan alasan penghentian hari itu. Salah-kaprah yang umum: menganggap angka volume dari hari sebelumnya tetap berlaku saat perdagangan dihentikan sementara.

## Uji luar dan putusan mekanis (D-8)

Penguji: subagent Claude model **opus** yang **baru**, sinkron, masing-masing hanya menerima isi satu berkas bahan (`eval/keluaran-m2d7/penguji/`); jawaban mentah di `penguji/jawaban/`. Draf yang diuji: jalan 2 (tidak terbit — omongan yang dikunci).


| syarat pra-registrasi | hasil | terpenuhi |
|---|---|---|
| (a) terbit | tidak terbit | **tidak** |
| (b) tebak buta luar ≥ 2/6 (proporsi soal manusia) | 0/0 | **tidak** |
| (c) jawab-dengan-kartu K-05 penuh | 0/0 | **tidak** |
| (d) nol masalah makna | 0 masalah | **tidak** |

**Putusan: TIDAK layak tayang.**

Catatan: jalan 2 tidak terbit dan tidak mengunci satu omongan pun: tidak ada bahan uji luar. Tidak ada subagent penguji yang dijalankan (pra-registrasi: yang diuji hanya omongan yang dikunci).

## Biaya NYATA M2d-7 (OpenRouter, `usage.cost`)

Entri ledger bertag `m2d7/`: **US$2.3075 dalam 273 panggilan**, dari pagu milestone US$3.0000 (ditegakkan kode). Kumulatif ledger OpenRouter (M2d-5…M2d-7): US$5.5174.

| peran | panggilan | token keluar | biaya nyata |
|---|---:|---:|---:|
| kalibrasi (penebak) | 31 | 116.407 | US$0.5156 |
| kalibrasi (pilihan-saja) | 34 | 58.764 | US$0.0372 |
| kritikus | 15 | 327.646 | US$1.0262 |
| pembaca-kartu | 18 | 34.739 | US$0.0254 |
| penebak | 3 | 8.959 | US$0.0307 |
| penulis (penjelasan) | 50 | 140.857 | US$0.0942 |
| penulis (pesan) | 22 | 28.094 | US$0.0195 |
| penulis (pilihan) | 48 | 242.351 | US$0.2041 |
| pilihan-saja | 41 | 148.407 | US$0.0976 |
| probe | 11 | 57.926 | US$0.2570 |

| model · penyedia | panggilan | biaya nyata |
|---|---:|---:|
| z-ai/glm-5.3 · Wafer | 60 | US$1.8295 |
| deepseek/deepseek-v4.1-flash · Relace | 62 | US$0.1022 |
| deepseek/deepseek-v4.1-flash · InferenceNet | 28 | US$0.0339 |
| deepseek/deepseek-v4.1-flash · Ionstream | 4 | US$0.0283 |
| deepseek/deepseek-v4.1-flash · NextBit | 4 | US$0.0271 |
| deepseek/deepseek-v4.1-flash · Wafer | 20 | US$0.0267 |
| deepseek/deepseek-v4.1-flash · DeepInfra | 17 | US$0.0230 |
| deepseek/deepseek-v4.1-flash · Alibaba | 9 | US$0.0224 |
| deepseek/deepseek-v4.1-flash · Phala | 5 | US$0.0216 |
| deepseek/deepseek-v4.1-flash · DekaLLM | 19 | US$0.0214 |
| deepseek/deepseek-v4.1-flash · BaseTen | 5 | US$0.0202 |
| deepseek/deepseek-v4.1-flash · (tidak disebut) | 1 | US$0.0184 |
| deepseek/deepseek-v4.1-flash · GMICloud | 5 | US$0.0181 |
| deepseek/deepseek-v4.1-flash · Novita | 4 | US$0.0150 |
| deepseek/deepseek-v4.1-flash · Krea | 3 | US$0.0143 |
| deepseek/deepseek-v4.1-flash · DigitalOcean | 3 | US$0.0142 |
| deepseek/deepseek-v4.1-flash · CoreWeave | 5 | US$0.0140 |
| deepseek/deepseek-v4.1-flash · SiliconFlow | 2 | US$0.0108 |
| deepseek/deepseek-v4.1-flash · Makora | 1 | US$0.0082 |
| deepseek/deepseek-v4.1-flash · StreamLake | 4 | US$0.0082 |
| deepseek/deepseek-v4.1-flash · Fireworks | 4 | US$0.0075 |
| deepseek/deepseek-v4.1-flash · Modal | 1 | US$0.0072 |
| deepseek/deepseek-v4.1-flash · Together | 2 | US$0.0067 |
| deepseek/deepseek-v4.1-flash · Baidu | 1 | US$0.0044 |
| deepseek/deepseek-v4.1-flash · Morph | 4 | US$0.0042 |

## TIRT: M2d-4 → M2d-5 → M2d-6 → M2d-7

| ukuran | M2d-4 (Featherless) | M2d-5 (OpenRouter) | M2d-6 (penalar) | M2d-7 (pengecoh dari data) |
|---|---|---|---|---|
| terbit (putaran) | tidak (15) | ya (4) | tidak (15) | tidak (9) |
| omongan dikunci | 2 | 3 | 2 | 0 |
| tebak buta luar lolos | 0/2 | 1/3 | 1/2 | 0/0 |
| jawab-dengan-kartu K-05 | 2/2 | 3/3 | 2/2 | 0/0 |
| biaya jalan TIRT | US$1.1811 (tabel tebakan) | US$0.1609 | US$1.8384 | US$1.4977 (jalan 1 US$0.3438 + jalan 2 US$1.1539) |
| kealamian TIRT (penilai milestone itu) | 4 | 3 | 3 | — (tidak ada omongan yang diuji) |

## Catatan penulis

### Singkatnya

**TIRT M2d-7 TIDAK layak tayang.** Kedua jalan (jalan 1 US$0,344; jalan 2 sesudah perbaikan implementasi US$1,154) tidak terbit sesudah 9 putaran, dan **tidak satu omongan pun dikunci** di jalan mana pun. Menurut pra-registrasi, tanpa draf terbit syarat (a) gagal; omongan yang dikunci jalan terakhir diuji di luar hanya untuk laporan — dan karena tidak ada, **tidak ada subagent penguji yang dijalankan**. Syarat (b), (c), (d) tidak bisa diukur (0 omongan) dan dihitung tidak terpenuhi. Biaya M2d-7 US$2,3075 dari pagu US$3,00. Draf tidak dipasang.

### Apa yang berhasil (terukur)

- **Bank pengecoh dari data bekerja sebagai pagar fakta.** Semua kandidat lolos pemeriksa rujukan validator (dites atas setiap fakta tiga paket); di dua jalan tidak ada satu pun pengecoh dengan angka karangan atau `[[misal|…]]` yang lolos pemeriksa — G-ikatan-bank mengeluarkan 4 butir penolakan (pengecoh tidak memakai kandidatnya / pesan tidak memakai salah kaprahnya), validator 6 butir rujukan yang salah.
- **Gerbang pilihan-saja murah dan menangkap yang terlewat.** ±US$0,002–0,005 per pemeriksaan. Di kalibrasi ia satu-satunya gerbang yang menangkap omongan 1 TIRT M2d-6 (tertebak 3/3 di luar, sementara penebak GLM "max" memilih salah 3/3).
- **Perbaikan terarah berjalan mekanis.** Pesan yang lolos tidak ditulis ulang saat hanya pilihan yang gagal (jalan 1: pesan ditulis 10 kali untuk 27 versi); pilihan sebagian ditulis 10 kali; tiap sudut berhenti sesudah 2 perbaikan per bagian.
- **Kritikus "max" yang menjawab menemukan masalah nyata** yang tidak tertangkap kode: pengecoh bank yang ternyata ikut BENAR ("pilihan a juga benar" — alasan resmi setop 10 Desember memang kenaikan harga, jadi "Betul, harganya naik …" ikut benar) dan nada pesan yang membocorkan kunci ("gw ragu …").

### Yang tidak berhasil, dan kenapa (terukur)

1. **Kritikus `effort: "max"` berpikir sampai `max_tokens` habis.** Di jalan TIRT, 12 dari 15 panggilan kritikus habis tanpa jawaban (jalan 1: 2/2 di 16.000; jalan 2: 10/13 di 24.000), dibayar US$0,055–0,072 per panggilan, dan dibaca "tidak menjawab" → versi dibawa ke putaran berikutnya → kritikus dipanggil lagi. Kritikus menghabiskan US$1,03 dari US$1,50 jalan TIRT. Probe (3 panggilan atas omongan yang lebih sederhana) tidak memperlihatkan ini: penalarannya berhenti di 6.550–10.334. Di OpenRouter `"max"` ≈ 95 % `max_tokens` adalah anggaran, dan GLM memakainya habis pada soal yang ambigu.
2. **Gerbang meresmikan terlalu keras terhadap kata fungsi.** Ia menjadi penolak kode kedua terbesar (34 butir) sesudah OPSI_PANJANG_TIMPANG (64). Tokenisasi `isiPilihan` sengaja mempertahankan "tidak/bukan/hanya" (untuk G-pilihan-kembar), sehingga kunci koreksi seperti "Keliru, … karena harga naik, bukan keraguan" ditolak karena mengulang "karena", "bukan", "naik". Soal manusia tidak kena (dites), tulisan agen sering kena.
3. **Klaim BETUL berangka bertabrakan dengan gerbang yang ada.** Kunci yang membenarkan "58 perak" hampir selalu mengulang 58 (meresmikan), dan kandidat operand-keliru dari bank (Rp106, Rp48) membuat 58 bisa dihitung dari pilihan (G-angka-cukup). Omongan 2 jalan 1 habis di ketiga sudut berangka karena ini. Perbaikan sebelum jalan 2 (klaim BETUL tanpa angka persis, rujukan lain ke fakta sudut) mengurangi, tidak menghilangkan.
4. **"Dari data" tidak sama dengan "salah".** Nilai nyata milik fakta lain bisa tetap membenarkan klaim teman dengan label "Betul" — kritikus menangkapnya, kode tidak. Bank perlu tahu kandidat mana yang menjawab pertanyaan yang SAMA dengan klaim teman.
5. **Penebak GLM "max" lebih keras dari penguji luar Opus.** Di kalibrasi ia menebak benar 3 dari 4 soal aman yang terukur (penguji luar: 0/3 di ketiganya), jadi keempat langkah pelonggaran diambil tanpa menurunkan aman-ditolak di bawah 3/4. Satu-satunya versi yang sampai penebak di jalan TIRT tertebak 3/3 (keempat pilihan berekor sama "dari akhir November sampai awal Desember", kunci satu-satunya yang menyebut kenaikan).
6. **Kalibrasi berhenti di pagu.** Satu soal (m2d5-tirt-o3) menghabiskan US$0,20: tebakan GLM "max" habis di 12.000 token lalu diulang (tak terbaca). 7 dari 10 soal inti terukur.

### Keputusan yang diambil eksekutor (bisa ditolak reviewer)

1. **Tafsir pra-registrasi**: masalah makna = ≥ 2 dari 3 penguji kartu pada butir yang sama (bukan satu penguji); jalan 2 hanya bila jalan 1 tidak terbit; draf yang diuji = jalan pertama yang terbit, atau omongan dikunci jalan terakhir.
2. **Label BETUL/KELIRU per posisi ditetapkan kode** (sha256 id paket, 6 pola yang memuat keduanya), kartu dihitung kode, dan angka andaian di pesan dilarang (lebih ketat dari validator) — supaya klaim KELIRU pun memakai nilai nyata dari bank.
3. **Aturan pelonggaran D-6 dibandingkan sebagai porsi** (> 4/6 dari soal aman yang TERUKUR) — ditambahkan sesudah kalibrasi berhenti di pagu dengan 4 dari 6 soal aman terukur; tanpa itu (hitungan mutlak 3 ≤ 4) tidak ada yang dilonggarkan. Akibatnya pilihan-saja dilonggarkan (rata-rata yakin ≥ 60) — ini melepas tangkapan satu-satunya atas omongan TIRT M2d-6 o1 (c/55, c/60), tetapi membuat keenam soal manusia lolos pilihan-saja (sebelumnya ULTJ "siapa-yang-membeli" ditolak).
4. **Perubahan di antara jalan 1 dan jalan 2** (commit `5c6be07`, ambang gerbang tidak diubah): meresmikan dan G-angka-cukup menulis ulang keempat pilihan (bukan kunci saja); alternatif kunci menawarkan rujukan lain ke fakta sudut; permintaan pilihan menyebut angka pesan eksplisit; klaim BETUL tidak wajib angka persis; kritikus `max_tokens` 16.000 → 24.000 lewat aturan probe yang sama atas probe + kritikus jalan 1. Jalan 2 karena itu bukan pengulangan jalan 1 yang identik.
5. **`provider.order: ["wafer"]`** untuk GLM dari bukti ledger: 60 dari 60 panggilan GLM M2d-7 dilayani Wafer (US$1,83 dari US$2,31) — ketergantungan pada satu penyedia.

### Keterbatasan

- n sangat kecil: kalibrasi 7 soal inti terukur; dua jalan TIRT; nol omongan yang diuji di luar — tidak ada angka tebak buta luar M2d-7.
- Probe `"max"` atas 3 omongan sederhana memberi gambaran yang terlalu baik tentang penalaran kritikus.
- Ledger mencatat DeepSeek di Wafer melewati `reasoning.max_tokens` (5.617 > 4.000 di kalibrasi); tidak dikecualikan (tidak diminta kontrak, pengaruhnya hanya biaya kecil).
- Tidak ada panggilan Sectors; `web/`, `server/`, `cases/`, `factory/verifikasi/`, `factory/kasus/`, `alat/`, `deploy/` tidak disentuh; draf tidak dipasang ke produk.
