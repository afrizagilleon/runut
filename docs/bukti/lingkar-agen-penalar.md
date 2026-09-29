# Bukti: penalar sungguhan di lingkar agen TIRT (M2d-6)

Berkas ini ditulis oleh `npm run penalar:laporan` dari keluaran mentah di `eval/keluaran-m2d6/` (probe, bukti penyedia, matriks kalibrasi, kalibrasi kritikus, riwayat dan jejak jalan TIRT, jawaban mentah penguji luar), ledger OpenRouter (biaya NYATA `usage.cost`), dan keluaran M2d-5. Semua angka dihitung ulang tiap kali perintah itu dijalankan; hanya bagian "Catatan penulis" yang ditulis tangan (`eval/keluaran-m2d6/laporan-tangan.md`). Draf **tidak** dipasang ke produk.

## Temuan: gerbang yang tidak berpikir (data ledger M2d-5)

Di M2d-5 medan `reasoning.max_tokens` dikirim ke semua peran penalar, tetapi `max_tokens` penalaran hanyalah BATAS atas. Yang dilaporkan penyedia (`usage.completion_tokens_details.reasoning_tokens`, jalan TIRT M2d-5):

| peran | panggilan | penalaran median | penalaran maks |
|---|---:|---:|---:|
| kritikus | 9 | 84 | 260 |
| penebak GLM | 9 | 25 | 123 |
| penebak DeepSeek | 18 | 5391 | 15344 |
| pembaca-kartu | 10 | 554 | 3796 |
| penulis | 13 | 13035 | 20000 |

- Kritikus GLM: 9 putusan, **0 keberatan**. Pembanding Featherless M2d-4: kritikus GLM 47 panggilan, token keluar median 17678 (Featherless tidak melaporkan token penalaran terpisah; keluaran kritikus hampir seluruhnya penalaran).
- Penebak GLM di M2d-5 berpikir 0–123 token; di uji luar 2 dari 3 omongan yang lolos semua gerbang di dalam tertebak penguji luar tanpa kartu.
- Gerbang yang tampak ada tetapi tidak bekerja: kritikus dan penebak GLM "menjawab", tetapi tanpa berpikir. Tidak ada gerbang yang memeriksa bukti berpikir — itu yang dibetulkan di M2d-6.

## Metode M2d-6 (semua ditetapkan kode, `GENERASI_M2D6`)

- **D-1 GLM wajib berpikir.** Kritikus dan penebak GLM meminta `reasoning.effort: "high"`; kritikus `max_tokens` 24000, ambang 1000 token penalaran; penebak GLM `max_tokens` 8000, ambang 300. Penjaga (`penjaga-penalaran.ts`): token penalaran di bawah ambang atau tidak dilaporkan = tidak sah → diulang sekali dengan penyedia itu di `provider.ignore` → bila tetap tidak sah, kritikus "tidak menjawab" / tebakan dihitung benar/100 (menolak).
- **D-2 Penyedia berdasar bukti.** `provider.ignore` = `deepseek/deepseek-v4.1-flash`: `atlas-cloud`; `z-ai/glm-5.3`: `akashml`, `alibaba`, `atlas-cloud`, `baidu`, `gmicloud`, `inference-net`, `morph`, `novita`, `reka`, `relace`, `sail-research`, `z-ai` — diturunkan kode dari cuplikan ledger (`eval/keluaran-m2d6/bukti-penyedia.json`): ≥ 2 pelanggaran dan ≥ 0,33 dari panggilan yang bisa melanggar. Pagar M2d-5 lain tetap.
- **D-4 G-pilihan-kembar** di pemeriksa: dua pilihan satu omongan yang isinya sama sesudah normalisasi, atau kemiripan ≥ 0,889 (titik tengah antara kemiripan manusia terbesar 0,778 — cases/dada-2025-10-08.json soal 3 a–b — dan 1) → ditolak.
- **D-3 Penebak** = susunan terpilih kalibrasi (K3).

## Probe penalar (D-1)

Putusan: `eval/keluaran-m2d6/probe/putusan.md`.

| panggilan | effort | penyedia | token penalaran | biaya | hasil |
|---|---|---|---:|---:|---|
| p1/kritikus/high-1 | high | Wafer | 3678 | US$0.0180 | 1 keberatan (bahasa); tak tercek 0; juga benar - |
| p1/kritikus/high-2 | high | PrimeIntellect | 1731 | US$0.0116 | 1 keberatan (tertebak); tak tercek 0; juga benar - |
| p1/kritikus/high-3 | high | Wafer | 7611 | US$0.0354 | 1 keberatan (tertebak); tak tercek 0; juga benar - |
| p1/kritikus/high-4 | high | Wafer | 5126 | US$0.0239 | 0 keberatan (-); tak tercek 0; juga benar - |
| p1/penebak-glm/high-1 | high | Relace | 685 | US$0.0030 | a/45 (kunci d) |
| p1/penebak-glm/high-2 | high | InferenceNet | 267 | US$0.0010 | b/55 (kunci d) |
| p1/penebak-glm/high-3 | high | InferenceNet | 98 | US$0.0004 | a/60 (kunci d) |
| p1/penebak-glm/high-4 | high | InferenceNet | 263 | US$0.0008 | b/45 (kunci d) |
| p1/kritikus/medium-1 | medium | Wafer | 125 | US$0.0019 | 0 keberatan (-); tak tercek 0; juga benar - |
| p1/kritikus/medium-2 | medium | Wafer | 20 | US$0.0012 | 0 keberatan (-); tak tercek 0; juga benar - |
| p1/kritikus/medium-3 | medium | Wafer | 238 | US$0.0022 | 0 keberatan (-); tak tercek 0; juga benar - |
| p1/penebak-glm/medium-1 | medium | InferenceNet | 175 | US$0.0008 | b/55 (kunci d) |
| p1/penebak-glm/medium-2 | medium | InferenceNet | 0 | US$0.0002 | a/55 (kunci d) |
| p1/penebak-glm/medium-3 | medium | InferenceNet | 0 | US$0.0002 | tak terbaca |
| p2/penebak-glm/high-1 | high | InferenceNet | 181 | US$0.0007 | a/55 (kunci d) |
| p2/penebak-glm/high-2 | high | InferenceNet | 628 | US$0.0016 | b/40 (kunci d) |
| p2/penebak-glm/high-3 | high | InferenceNet | 311 | US$0.0010 | b/55 (kunci d) |
| p2/penebak-glm/high-4 | high | InferenceNet | 60 | US$0.0004 | a/55 (kunci d) |
| p2/penebak-glm/high-5 | high | InferenceNet | 111 | US$0.0005 | a/50 (kunci d) |
| p2/penebak-glm/high-6 | high | InferenceNet | 329 | US$0.0009 | b/55 (kunci d) |
| p2/kritikus/high-1 | high | Wafer | 11880 | US$0.0542 | 1 keberatan (tertebak); tak tercek 0; juga benar - |
| p2/kritikus/high-2 | high | Wafer | 11040 | US$0.0508 | 2 keberatan (tertebak,bahasa); tak tercek 0; juga benar - |
| p2/kritikus/high-3 | high | Wafer | 6457 | US$0.0299 | 1 keberatan (tertebak); tak tercek 0; juga benar - |
| p3/penebak-glm/high-1 | high | Relace | 161 | US$0.0010 | b/60 (kunci d) |
| p3/penebak-glm/high-2 | high | Sail Research | 340 | US$0.0016 | b/45 (kunci d) |
| p3/penebak-glm/high-3 | high | Parasail | 371 | US$0.0025 | b/55 (kunci d) |
| p3/penebak-glm/high-4 | high | Sail Research | 615 | US$0.0024 | b/65 (kunci d) |
| p3/kritikus/high-1 | high | Wafer | 6589 | US$0.0304 | 0 keberatan (-); tak tercek 0; juga benar - |
| p3/kritikus/high-2 | high | Wafer | 7296 | US$0.0339 | 1 keberatan (tertebak); tak tercek 0; juga benar - |

## Penyedia yang dikecualikan (D-2) — bukti ledger

| model · penyedia | panggilan yang bisa melanggar | pelanggaran | jenis | dikecualikan |
|---|---:|---:|---|---|
| deepseek/deepseek-v4.1-flash · AtlasCloud | 16 | 10 | melewati-batas | **ya** (`atlas-cloud`) |
| deepseek/deepseek-v4.1-flash · CoreWeave | 5 | 0 | — | tidak |
| deepseek/deepseek-v4.1-flash · DeepInfra | 3 | 0 | — | tidak |
| deepseek/deepseek-v4.1-flash · Together | 2 | 0 | — | tidak |
| z-ai/glm-5.3 · Sail Research | 35 | 19 | tidak-berpikir | **ya** (`sail-research`) |
| z-ai/glm-5.3 · Reka | 16 | 13 | tidak-berpikir | **ya** (`reka`) |
| z-ai/glm-5.3 · AtlasCloud | 9 | 8 | tidak-berpikir | **ya** (`atlas-cloud`) |
| z-ai/glm-5.3 · Relace | 13 | 8 | tidak-berpikir | **ya** (`relace`) |
| z-ai/glm-5.3 · InferenceNet | 9 | 6 | tidak-berpikir | **ya** (`inference-net`) |
| z-ai/glm-5.3 · Novita | 5 | 4 | tidak-berpikir | **ya** (`novita`) |
| z-ai/glm-5.3 · Wafer | 64 | 4 | tidak-berpikir | tidak |
| z-ai/glm-5.3 · Alibaba | 5 | 3 | tidak-berpikir | **ya** (`alibaba`) |
| z-ai/glm-5.3 · AkashML | 3 | 2 | tidak-berpikir | **ya** (`akashml`) |
| z-ai/glm-5.3 · Baidu | 2 | 2 | tidak-berpikir | **ya** (`baidu`) |
| z-ai/glm-5.3 · GMICloud | 4 | 2 | tidak-berpikir | **ya** (`gmicloud`) |
| z-ai/glm-5.3 · Morph | 7 | 2 | tidak-berpikir | **ya** (`morph`) |
| z-ai/glm-5.3 · Z.AI | 2 | 2 | tidak-berpikir | **ya** (`z-ai`) |
| z-ai/glm-5.3 · Cloudflare | 1 | 1 | tidak-berpikir | tidak |
| z-ai/glm-5.3 · Fireworks | 2 | 1 | tidak-berpikir | tidak |
| z-ai/glm-5.3 · Modal | 2 | 1 | tidak-berpikir | tidak |
| z-ai/glm-5.3 · Phala | 4 | 1 | tidak-berpikir | tidak |
| z-ai/glm-5.3 · SiliconFlow | 1 | 1 | tidak-berpikir | tidak |
| z-ai/glm-5.3 · Venice | 2 | 1 | tidak-berpikir | tidak |
| z-ai/glm-5.3 · Friendli | 3 | 0 | — | tidak |
| z-ai/glm-5.3 · Parasail | 1 | 0 | — | tidak |
| z-ai/glm-5.3 · PrimeIntellect | 1 | 0 | — | tidak |

Bukti deepseek/deepseek-v4.1-flash · AtlasCloud:

- `m2d5/probe/penulis/r8000` (2026-09-29T04:47:33.583Z): penalaran 14000 > batas 8000
- `m2d5/probe/p2/penulis/r16000-b` (2026-09-29T04:52:51.522Z): penalaran 24000 > batas 16000
- `m2d5/tirt/p1/susun/o1` (2026-09-29T04:58:48.781Z): penalaran 16881 > batas 12000
- `m2d5/tirt/p1/susun/o2` (2026-09-29T05:00:36.691Z): penalaran 14550 > batas 12000
- `m2d5/tirt/p2/tulis-ulang/o2` (2026-09-29T05:11:20.582Z): penalaran 20000 > batas 12000
- `m2d5/tirt/p2/tulis-ulang/o3` (2026-09-29T05:14:04.634Z): penalaran 20000 > batas 12000
- `m2d5/tirt/p3/tulis-ulang/o1` (2026-09-29T05:21:56.669Z): penalaran 19751 > batas 12000
- `m2d5/tirt/p3/tulis-ulang/o3` (2026-09-29T05:23:36.366Z): penalaran 13035 > batas 12000
- `m2d5/tirt/p4/tulis-ulang/o1` (2026-09-29T05:28:27.862Z): penalaran 15212 > batas 12000
- `m2d5/tirt/p4/tulis-ulang/o3` (2026-09-29T05:29:55.078Z): penalaran 12517 > batas 12000

Bukti z-ai/glm-5.3 · Sail Research:

- `m2d6/kalibrasi/K1/s1/m2d4-ultj-o1/penebak/t3/u1` (2026-09-29T06:40:39.205Z): effort "high" diminta, penalaran 48 < ambang 300
- `m2d6/kalibrasi/K1/s1/m2d4-tirt-o3/penebak/t3/u1` (2026-09-29T06:42:19.102Z): effort "high" diminta, penalaran 126 < ambang 300
- `m2d6/kalibrasi/K1/s1/m2d4-ultj-o3/penebak/t3` (2026-09-29T06:42:34.490Z): effort "high" diminta, penalaran 41 < ambang 300
- `m2d6/kalibrasi/K1/s1/m2d4-ultj-o2/penebak/t3/u1` (2026-09-29T06:44:03.219Z): effort "high" diminta, penalaran 136 < ambang 300
- `m2d6/kalibrasi/K2/s1/m2d5-tirt-o2/penebak/t3` (2026-09-29T06:47:35.590Z): effort "high" diminta, penalaran 75 < ambang 300
- `m2d6/kalibrasi/K2/s1/m2d4-tirt-o3/penebak/t3` (2026-09-29T06:48:23.304Z): effort "high" diminta, penalaran 168 < ambang 300
- `m2d6/kalibrasi/K2/s1/m2d5-tirt-o1/penebak/t3/u1` (2026-09-29T06:51:15.975Z): effort "high" diminta, penalaran 270 < ambang 300
- `m2d6/kalibrasi/K2/s1/m2d4-ultj-o3/penebak/t3` (2026-09-29T06:51:53.004Z): effort "high" diminta, penalaran 78 < ambang 300
- `m2d6/kalibrasi/K3/s1/m2d4-tirt-o3/penebak/t1` (2026-09-29T06:51:56.463Z): effort "high" diminta, penalaran 45 < ambang 300
- `m2d6/kalibrasi/K3/s1/m2d4-tirt-o1/penebak/t1` (2026-09-29T06:51:56.956Z): effort "high" diminta, penalaran 1 < ambang 300
- `m2d6/kalibrasi/K3/s1/m2d5-tirt-o2/penebak/t1` (2026-09-29T06:51:57.884Z): effort "high" diminta, penalaran 125 < ambang 300
- `m2d6/kalibrasi/K3/s1/m2d4-tirt-o3/penebak/t2` (2026-09-29T06:52:00.416Z): effort "high" diminta, penalaran 173 < ambang 300
- `m2d6/kalibrasi/K3/s1/m2d4-tirt-o3/penebak/t3` (2026-09-29T06:52:03.516Z): effort "high" diminta, penalaran 55 < ambang 300
- `m2d6/kalibrasi/K3/s1/m2d5-tirt-o3/penebak/t1` (2026-09-29T06:52:04.569Z): effort "high" diminta, penalaran 180 < ambang 300
- `m2d6/kalibrasi/K3/s1/m2d5-tirt-o2/penebak/t2` (2026-09-29T06:52:16.559Z): effort "high" diminta, penalaran 239 < ambang 300
- `m2d6/kalibrasi/K3/s1/m2d4-dada-o2/penebak/t2` (2026-09-29T06:52:26.158Z): effort "high" diminta, penalaran 49 < ambang 300
- `m2d6/kalibrasi/K3/s1/m2d4-tirt-o1/penebak/t3` (2026-09-29T06:52:30.986Z): effort "high" diminta, penalaran 38 < ambang 300
- `m2d6/kalibrasi/K3/s1/m2d4-ultj-o3/penebak/t1/u1` (2026-09-29T06:52:30.993Z): effort "high" diminta, penalaran 41 < ambang 300
- `m2d6/kalibrasi/K3/s1/m2d4-ultj-o3/penebak/t2` (2026-09-29T06:52:34.150Z): effort "high" diminta, penalaran 1 < ambang 300

Bukti z-ai/glm-5.3 · Reka:

- `m2d6/kalibrasi/K1/s1/m2d4-ultj-o2/penebak/t3` (2026-09-29T06:44:01.606Z): effort "high" diminta, penalaran 50 < ambang 300
- `m2d6/kalibrasi/K2/s1/m2d5-tirt-o2/penebak/t3/u1` (2026-09-29T06:47:58.350Z): effort "high" diminta, penalaran 23 < ambang 300
- `m2d6/kalibrasi/K2/s1/m2d4-tirt-o3/penebak/t3/u1` (2026-09-29T06:48:31.289Z): effort "high" diminta, penalaran 58 < ambang 300
- `m2d6/kalibrasi/K2/s1/m2d4-tirt-o1/penebak/t3` (2026-09-29T06:48:52.654Z): effort "high" diminta, penalaran 24 < ambang 300
- `m2d6/kalibrasi/K2/s1/m2d4-ultj-o2/penebak/t3` (2026-09-29T06:49:14.137Z): effort "high" diminta, penalaran 115 < ambang 300
- `m2d6/kalibrasi/K2/s1/m2d4-dada-o1/penebak/t3` (2026-09-29T06:51:08.333Z): effort "high" diminta, penalaran 128 < ambang 300
- `m2d6/kalibrasi/K3/s1/m2d5-tirt-o2/penebak/t1/u1` (2026-09-29T06:52:12.597Z): effort "high" diminta, penalaran 186 < ambang 300
- `m2d6/kalibrasi/K3/s1/m2d4-dada-o2/penebak/t1` (2026-09-29T06:52:21.363Z): effort "high" diminta, penalaran 46 < ambang 300
- `m2d6/kalibrasi/K3/s1/m2d4-tirt-o1/penebak/t1/u1` (2026-09-29T06:52:25.032Z): effort "high" diminta, penalaran 29 < ambang 300
- `m2d6/kalibrasi/K3/s1/m2d4-ultj-o3/penebak/t1` (2026-09-29T06:52:26.406Z): effort "high" diminta, penalaran 47 < ambang 300
- `m2d6/kalibrasi/K3/s1/m2d4-tirt-o1/penebak/t2/u1` (2026-09-29T06:52:28.653Z): effort "high" diminta, penalaran 47 < ambang 300
- `m2d6/kalibrasi/K3/s1/m2d4-dada-o2/penebak/t2/u1` (2026-09-29T06:52:29.027Z): effort "high" diminta, penalaran 35 < ambang 300
- `m2d6/kalibrasi/K3/s1/m2d4-dada-o2/penebak/t3` (2026-09-29T06:52:33.548Z): effort "high" diminta, penalaran 22 < ambang 300

Bukti z-ai/glm-5.3 · AtlasCloud:

- `m2d6/kalibrasi/K2/s1/m2d4-ultj-o1/penebak/t3/u1` (2026-09-29T06:49:34.485Z): effort "high" diminta, penalaran 227 < ambang 300
- `m2d6/kalibrasi/K1/s2/m2d4-tirt-o1/penebak/t3` (2026-09-29T07:10:55.432Z): effort "high" diminta, penalaran 49 < ambang 300
- `m2d6/kalibrasi/K1/s2/m2d4-ultj-o1/penebak/t3/u1` (2026-09-29T07:10:59.168Z): effort "high" diminta, penalaran 205 < ambang 300
- `m2d6/kalibrasi/K1/s2/m2d4-dada-o2/penebak/t3` (2026-09-29T07:12:33.519Z): effort "high" diminta, penalaran 184 < ambang 300
- `m2d6/kalibrasi/K1/s2/m2d5-tirt-o3/penebak/t3/u1` (2026-09-29T07:12:43.323Z): effort "high" diminta, penalaran 52 < ambang 300
- `m2d6/kalibrasi/K2/s2/m2d4-dada-o2/penebak/t3/u1` (2026-09-29T07:19:30.376Z): effort "high" diminta, penalaran 55 < ambang 300
- `m2d6/kritikus/m2d5-tirt-o3/s1/kritikus/u1` (2026-09-29T07:30:49.644Z): effort "high" diminta, penalaran 537 < ambang 1000
- `m2d6/kritikus/m2d5-tirt-o2/s1/kritikus` (2026-09-29T07:35:06.373Z): effort "high" diminta, penalaran 486 < ambang 1000

Bukti z-ai/glm-5.3 · Relace:

- `m2d6/probe/p3/penebak-glm/high-1` (2026-09-29T06:20:36.751Z): effort "high" diminta, penalaran 161 < ambang 300
- `m2d6/kalibrasi/K1/s1/m2d4-ultj-o1/penebak/t3` (2026-09-29T06:40:37.765Z): effort "high" diminta, penalaran 48 < ambang 300
- `m2d6/kalibrasi/K1/s1/m2d4-ultj-o3/penebak/t3/u1` (2026-09-29T06:42:36.954Z): effort "high" diminta, penalaran 70 < ambang 300
- `m2d6/kalibrasi/K1/s1/m2d4-dada-o1/penebak/t3` (2026-09-29T06:45:39.254Z): effort "high" diminta, penalaran 62 < ambang 300
- `m2d6/kalibrasi/K2/s1/m2d5-tirt-o1/penebak/t3` (2026-09-29T06:51:12.087Z): effort "high" diminta, penalaran 52 < ambang 300
- `m2d6/kalibrasi/K2/s1/m2d4-ultj-o3/penebak/t3/u1` (2026-09-29T06:51:55.237Z): effort "high" diminta, penalaran 85 < ambang 300
- `m2d6/kalibrasi/K3/s1/m2d4-tirt-o3/penebak/t1/u1` (2026-09-29T06:51:58.599Z): effort "high" diminta, penalaran 101 < ambang 300
- `m2d6/kalibrasi/K3/s1/m2d4-dada-o2/penebak/t1/u1` (2026-09-29T06:52:24.408Z): effort "high" diminta, penalaran 114 < ambang 300

Bukti z-ai/glm-5.3 · InferenceNet:

- `m2d6/probe/p1/penebak-glm/high-2` (2026-09-29T06:15:54.164Z): effort "high" diminta, penalaran 267 < ambang 300
- `m2d6/probe/p1/penebak-glm/high-3` (2026-09-29T06:15:55.303Z): effort "high" diminta, penalaran 98 < ambang 300
- `m2d6/probe/p1/penebak-glm/high-4` (2026-09-29T06:15:56.978Z): effort "high" diminta, penalaran 263 < ambang 300
- `m2d6/probe/p2/penebak-glm/high-1` (2026-09-29T06:16:45.528Z): effort "high" diminta, penalaran 181 < ambang 300
- `m2d6/probe/p2/penebak-glm/high-4` (2026-09-29T06:16:51.850Z): effort "high" diminta, penalaran 60 < ambang 300
- `m2d6/probe/p2/penebak-glm/high-5` (2026-09-29T06:16:53.363Z): effort "high" diminta, penalaran 111 < ambang 300

Bukti z-ai/glm-5.3 · Novita:

- `m2d6/kalibrasi/K1/s1/m2d4-tirt-o1/penebak/t3` (2026-09-29T06:42:59.512Z): effort "high" diminta, penalaran 60 < ambang 300
- `m2d6/kalibrasi/K1/s2/m2d4-ultj-o3/penebak/t3` (2026-09-29T07:11:26.602Z): effort "high" diminta, penalaran 34 < ambang 300
- `m2d6/kalibrasi/K2/s2/m2d5-tirt-o3/penebak/t3` (2026-09-29T07:19:18.669Z): effort "high" diminta, penalaran 193 < ambang 300
- `m2d6/kalibrasi/K3/s2/m2d5-tirt-o3/penebak/t2` (2026-09-29T07:28:12.651Z): effort "high" diminta, penalaran 181 < ambang 300

Bukti z-ai/glm-5.3 · Alibaba:

- `m2d6/kalibrasi/K2/s1/m2d4-ultj-o1/penebak/t3` (2026-09-29T06:49:28.523Z): effort "high" diminta, penalaran 58 < ambang 300
- `m2d6/kalibrasi/K1/s2/m2d5-tirt-o2/penebak/t3/u1` (2026-09-29T07:15:52.346Z): effort "high" diminta, penalaran 164 < ambang 300
- `m2d6/kalibrasi/K2/s2/m2d4-tirt-o1/penebak/t3/u1` (2026-09-29T07:18:25.983Z): effort "high" diminta, penalaran 14 < ambang 300

Bukti z-ai/glm-5.3 · AkashML:

- `m2d6/kalibrasi/K3/s1/m2d4-tirt-o3/penebak/t2/u1` (2026-09-29T06:52:02.000Z): effort "high" diminta, penalaran 67 < ambang 300
- `m2d6/kalibrasi/K1/s2/m2d4-dada-o2/penebak/t3/u1` (2026-09-29T07:12:37.002Z): effort "high" diminta, penalaran 37 < ambang 300

Bukti z-ai/glm-5.3 · Baidu:

- `m2d6/kalibrasi/K1/s1/m2d4-dada-o1/penebak/t3/u1` (2026-09-29T06:45:42.118Z): effort "high" diminta, penalaran 35 < ambang 300
- `m2d6/kalibrasi/K1/s2/m2d5-tirt-o3/penebak/t3` (2026-09-29T07:12:39.761Z): effort "high" diminta, penalaran 0 < ambang 300

Bukti z-ai/glm-5.3 · GMICloud:

- `m2d6/kalibrasi/K1/s1/m2d4-tirt-o3/penebak/t3` (2026-09-29T06:42:17.150Z): effort "high" diminta, penalaran 76 < ambang 300
- `m2d6/kalibrasi/K1/s2/m2d5-tirt-o2/penebak/t3` (2026-09-29T07:15:46.632Z): effort "high" diminta, penalaran 1 < ambang 300

Bukti z-ai/glm-5.3 · Morph:

- `m2d6/kalibrasi/K2/s1/m2d4-tirt-o1/penebak/t3/u1` (2026-09-29T06:48:55.833Z): effort "high" diminta, penalaran 89 < ambang 300
- `m2d6/kalibrasi/K3/s1/m2d4-dada-o2/penebak/t3/u1` (2026-09-29T06:52:36.641Z): effort "high" diminta, penalaran 60 < ambang 300

Bukti z-ai/glm-5.3 · Z.AI:

- `m2d6/kalibrasi/K1/s2/m2d4-ultj-o1/penebak/t3` (2026-09-29T07:10:53.670Z): effort "high" diminta, penalaran 32 < ambang 300
- `m2d6/kalibrasi/K2/s2/m2d5-tirt-o3/penebak/t3/u1` (2026-09-29T07:19:26.698Z): effort "high" diminta, penalaran 187 < ambang 300

## Kalibrasi penebak dengan soal yang sudah diketahui (D-3)

Bocor = ditolak K-05 oleh penguji luar Opus; aman = lolos tebak buta luar. Label diturunkan dari jawaban mentah penguji luar (dites). Kriteria per soal = K-05 lingkar (≥ 2/3 benar atau rata-rata yakin yang benar ≥ 40 → ditolak). Aturan pilih: tangkap soal bocor sebanyak mungkin, lalu tolak soal aman sesedikit mungkin, lalu termurah.

| susunan | sampel | bocor ditolak | aman ditolak | biaya | ringkas |
|---|---:|---:|---:|---:|---|
| K0 | 1 | 1/4 | 3/6 | US$0.0470 | M2d-5: DeepSeek ×2 + GLM reasoning.max_tokens 3.000, petunjuk "pemain pintar" |
| K1 | 2 | 6/8 | 9/12 | US$0.1496 | DeepSeek ×2 + GLM effort high (dijaga), petunjuk "pemain pintar" |
| K2 | 1 | 4/4 | 6/6 | US$0.0707 | DeepSeek ×2 + GLM effort high (dijaga), petunjuk "pemburu soal bocor" |
| **K3** | 1 | 4/4 | 4/6 | US$0.1372 | GLM effort high ×3 (dijaga), petunjuk "pemburu soal bocor" |
| K4 | 1 | 3/4 | 4/6 | US$0.0747 | DeepSeek ×3, petunjuk "pemburu soal bocor" |

| soal | kelompok | uji luar | K0-s1 | K1-s1 | K1-s2 | K2-s1 | K3-s1 | K3-s2 | K4-s1 |
|---|---|---|---|---|---|---|---|---|---|
| m2d5-tirt-o2 (kunci d) | bocor | d/40 · d/40 · d/40 (3/3 benar) | lolos (b/60 a/55 a/45) | **tolak** (b/60 b/65 d/45) | **tolak** (b/60 d/60 d/100!) | **tolak** (d/78 d/86 d/100!) | **tolak** (d/100! d/100! d/60) | — | **tolak** (d/70 d/78 d/88) |
| m2d5-tirt-o3 (kunci d) | bocor | d/55 · d/60 · d/55 (3/3 benar) | lolos (a/65 a/55 b/65) | lolos (a/60 a/60 b/60) | **tolak** (a/60 b/60 d/100!) | **tolak** (b/55 d/60 b/45) | **tolak** (d/35 d/40 b/45) | **tolak** (d/45 d/55 a/55) | lolos (b/65 b/60 b/58) |
| m2d4-tirt-o3 (kunci a) | bocor | b/55 · a/40 · b/55 (1/3 benar, yakin 40) | lolos (b/60 b/80 b/40) | **tolak** (b/60 a/80 a/100!) | **tolak** (b/65 a/85 b/65) | **tolak** (b/85 a/85 a/100!) | **tolak** (a/100! a/100! a/60) | **tolak** (a/65 a/55 a/60) | **tolak** (a/75 a/72 b/60) |
| m2d4-tirt-o1 (kunci a) | bocor | b/50 · a/50 · b/50 (1/3 benar, yakin 50) | **tolak** (b/60 b/65 a/60) | **tolak** (b/65 b/60 a/100!) | lolos (b/70 b/65 b/60) | **tolak** (a/70 a/60 a/100!) | **tolak** (a/100! a/100! a/100!) | — | **tolak** (a/60 a/70 a/60) |
| m2d4-ultj-o1 (kunci c) | aman | b/45 · b/55 · b/50 (0/3) | lolos (b/58 b/60 b/55) | **tolak** (c/60 b/55 c/100!) | **tolak** (b/65 b/60 c/100!) | **tolak** (c/60 c/70 c/100!) | **tolak** (c/65 c/60 c/55) | — | **tolak** (c/75 c/70 c/65) |
| m2d4-ultj-o2 (kunci a) | aman | b/45 · b/40 · b/40 (0/3) | **tolak** (b/65 a/65 a/55) | **tolak** (b/65 a/62 a/100!) | **tolak** (b/60 b/70 a/55) | **tolak** (a/78 a/60 a/60) | **tolak** (a/60 a/60 a/40) | — | **tolak** (a/85 a/60 a/65) |
| m2d4-ultj-o3 (kunci a) | aman | b/55 · b/45 · b/55 (0/3) | lolos (b/70 b/65 b/70) | **tolak** (b/65 b/65 a/100!) | **tolak** (b/60 b/62 a/100!) | **tolak** (b/65 b/70 a/100!) | **tolak** (a/100! a/45 b/60) | — | **tolak** (b/65 a/70 b/65) |
| m2d4-dada-o2 (kunci b) | aman | d/45 · d/40 · d/40 (0/3) | **tolak** (b/62 d/55 b/60) | lolos (d/60 c/40 d/40) | **tolak** (c/40 d/65 b/100!) | **tolak** (b/65 b/70 b/62) | **tolak** (b/100! b/100! b/100!) | — | **tolak** (b/62 b/70 b/74) |
| m2d4-dada-o1 (kunci a) | aman | c/60 · c/35 · c/55 (0/3) | lolos (c/61 c/78 c/45) | **tolak** (c/70 c/65 a/100!) | lolos (c/75 c/75 c/55) | **tolak** (a/60 c/75 a/28) | lolos (c/55 b/85 c/60) | — | lolos (c/72 b/65 c/60) |
| m2d5-tirt-o1 (kunci c) | aman | b/40 · b/35 · c/30 (1/3 benar, yakin 30) | **tolak** (b/60 b/60 c/55) | lolos (b/75 b/65 b/58) | **tolak** (b/60 c/60 b/60) | **tolak** (b/65 b/65 c/100!) | lolos (b/55 b/55 b/55) | — | lolos (b/70 b/65 b/70) |

Pilihan aturan: **K3**. Susunan: K0 = M2d-5: DeepSeek ×2 + GLM reasoning.max_tokens 3.000, petunjuk "pemain pintar"; K1 = DeepSeek ×2 + GLM effort high (dijaga), petunjuk "pemain pintar"; K2 = DeepSeek ×2 + GLM effort high (dijaga), petunjuk "pemburu soal bocor"; K3 = GLM effort high ×3 (dijaga), petunjuk "pemburu soal bocor"; K4 = DeepSeek ×3, petunjuk "pemburu soal bocor". `!` = tebakan tak terbaca/tidak terbukti berpikir (dihitung benar/100).

## Kalibrasi kritikus (D-5)

Kritikus M2d-6 atas draf TIRT M2d-5 (terbit, gagal uji luar), US$0.1303:

| omongan | sampel | G-pilihan-kembar | kritikus | penalaran (penyedia) |
|---:|---:|---|---|---|
| 3 | 1 | **menolak** (a–b) | **tidak menjawab** | 597 (Cloudflare), 537 (AtlasCloud) |
| 3 | 2 | **menolak** (a–b) | tanpa keberatan | 566 (Fireworks), 5777 (Wafer) |
| 3 | 3 | **menolak** (a–b) | tanpa keberatan | 1538 (Fireworks) |
| 1 | 1 | lolos | tanpa keberatan | 15598 (Wafer) |
| 2 | 1 | lolos | tanpa keberatan | 486 (AtlasCloud), 1119 (Alibaba) |

## Hasil TIRT (D-6)

| jalan | hasil | putaran | versi diperiksa | omongan dikunci | panggilan | biaya NYATA | waktu |
|---:|---|---:|---:|---:|---:|---:|---:|
| 1 | tidak terbit (omongan 3 gagal di 3 sudut (rups-2025-09-25, kelipatan-2025-11-26-2025-12-09, hari-naik-beruntun); simulasi tidak terbit) | 15 | 26 | 2 | 133 | US$1.8384 | 142,9 menit |

### Jalan 1

- omongan 1: 1. `susp-2025-12-10` → dibuang (1–5); 2. `susp-2025-01-21` → lolos (6–8)
- omongan 2: 1. `naik-2025-11-26-2025-12-09` → lolos (1–3)
- omongan 3: 1. `rups-2025-09-25` → dibuang (1–5); 2. `kelipatan-2025-11-26-2025-12-09` → dibuang (6–10); 3. `hari-naik-beruntun` → dibuang (11–15)
- Status per versi: ditolak-tebak 10, tidak-ada 3, ditolak-kartu 1, lolos 2, ditolak-kritikus 5, kritikus-tidak-menjawab 3, ditolak-pemeriksa 2.
- Penolakan pemeriksa per kode: AJAKAN_TRANSAKSI 1, ANGKA_TANPA_RUJUKAN 1; G-pilihan-kembar menolak 0 versi.
- Kritikus: 20 putusan, menjawab 17, tanpa keberatan 12; keberatan per jenis: tertebak 5, aturan 1, tidak-menjawab 3, kunci 1, ambigu 1; penalaran median 6588 (maks 24002).
- Penjaga penalaran: 80 panggilan dijaga, 26 tidak sah (z-ai/glm-5.3 · SiliconFlow 5, z-ai/glm-5.3 · Wafer 4, z-ai/glm-5.3 · Phala 10, z-ai/glm-5.3 · PrimeIntellect 1, z-ai/glm-5.3 · Modal 1, z-ai/glm-5.3 · DigitalOcean 1, z-ai/glm-5.3 · Venice 1, z-ai/glm-5.3 · Together 1, z-ai/glm-5.3 · Parasail 1, z-ai/glm-5.3 · Friendli 1); ulangan yang melewati penyedia: 18. Penebak GLM: penalaran median 484.
- Penebak di dalam (benar tanpa kartu / tebakan): `z-ai/glm-5.3` 13/36 (+10 tak terbaca).
- Penulis: 32 panggilan, terpotong/kosong 9, cadangan 9.

### Draf

Jalan 1: TIRT tidak terbit; omongan yang dikunci (2):

**Omongan 1** (dikunci di putaran 8, sudut `susp-2025-01-21`)

> **Sari (19.20):** Aku panik, sahamnya kena setop bursa hari ini! Awal tahun juga kena setop, katanya karena harga naik terus.

- a) Betul, alasan setop awal tahun kenaikan harga.
- b) Betul, setop awal tahun tidak dicatat bursa.
- **c) Keliru, setop awal tahun karena keraguan usaha.** (kunci)
- d) Keliru, setop hari ini karena keraguan usaha.

Penjelasan: Pengumuman bursa 21 Januari 2025 menyebut alasan setop awal tahun itu keraguan atas kelangsungan usaha. Alasan kenaikan harga kumulatif justru tertulis di setop 10 Desember 2025, yang terjadi hari ini. Kapan saham dibuka lagi juga tidak tercatat di kedua pengumuman itu. Salah-kaprah yang umum: semua setop bursa dikira gara-gara harga naik terus.

**Omongan 2** (dikunci di putaran 3, sudut `naik-2025-11-26-2025-12-09`)

> **Andi (20.45):** Angka 58 rupiah itu bukan harga penutupan, gw yakin itu beda dua penutupan. Gw hafal polanya.

- a) Betul, itu selisih penutupan 1 Desember dan 9 Desember.
- b) Keliru, itu harga penutupan 9 Desember.
- c) Keliru, itu harga penutupan 1 Desember.
- **d) Betul, itu selisih penutupan 26 November dan 9 Desember.** (kunci)

Penjelasan: Yang terbaca: 58 rupiah itu selisih penutupan 26 November dan 9 Desember. Itu bukan harga satu hari, karena penutupan 9 Desember sendiri 106 rupiah dan penutupan 1 Desember 62 rupiah. Jadi klaim teman bahwa angka itu beda dua penutupan cocok. Salah-kaprah yang umum: angka selisih dua penutupan dikira harga saham di satu hari.

## Uji luar (D-7)

Penguji dan penilai: subagent Claude (opus) **baru**, masing-masing hanya menerima isi satu berkas bahan (`eval/keluaran-m2d6/penguji/`); label acak; dijalankan sinkron. Jawaban mentah: `penguji/jawaban/`. Petunjuk sama dengan M2d-5 D-10.

| omongan | kunci | tebak di dalam | tebak di luar | lolos luar | kartu luar (pilihan/kartu) | K-05 kartu | membingungkan | penilaian tak tercek |
|---:|---|---|---|---|---|---|---|---|
| 1 | c | a/60, a/72, a/60 | c/55, c/50, c/50 | **tidak** | c/2, c/2, c/2 | ya | "dalam rangka cooling down sebagai bentuk perlindungan bagi investor"; "dalam rangka cooling down sebagai bentuk perlindungan bagi investor" | — |
| 2 | d | a/55, a/40, a/60 | a/35, b/35, a/30 | ya | d/1+2+3, d/1+2+3, d/1 | ya | — | "Gw hafal polanya."; "Gw hafal polanya." |

Tebak buta luar lolos 1/2; jawab-dengan-kartu K-05 2/2; kalimat membingungkan di 1 omongan; penilaian tak tercek di 1 omongan.

**Syarat layak tayang (pemilik): terbit + tebak buta luar lolos semua omongan + jawab-dengan-kartu lolos + nol masalah makna → **TIDAK terpenuhi**.**

### Kealamian bahasa (buta, penilai yang sama)

| kelompok · sumber | rata-rata |
|---|---:|
| tirt · m2d6 | 3,00 |
| tirt · m2d5 | 3,00 |
| tirt · m2d4 | 4,00 |
| ultj · manusia | 4,00 |
| ultj · m2d4 | 3,00 |

| paket | sumber | penilai | skor | alasan |
|---|---|---|---:|---|
| tirt | agen-m2d4 | alami-p1 | 4 | Pesan dan penjelasannya mengalir seperti teman yang menerangkan ("naik kebablasan", "mendinginkan harga yang naik cepat"), hanya beberapa kalimatnya panjang dan agak formal seperti bahasa dokumen. |
| tirt | agen-m2d4 | alami-p2 | 4 | Pesan, pilihan, dan penjelasannya mengalir wajar ("kebablasan", "mendinginkan harga yang naik cepat"); hanya "klaim teman ... cocok dengan dokumennya" yang masih terasa seperti rumus. |
| tirt | agen-m2d4 | alami-p3 | 4 | Pesan dan penjelasannya luwes seperti teman yang menjelaskan ('kelewat batas', 'naik kebablasan'); yang mengganjal hanya kalimat yang agak panjang dan 'salah kaprah' yang ditulis dengan tanda hubung. |
| tirt | agen-m2d5 | alami-p1 | 3 | Pesan grupnya terdengar alami, tetapi penjelasannya bertele-tele dan memakai istilah yang tidak lazim bagi penutur ("kartu penentu", "beralasan tidak sama"), sementara pilihan a dan b di soal 3 nyaris sama kalimatnya. |
| tirt | agen-m2d5 | alami-p2 | 3 | Pesan dan pilihannya terdengar seperti obrolan sungguhan, tetapi penjelasannya memuat frasa janggal: "21 Januari 2025 juga memuat penghentian", "beralasan tidak sama", dan istilah sistem "kartu penentu". |
| tirt | agen-m2d5 | alami-p3 | 3 | Pesannya terasa seperti obrolan sungguhan, tetapi penjelasannya memuat istilah teknis yang bocor ('kartu penentu'), frasa janggal seperti 'beralasan tidak sama', dan pilihan a/b di Soal 3 nyaris sama bunyinya. |
| tirt | agen-m2d6 | alami-p1 | 3 | Pesannya wajar, tetapi pilihannya terpotong-potong seperti telegram ("alasan setop awal tahun kenaikan harga"), dan penjelasannya kaku, misalnya "tertulis di setop 10 Desember 2025, yang terjadi hari ini" serta "Yang terbaca:". |
| tirt | agen-m2d6 | alami-p2 | 3 | Pesannya wajar, tetapi pilihannya terpotong-potong seperti catatan ("alasan setop awal tahun kenaikan harga"), dan penjelasannya kaku ("Yang terbaca:", "klaim teman bahwa angka itu beda dua penutupan cocok"). |
| tirt | agen-m2d6 | alami-p3 | 3 | Pesan grupnya wajar, tetapi pilihan jawabannya telegrafis dan tanpa kata kerja (mis. 'alasan setop awal tahun kenaikan harga'), pembuka penjelasan 'Yang terbaca:' kaku, dan 'salah kaprah' ditulis dengan tanda hubung. |
| ultj | agen-m2d4 | alami-p1 | 3 | Pesannya alami ("ga pernah bolos"), tetapi penjelasannya memakai pola yang sama berulang-ulang ("Kalau daftar ... dibuka", "Yang tidak terbaca di situ") dan ada frasa janggal atau berlebihan seperti "jumlahnya 7 tahun beruntun" dan "laporannya cuma dua laporan". |
| ultj | agen-m2d4 | alami-p2 | 3 | Pesannya alami, tetapi penjelasannya berulang dengan pola yang sama ("Kalau ... dibuka", "Yang tidak terbaca di situ"), dan ada frasa tidak gramatikal atau berlebihan: "pemilik terbesar muncul 2 laporan", "laporannya cuma dua laporan". |
| ultj | agen-m2d4 | alami-p3 | 3 | Pesannya wajar ('ga pernah bolos'), tetapi penjelasannya mengulang pola yang sama ('Kalau ... dibuka', 'Yang tidak terbaca di situ:') dan ada frasa janggal seperti 'muncul 2 laporan', 'cuma sekali bagi', dan 'laporannya cuma dua laporan'. |
| ultj | manusia | alami-p1 | 4 | Pesannya hidup dan khas obrolan ("Gue", "Rapi banget", "Jangan kegeeran dulu") dan penjelasannya luwes, tetapi istilah "kartu" dan pengulangan "Perhatikan juga" terasa seperti bahasa alat, bukan bahasa teman. |
| ultj | manusia | alami-p2 | 4 | Pesannya hidup ("kegeeran", "Rapi banget") dan penjelasannya lancar seperti teman yang menjelaskan, tetapi "kartu" dan "tidak ada yang perlu kamu hitung" terasa seperti bahasa sistem, dan "Perhatikan juga" diulang-ulang. |
| ultj | manusia | alami-p3 | 4 | Pesannya hidup ('kegeeran', 'Rapi banget') dan penjelasannya runtut, tetapi rujukan seperti 'kartu pertama' dan 'kartu mana pun' terdengar seperti istilah sistem, bukan bahasa teman. |

## Biaya NYATA M2d-6 (OpenRouter, `usage.cost`)

Entri ledger bertag `m2d6/`: **US$2.9854 dalam 442 panggilan**, dari pagu milestone US$3.50 (ditegakkan kode).

| peran | panggilan | token keluar | biaya nyata |
|---|---:|---:|---:|
| kalibrasi kritikus | 8 | 27803 | US$0.1303 |
| kalibrasi penebak | 272 | 615038 | US$0.7042 |
| kritikus | 30 | 252171 | US$1.1167 |
| pembaca-kartu | 21 | 18461 | US$0.0132 |
| penebak GLM | 50 | 95944 | US$0.4285 |
| penulis | 32 | 349990 | US$0.2799 |
| probe | 29 | 70538 | US$0.3126 |

| model · penyedia yang melayani | panggilan | biaya nyata |
|---|---:|---:|
| z-ai/glm-5.3 · Wafer | 106 | US$2.0715 |
| deepseek/deepseek-v4.1-flash · Relace | 61 | US$0.1734 |
| z-ai/glm-5.3 · Venice | 5 | US$0.0798 |
| deepseek/deepseek-v4.1-flash · DeepInfra | 25 | US$0.0701 |
| deepseek/deepseek-v4.1-flash · SiliconFlow | 3 | US$0.0477 |
| deepseek/deepseek-v4.1-flash · Morph | 25 | US$0.0383 |
| deepseek/deepseek-v4.1-flash · Krea | 6 | US$0.0378 |
| deepseek/deepseek-v4.1-flash · Modal | 4 | US$0.0325 |
| deepseek/deepseek-v4.1-flash · InferenceNet | 20 | US$0.0320 |
| z-ai/glm-5.3 · Sail Research | 32 | US$0.0314 |
| deepseek/deepseek-v4.1-flash · Wafer | 10 | US$0.0302 |
| deepseek/deepseek-v4.1-flash · Alibaba | 1 | US$0.0224 |
| z-ai/glm-5.3 · Phala | 14 | US$0.0218 |
| deepseek/deepseek-v4.1-flash · GMICloud | 6 | US$0.0204 |
| deepseek/deepseek-v4.1-flash · (tidak disebut) | 1 | US$0.0197 |
| deepseek/deepseek-v4.1-flash · NextBit | 3 | US$0.0195 |
| z-ai/glm-5.3 · SiliconFlow | 6 | US$0.0157 |
| z-ai/glm-5.3 · Fireworks | 2 | US$0.0143 |
| z-ai/glm-5.3 · PrimeIntellect | 2 | US$0.0135 |
| z-ai/glm-5.3 · Relace | 13 | US$0.0133 |
| deepseek/deepseek-v4.1-flash · Novita | 3 | US$0.0132 |
| z-ai/glm-5.3 · Alibaba | 5 | US$0.0130 |
| deepseek/deepseek-v4.1-flash · CoreWeave | 4 | US$0.0128 |
| deepseek/deepseek-v4.1-flash · BaseTen | 1 | US$0.0124 |
| deepseek/deepseek-v4.1-flash · Fireworks | 3 | US$0.0119 |
| z-ai/glm-5.3 · Parasail | 3 | US$0.0112 |
| z-ai/glm-5.3 · AtlasCloud | 9 | US$0.0102 |
| z-ai/glm-5.3 · Friendli | 2 | US$0.0096 |
| z-ai/glm-5.3 · Cloudflare | 2 | US$0.0094 |
| deepseek/deepseek-v4.1-flash · DigitalOcean | 2 | US$0.0087 |
| z-ai/glm-5.3 · InferenceNet | 12 | US$0.0086 |
| deepseek/deepseek-v4.1-flash · StreamLake | 3 | US$0.0074 |
| deepseek/deepseek-v4.1-flash · DekaLLM | 5 | US$0.0065 |
| z-ai/glm-5.3 · GMICloud | 4 | US$0.0060 |
| deepseek/deepseek-v4.1-flash · Ionstream | 1 | US$0.0058 |
| z-ai/glm-5.3 · Reka | 15 | US$0.0054 |
| z-ai/glm-5.3 · Novita | 5 | US$0.0043 |
| z-ai/glm-5.3 · Modal | 3 | US$0.0038 |
| z-ai/glm-5.3 · Morph | 4 | US$0.0032 |
| z-ai/glm-5.3 · Z.AI | 2 | US$0.0030 |
| deepseek/deepseek-v4.1-flash · Makora | 1 | US$0.0025 |
| deepseek/deepseek-v4.1-flash · Together | 1 | US$0.0022 |
| z-ai/glm-5.3 · AkashML | 2 | US$0.0021 |
| deepseek/deepseek-v4.1-flash · Phala | 1 | US$0.0021 |
| z-ai/glm-5.3 · Together | 1 | US$0.0020 |
| z-ai/glm-5.3 · Baidu | 2 | US$0.0019 |
| z-ai/glm-5.3 · DigitalOcean | 1 | US$0.0008 |

| dasar biaya | panggilan | biaya |
|---|---:|---:|
| perkiraan-maksimum (tanpa usage.cost) | 1 | US$0.0197 |
| usage-cost | 441 | US$2.9657 |

## TIRT: M2d-4 → M2d-5 → M2d-6

| ukuran | M2d-4 (Featherless) | M2d-5 (OpenRouter) | M2d-6 (penalar) |
|---|---|---|---|
| terbit (putaran) | tidak (15) | ya (4) | tidak (15) |
| omongan dikunci | 2 | 3 | 2 |
| tebak buta luar lolos | 0/2 | 1/3 | 1/2 |
| jawab-dengan-kartu K-05 | 2/2 | 3/3 | 2/2 |
| keberatan kritikus (jalan) | — | 0 | 11 |
| biaya jalan TIRT | US$1.1811 (tabel tebakan; tagihan ±1,88×) | US$0.1609 (nyata) | US$1.8384 (nyata) |
| kealamian TIRT (penilai M2d-6 yang sama) | 4,00 | 3,00 | 3,00 |

## Catatan penulis

### Singkatnya

**TIRT M2d-6 TIDAK layak tayang.** Jalan TIRT (segar, setelan D-1…D-5) tidak terbit sesudah 15 putaran: omongan 2 dikunci di putaran 3, omongan 1 di putaran 8 (sudut kedua), omongan 3 gagal di ketiga sudutnya. Uji luar atas dua omongan yang dikunci: jawab-dengan-kartu lolos 2/2, tetapi tebak buta luar lolos 1/2 — omongan 1 ("Awal tahun juga kena setop, katanya karena harga naik terus", kunci "Keliru, setop awal tahun karena keraguan usaha") ditebak benar ketiga penguji Opus tanpa kartu (yakin 50–55), padahal ketiga penebak GLM di dalam memilih salah (a/60, a/72, a/60). Syarat pemilik (terbit + tebak buta luar lolos semua + kartu lolos + nol masalah makna) tidak terpenuhi di dua butir pertama. Draf tidak dipasang.

Jalan kedua tidak dijalankan: jalan pertama menghabiskan US$1,84 dan sisa pagu milestone sesudahnya US$0,51 — tidak cukup untuk satu jalan penuh (kontrak D-6: ≤ 2 jalan penuh DALAM pagu milestone).

### Apa yang berhasil

- **GLM memang bisa dipaksa berpikir, dan kini terbukti dari respons.** Dengan `effort: "high"` kritikus berpikir median 6.588 token di jalan TIRT (M2d-5: median 84, maks 260) dan untuk pertama kalinya di OpenRouter mengajukan keberatan: 5 dari 17 putusan terjawab berkeberatan (8 keberatan; terbanyak "tertebak", 5). Penjaga D-1 menolak 26 dari 80 panggilan GLM di jalan TIRT (token penalaran di bawah ambang) dan mengulang 18 di antaranya ke penyedia lain — tanpa penjaga, jawaban-jawaban itu akan dibaca seperti di M2d-5.
- **G-pilihan-kembar menangkap pengecoh kembar TIRT M2d-5 omongan 3 lebih dulu** (identik sesudah normalisasi), sementara kritikus yang berpikir (1.538 dan 5.777 token) TIDAK mengajukan keberatan atas pasangan itu di dua sampel yang terjawab. Tanpa gerbang kode, pasangan seperti ini tetap lolos. Di data agen M2d-3…M2d-5 gerbang ini juga menandai dua pasang pilihan "Betul, X" / "Keliru, X" (isi sama, label berlawanan) di DADA M2d-3 dan TIRT M2d-3.
- **Pengecualian penyedia DeepSeek berdasar bukti** (AtlasCloud 10/16 melewati batas penalaran) menghilangkan penulis yang berpikir sampai `max_tokens` habis; di jalan M2d-6 penulis terpotong 9 dari 32 panggilan (penyedia lain juga bisa habis di 20.000).

### Yang tidak berhasil, dan kenapa (terukur)

1. **Penebak di dalam masih lebih lunak dari penguji luar pada omongan yang dikunci.** Kalibrasi D-3 memilih K3 (GLM ×3 ber-effort, petunjuk "pemburu soal bocor"): 4/4 soal bocor tertangkap, 4/6 soal aman ikut ditolak — tetapi dari SATU sampel penuh (sampel kedua K3 terhenti di pagu kalibrasi sesudah 2 soal; keduanya bocor dan keduanya tertangkap). Sebagian tangkapan itu berasal dari penjaga (tebakan GLM yang tidak berpikir dihitung benar/100), bukan dari menebak: di K3-s1, 11 dari 30 tebakan bertanda `!`. Di jalan TIRT, penebak GLM menebak benar 13 dari 36 tebakan terbaca, dan omongan 1 lolos dengan 0/3 — omongan yang sama ditebak 3/3 di luar.
2. **"Penyedia tidak berpikir" untuk penebak sebagian besar adalah perilaku model pada tugas pendek, bukan hanya penyedia.** Pada tugas menebak, GLM-5.3 dengan `effort: "high"` berpikir 0–150 token di banyak penyedia — termasuk penyedia resmi Z.AI (32 dan 187 token). Aturan D-2 (≥ 2 pelanggaran dan ≥ 1/3 panggilan sejenis) karena itu mengecualikan 12 penyedia GLM; GLM kini sebagian besar dilayani Wafer (50 dari 80 panggilan GLM di jalan TIRT; 106 dari 252 panggilan GLM M2d-6; US$2,07 dari US$2,99 seluruh milestone). Ambang penebak 300 berasal dari probe atas SATU soal (penalaran 60–685); data kalibrasi (122 tebakan GLM ber-effort, median 187 token) memperlihatkan sebaran yang lebih rendah. Ambang ini keputusan eksekutor yang paling rapuh di milestone ini.
3. **Kritikus yang berpikir mahal dan kadang terlalu panjang.** Kritikus menghabiskan US$1,12 dari US$1,84 jalan TIRT (Wafer: US$0,03–0,07 per putusan); penalaran terpanjang 24.002 token = `max_tokens` (terpotong → "tidak menjawab", 3 kali).
4. **Kealamian tidak membaik**: TIRT M2d-6 3,00 (sama dengan M2d-5; M2d-4 4,00) pada penilai yang sama. Kritik penilai: pilihan "telegrafis" ("alasan setop awal tahun kenaikan harga") dan pembuka penjelasan "Yang terbaca:" — gerbang gaya tidak menyentuh penjelasan.

### Keputusan yang diambil eksekutor (bisa ditolak reviewer)

1. **Ambang**: kritikus 1.000 (kontrak ≥ 500) dan penebak GLM 300, dari probe (lihat `probe/putusan.md`); `effort: "high"` (bukan "medium", yang tidak berpikir).
2. **Bukti penyedia per jenis pelanggaran** (porsi dihitung terhadap panggilan sejenis) dan hanya untuk `effort` yang DIPAKAI peran itu — `effort: "medium"` yang sengaja diprobe tidak dihitung sebagai pelanggaran penyedia. Daftar dibekukan di commit T-04; tidak diubah selama jalan TIRT.
3. **Kalibrasi serentak** (5 soal sekaligus, penebak tiap soal tetap berurutan) dengan pesanan perkiraan di pagu, sesudah jalan berurutan pertama terlalu lambat; jalan K0 berurutan yang dihentikan disimpan di `kalibrasi/dibuang/` (panggilan yang sedang berjalan saat dihentikan mungkin ditagih tanpa tercatat — lihat rekonsiliasi di §9 kontrak).
4. **Sampel kedua K1–K4 memakai daftar pengecualian yang sudah diperbarui** sesudah sampel pertama (bukti D-2 bertambah dari kalibrasi); K2-s2 terhenti karena galat penyedia (respons bukan JSON) dan dibuang; K3-s2 dan K4-s2 terhenti di pagu kalibrasi.
5. **Petunjuk "pemburu soal bocor"** menyebut kebiasaan umum pembuat soal (dua pilihan kembar, pilihan "tidak pernah dihitung", jangan menganggap teman pasti keliru) — ditulis sesudah melihat empat soal bocor; risiko terlalu pas dengan himpunan kalibrasi disebut terbuka. Di jalan TIRT penebak GLM juga memakai "dua pilihan sama-sama membenarkan → singkirkan" untuk pasangan yang TIDAK kembar.

### Keterbatasan

- n sangat kecil: himpunan kalibrasi 10 soal, satu sampel per susunan (dua untuk K1), 3 penebak per soal; K-05 menolak satu tebakan benar dengan yakin ≥ 40, jadi penebak yang beragam menolak banyak soal aman.
- Kontrak menyebut M2d-4 TIRT 1 & 3 "ditebak benar ≥ 2/3"; menurut jawaban mentah, keduanya ditebak benar 1/3 dengan yakin 40 dan 50 — bocor menurut K-05 (yakin ≥ 40), bukan menurut ≥ 2/3. Label kalibrasi diturunkan dari jawaban mentah dengan K-05 (dites).
- Tidak ada panggilan Sectors; `web/`, `server/`, `cases/`, `factory/verifikasi/`, `factory/kasus/`, `alat/`, `deploy/` tidak disentuh; draf tidak dipasang ke produk.
