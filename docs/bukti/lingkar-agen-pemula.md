# Lingkar agen M2d-11 — patokan pemula: detektor cacat, tebak rotasi, uji ulang soal lama, jalan TIRT

> Laporan ini dibangun skrip (`npm run patokan:laporan`, `factory/llm/patokan/laporan.ts`) dari keluaran tersimpan dan ledger OpenRouter. Kalimat bertanda **Tafsiran** adalah bacaan eksekutor, bukan hasil hitungan.

## Ringkasan

- **Pra-registrasi** `docs/bukti/m2d11-praregistrasi.md` di-commit sebelum panggilan berbayar pertama (dites). Satu amandemen teknis: GLM-5.3 menolak `reasoning.enabled=false` ("Reasoning is mandatory", HTTP 400, biaya 0) → penebak rotasi GLM memakai `effort: "minimal"`, `max_tokens` 3.000.
- **Kalibrasi detektor**: ambang awal riset menandai 4/6 soal tayang; aturan mekanis melonggarkan D6 → L2, D5 → L1, D2 → L1 sampai 1/6 (DADA s2, "cuma" hanya di kunci). **Recall 4/12** omongan yang tertebak luar (target riset 80 % — tidak tercapai); omongan lama tak tertebak yang ditandai 6/15.
- **Uji ulang 33 soal** (syarat 1–3): lulus 5 — tayang-dada-s3-siapa-yang-menjual, tayang-ultj-turun-di-tanggal-ex, m2d3-tirt-o1, m2d3-ultj-o2, m2d3-ultj-o1. Tebak rotasi gagal 22/33, termasuk 3 dari 6 soal tayang.
- **Jalan TIRT**: 7 jalan, **terbit di m2d11-tirt-7**.
- **Biaya nyata milestone** US$0,9643 dari pagu US$5,0000 (1587 entri ledger).

## 1. Detektor cacat (D-1): kalibrasi dan recall

| langkah | ambang (anak tangga D1…D9) | soal tayang ditandai | per detektor | turun |
|---|---|---|---|---|
| 0 | 0 0 0 0 0 0 0 0 0 | 4/6 | {"D2":1,"D5":2,"D6":3} | D6 |
| 1 | 0 0 0 0 0 1 0 0 0 | 3/6 | {"D2":1,"D5":2,"D6":2} | D5 |
| 2 | 0 0 0 0 1 1 0 0 0 | 3/6 | {"D2":1,"D6":2} | D6 |
| 3 | 0 0 0 0 1 2 0 0 0 | 2/6 | {"D2":1,"D6":1} | D2 |
| 4 | 0 1 0 0 1 2 0 0 0 | 1/6 | {"D6":1} | — |

Ambang akhir (dibekukan di `factory/llm/cacat/ambang.ts`, dites sama): {"D1":0,"D2":1,"D3":0,"D4":0,"D5":1,"D6":2,"D7":0,"D8":0,"D9":0}.

| detektor | soal tayang ditandai | recall (tertebak luar, n=12) | lama tak tertebak (n=15) |
|---|---|---|---|
| D1 | 0 | 1 | 3 |
| D2 | 0 | 2 | 1 |
| D3 | 0 | 0 | 1 |
| D4 | 0 | 0 | 0 |
| D5 | 0 | 1 | 1 |
| D6 | 1 | 0 | 0 |
| D7 | 0 | 0 | 0 |
| D8 | 0 | 0 | 0 |
| D9 | 0 | 1 | 0 |

Luput (tertebak luar tanpa bendera): m2d3-tirt-o1, m2d3-ultj-o3, m2d3-ultj-o2, m2d3-tirt-o3, m2d5-tirt-o3, m2d8-tirt-o1, m2d10a1-tirt-o1, m2d10a2-tirt-o1.

**Tafsiran.** Detektor permukaan riset hampir tidak membedakan omongan yang dulu tertebak (4/12 ditandai) dari yang tidak (6/15). Sebagian besar "tertebak" luar ternyata tidak bisa dijelaskan cacat permukaan; uji ulang rotasi (§2) menunjukkan sebagian adalah artefak posisi dan sebagian lagi tertebak dari isi.

## 2. Uji ulang soal lama (D-3): putusan lama vs baru

Biaya bagian uji ulang (tag `m2d11/uji-ulang/`): US$0,4975 dari US$0,80.

| soal | kunci | penguji luar dulu (tebak buta, 1 urutan) | detektor | kartu r0/r2 | kunci pesan+pilihan | kunci pilihan-saja | tebak rotasi | putusan inti | perbandingan |
|---|---|---|---|---|---|---|---|---|---|
| tayang-dada-s1-kata-bursa | b | — | — | r0:b✓ r2:d✓ | 6/12 | 6/12 | gagal | tidak | soal tayang (tanpa uji luar tebak buta di bank ini) |
| tayang-dada-s2-dividen-pemilik-kecil | a | — | D6 | r0:a✓ r2:c✓ | 7/12 | 6/12 | gagal | tidak | soal tayang (tanpa uji luar tebak buta di bank ini) |
| tayang-dada-s3-siapa-yang-menjual | c | — | — | r0:c✓ r2:a✓ | 0/12 | 2/12 | lulus | **LULUS** | soal tayang (tanpa uji luar tebak buta di bank ini) |
| tayang-ultj-turun-di-tanggal-ex | b | — | — | r0:b✓ r2:d✓ | 1/8 (diabaikan: glm-5.3) | 2/8 (diabaikan: deepseek-v4.1-flash) | lulus | **LULUS** | soal tayang (tanpa uji luar tebak buta di bank ini) |
| tayang-ultj-riwayat-dividen | a | — | — | r0:null✗ r2:d✗ | 2/8 (diabaikan: glm-5.3) | 8/12 | gagal | tidak | soal tayang (tanpa uji luar tebak buta di bank ini) |
| tayang-ultj-siapa-yang-membeli | d | — | — | r0:b✗ r2:d✗ | 1/8 (diabaikan: glm-5.3) | 3/12 | lulus | tidak | soal tayang (tanpa uji luar tebak buta di bank ini) |
| m2d3-tirt-o1 | a | a/40 · a/40 · a/45 (3/3 kunci) | — | r0:a✓ r2:c✓ | 1/8 (diabaikan: deepseek-v4.1-flash) | 5/12 | lulus | **LULUS** | kemungkinan artefak posisi: dulu tertebak luar, kini lulus tebak rotasi |
| m2d3-dada-o1 | b | b/40 · b/35 · b/40 (3/3 kunci) | D2 | r0:b✓ r2:d✓ | 0/12 | 7/8 (diabaikan: deepseek-v4.1-flash) | gagal | tidak | sejalan: tertebak dulu dan kini |
| m2d3-ultj-o3 | a | a/35 · a/30 · a/35 (3/3 kunci) | — | r0:a✓ r2:c✓ | 2/12 | 5/12 | gagal | tidak | sejalan: tertebak dulu dan kini |
| m2d3-ultj-o2 | b | b/35 · b/30 · b/35 (3/3 kunci) | — | r0:b✓ r2:d✓ | 2/12 | 1/4 (diabaikan: claude-haiku-4.5, deepseek-v4.1-flash) | lulus | **LULUS** | kemungkinan artefak posisi: dulu tertebak luar, kini lulus tebak rotasi |
| m2d3-tirt-o3 | c | c/45 · c/55 · c/50 (3/3 kunci) | — | r0:c✓ r2:a✓ | 9/12 | 7/12 | gagal | tidak | sejalan: tertebak dulu dan kini |
| m2d5-tirt-o2 | d | d/40 · d/40 · d/40 (3/3 kunci) | D1,D2 | r0:d✓ r2:b✓ | 4/12 | 3/8 (diabaikan: claude-haiku-4.5) | gagal | tidak | sejalan: tertebak dulu dan kini |
| m2d5-tirt-o3 | d | d/55 · d/60 · d/55 (3/3 kunci) | — | r0:d✓ r2:b✓ | 0/12 | 6/12 | gagal | tidak | sejalan: tertebak dulu dan kini |
| m2d6-tirt-o1 | c | c/55 · c/50 · c/50 (3/3 kunci) | D5 | r0:c✓ r2:a✓ | 4/12 | 3/8 (diabaikan: glm-5.3) | lulus | tidak | kemungkinan artefak posisi: dulu tertebak luar, kini lulus tebak rotasi |
| m2d8-tirt-o1 | c | c/50 · c/55 · c/55 (3/3 kunci) | — | r0:c✓ r2:c✗ | 2/12 | 2/12 | lulus | tidak | kemungkinan artefak posisi: dulu tertebak luar, kini lulus tebak rotasi |
| m2d10-tirt-v2 | c | c/40 · c/35 · c/50 (3/3 kunci) | D9 | r0:c✓ r2:a✓ | 11/12 | 7/8 (diabaikan: claude-haiku-4.5) | gagal | tidak | sejalan: tertebak dulu dan kini |
| m2d10a1-tirt-o1 | c | c/40 · c/40 · a/35 (2/3 kunci) | — | r0:c✓ r2:a✓ | 4/12 | 6/12 | gagal | tidak | sejalan: tertebak dulu dan kini |
| m2d10a2-tirt-o1 | c | c/45 · c/45 · c/50 (3/3 kunci) | — | r0:c✓ r2:a✓ | 7/12 | 5/8 (diabaikan: deepseek-v4.1-flash) | gagal | tidak | sejalan: tertebak dulu dan kini |
| m2d3-dada-o3 | b | d/45 · d/40 · d/45 (0/3 kunci) | — | r0:b✓ r2:d✓ | 1/12 | 3/8 (diabaikan: deepseek-v4.1-flash) | gagal | tidak | kebalikan: dulu tidak tertebak luar, kini gagal tebak rotasi |
| m2d3-tirt-o2 | b | c/55 · c/60 · c/55 (0/3 kunci) | D5 | r0:b✓ r2:d✓ | 0/12 | 4/12 | lulus | tidak | sejalan: tidak tertebak dulu dan kini |
| m2d3-ultj-o1 | b | a/40 · a/50 · a/45 (0/3 kunci) | — | r0:b✓ r2:d✓ | 0/12 | 0/12 | lulus | **LULUS** | sejalan: tidak tertebak dulu dan kini |
| m2d4-ultj-o1 | c | b/45 · b/55 · b/50 (0/3 kunci) | D2 | r0:c✓ r2:a✓ | 7/12 | 3/12 | gagal | tidak | kebalikan: dulu tidak tertebak luar, kini gagal tebak rotasi |
| m2d4-tirt-o3 | a | b/55 · a/40 · b/55 (1/3 kunci) | D3 | r0:a✓ r2:c✓ | 10/12 | 7/12 | gagal | tidak | kebalikan: dulu tidak tertebak luar, kini gagal tebak rotasi |
| m2d4-tirt-o1 | a | b/50 · a/50 · b/50 (1/3 kunci) | — | r0:a✓ r2:c✓ | 12/12 | 8/8 (diabaikan: claude-haiku-4.5) | gagal | tidak | kebalikan: dulu tidak tertebak luar, kini gagal tebak rotasi |
| m2d4-ultj-o2 | a | b/45 · b/40 · b/40 (0/3 kunci) | D1 | r0:a✓ r2:c✓ | 11/12 | 9/12 | gagal | tidak | kebalikan: dulu tidak tertebak luar, kini gagal tebak rotasi |
| m2d4-dada-o2 | b | d/45 · d/40 · d/40 (0/3 kunci) | D1 | r0:b✓ r2:d✓ | 9/12 | 6/12 | gagal | tidak | kebalikan: dulu tidak tertebak luar, kini gagal tebak rotasi |
| m2d4-dada-o1 | a | c/60 · c/35 · c/55 (0/3 kunci) | — | r0:a✓ r2:c✓ | 4/12 | 12/12 | gagal | tidak | kebalikan: dulu tidak tertebak luar, kini gagal tebak rotasi |
| m2d4-ultj-o3 | a | b/55 · b/45 · b/55 (0/3 kunci) | — | r0:a✓ r2:c✓ | 1/12 | 5/12 | gagal | tidak | kebalikan: dulu tidak tertebak luar, kini gagal tebak rotasi |
| m2d5-tirt-o1 | c | b/40 · b/35 · c/30 (1/3 kunci) | — | r0:c✓ r2:a✓ | 3/12 | 7/12 | gagal | tidak | kebalikan: dulu tidak tertebak luar, kini gagal tebak rotasi |
| m2d6-tirt-o2 | d | a/35 · b/35 · a/30 (0/3 kunci) | D1 | r0:d✓ r2:b✓ | 2/12 | 1/12 | lulus | tidak | sejalan: tidak tertebak dulu dan kini |
| m2d10-pemanasan | b | b/50 · a/45 · a/35 (1/3 kunci) | — | r0:b✓ r2:c✗ | 3/12 | 5/8 (diabaikan: deepseek-v4.1-flash) | gagal | tidak | kebalikan: dulu tidak tertebak luar, kini gagal tebak rotasi |
| m2d10-tirt-v1 | c | c/50 · a/45 · a/35 (1/3 kunci) | — | r0:a✗ r2:a✓ | 0/12 | 6/12 | lulus | tidak | sejalan: tidak tertebak dulu dan kini |
| m2d10a1-tirt-o2 | d | c/35 · c/30 · a/30 (0/3 kunci) | — | r0:d✓ r2:b✓ | 4/8 (diabaikan: deepseek-v4.1-flash) | 9/12 | gagal | tidak | kebalikan: dulu tidak tertebak luar, kini gagal tebak rotasi |

| hitungan | jumlah |
|---|---|
| rotasi gagal | 22 |
| soal tayang (tanpa uji luar tebak buta di bank ini) | 6 |
| syarat 1 (kartu 2/2) | 28 |
| syarat 2 (nol bendera) | 22 |
| rotasi lulus | 11 |
| kemungkinan artefak posisi: dulu tertebak luar, kini lulus tebak rotasi | 4 |
| sejalan: tertebak dulu dan kini | 8 |
| kebalikan: dulu tidak tertebak luar, kini gagal tebak rotasi | 11 |
| sejalan: tidak tertebak dulu dan kini | 4 |

**Pasangan A-1 o2 (kunci d) vs A-2 o1 (kunci c)** — dulu 0/3 vs 3/3 tertebak luar. Kini: A-1 o2 pesan+pilihan 4/8 (diabaikan: deepseek-v4.1-flash), pilihan-saja 9/12 → gagal; A-2 o1 7/12 / 5/8 (diabaikan: deepseek-v4.1-flash) → gagal. **Tafsiran:** dengan posisi terkendali keduanya gagal; selisih 0/3 vs 3/3 dulu bukan bukti bahwa A-1 o2 aman — kunci d-nya kebetulan tidak dipilih penguji yang condong ke c.

**Kepekaan (pasca-data, bukan putusan):** 47 jawaban rotasi tak terbaca (35 dari Haiku — hampir semuanya penolakan "tidak dapat menjawab" di kondisi pilihan-saja). Pra-registrasi menghitungnya sebagai memilih isi kunci (konservatif). Bila jawaban tak terbaca dibuang, putusan tebak rotasi berubah di 3 soal: m2d3-dada-o3: gagal → lulus; m2d4-dada-o1: gagal → lulus; m2d4-ultj-o3: gagal → lulus.

## 3. Data hipotesis pemilik (D-6b, eksploratif)

**H2 — perilaku menebak per keluarga dengan posisi terkendali** (33 soal × 4 rotasi × 2 kondisi = 264 jawaban per model):

| model | kunci pilihan-saja | kunci pesan+pilihan | isi kunci konsisten (ps / pp) | isi apa pun konsisten (ps / pp) | huruf konsisten (ps / pp) | prior huruf a/b/c/d | tak terbaca |
|---|---|---|---|---|---|---|---|
| anthropic/claude-haiku-4.5 | 51 % | 30 % | 39 % / 24 % | 58 % / 79 % | 12 % / 0 % | 47/83/53/46 | 35 |
| deepseek/deepseek-v4.1-flash | 45 % | 39 % | 33 % / 27 % | 55 % / 67 % | 18 % / 6 % | 57/78/60/62 | 7 |
| z-ai/glm-5.3 | 42 % | 34 % | 30 % / 18 % | 73 % / 61 % | 3 % / 9 % | 62/65/73/59 | 5 |

Proporsi kunci menghitung jawaban tak terbaca sebagai kunci (aturan pra-registrasi). Acak = 25 %.

**H3 — kesepakatan vonis tiap keluarga dengan audit Opus:** audit reviewer sudah dijalankan; hasil, tabel per keluarga, dan bias seleksinya di `docs/bukti/lingkar-agen-pemula-audit.md` (eksploratif; H3 belum terjawab).

## 4. Mesin templat M2d-11 (D-4)

- Urutan gerbang per versi: kode lama + detektor (ambang kalibrasi) + label & umpan balik → tebak rotasi 24 panggilan → pembaca kartu r0+r2 → kritikus GLM "high" (Wafer) paling akhir.
- Pengecoh berlabel 6 jenis kesalahan; label divalidasi dari proposisi (`factory/llm/templat/label.ts`); varian yang labelnya tidak sah dibuang. Pola **benar-berincian tidak dipakai**: pengecoh "menyangkal rangkaian yang tercatat" bukan satu dari enam jenis kesalahan membaca.
- Umpan balik disusun kode: kartu penentu, satu kalimat per pengecoh (nama jenis + nomor kartu), satu pertanyaan cek per pola; disimpan di `hasil.json` (`kunci[].umpan_balik`), tidak dipasang ke produk.
- Varian awal = kombinasi pertama tanpa bendera detektor dari pilihan saja; teks besaran-hitungan P2a tanpa angka selisih (D9) hanya di jalur M2d-11.

**Perubahan templat antar jalan TIRT** (kata/struktur, bukan patokan; tiap perubahan di-commit sebelum jalan berikutnya):

- sesudah jalan #1: angka-lain-waktu: pengecoh koreksi p3 = harga penutupan nyata hari lain berjarak seimbang dengan kunci (Rp89 vs Rp106 dari Rp97), menggantikan andaian Rp115 — ketiga keluarga memilih "koreksi yang paling masuk akal".
- sesudah jalan #2: susunan label berselang: pengecoh yang labelnya sama dengan kunci ditaruh di seberang kunci (k+2), sehingga heuristik "opsi Keliru pertama" (Haiku c→a→a→b) memilih kunci tepat 2/4 rotasi.
- sesudah jalan #3: tidak ada perubahan; jalan #4–#7 memakai kode yang sama (diulang sesuai pra-registrasi §6).

## 5. Jalan TIRT (D-5)

| jalan | terbit | versi | distribusi berhenti | biaya nyata | berhenti |
|---|---|---|---|---|---|
| m2d11-tirt-1 | tidak | 3 | penebak 3 | US$0,0417 | omongan 1: rencana angka-lain-waktu:harga-2025-12-09 habis dan tidak ada rencana pengganti; simulasi tidak terbit |
| m2d11-tirt-2 | tidak | 3 | penebak 3 | US$0,0425 | omongan 1: rencana angka-lain-waktu:harga-2025-12-09 habis dan tidak ada rencana pengganti; simulasi tidak terbit |
| m2d11-tirt-3 | tidak | 3 | kode 1, penebak 2 | US$0,0327 | omongan 1: rencana angka-lain-waktu:harga-2025-12-09 habis dan tidak ada rencana pengganti; simulasi tidak terbit |
| m2d11-tirt-4 | tidak | 4 | kode 2, penebak 2 | US$0,0341 | omongan 1: rencana angka-lain-waktu:harga-2025-12-09 habis dan tidak ada rencana pengganti; simulasi tidak terbit |
| m2d11-tirt-5 | tidak | 4 | kode 1, penebak 3 | US$0,0416 | omongan 1: rencana angka-lain-waktu:harga-2025-12-09 habis dan tidak ada rencana pengganti; simulasi tidak terbit |
| m2d11-tirt-6 | tidak | 4 | kode 2, penebak 1, kartu 1 | US$0,0348 | omongan 1: rencana angka-lain-waktu:harga-2025-12-09 habis dan tidak ada rencana pengganti; simulasi tidak terbit |
| m2d11-tirt-7 | **YA** | 8 | penebak 5, lolos 3 | US$0,2112 | — |

<details><summary>m2d11-tirt-1: versi</summary>

| omongan | rencana | versi | berhenti | alasan |
|---|---|---|---|---|
| 1 | angka-lain-waktu:harga-2025-12-09 | 1 | penebak | tebak rotasi gagal: pesan-pilihan: kunci 8/12 (8,0/12); pilihan-saja: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi; pilihan-saja: deepseek/deepseek-v4.1-flash diabaikan (huruf "c" di ≥ 3/4 rotasi); pesan-pilihan: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi; pesan-pil |
| 1 | angka-lain-waktu:harga-2025-12-09 | 2 | penebak | tebak rotasi gagal: pesan-pilihan: kunci 10/12 (10,0/12); pilihan-saja: z-ai/glm-5.3 memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: deepseek/deepseek-v4.1-flash memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: z-ai/glm- |
| 1 | angka-lain-waktu:harga-2025-12-09 | 3 | penebak | tebak rotasi gagal: pesan-pilihan: kunci 8/12 (8,0/12); pilihan-saja: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: z-ai/glm-5.3 memilih isi kunci di ≥ 3/4 rotasi [pilihan-saja: claude-haiku-4 |

</details>

<details><summary>m2d11-tirt-2: versi</summary>

| omongan | rencana | versi | berhenti | alasan |
|---|---|---|---|---|
| 1 | angka-lain-waktu:harga-2025-12-09 | 1 | penebak | tebak rotasi gagal: pesan-pilihan: kunci 7/12 (7,0/12); pilihan-saja: deepseek/deepseek-v4.1-flash diabaikan (huruf "c" di ≥ 3/4 rotasi); pesan-pilihan: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi [pilihan-saja: claude-haiku-4.5 isi -, deepseek-v4.1-flash isi - (diabaikan), glm-5.3  |
| 1 | angka-lain-waktu:harga-2025-12-09 | 2 | penebak | tebak rotasi gagal: pesan-pilihan: kunci 6/12 (6,0/12); pilihan-saja: z-ai/glm-5.3 diabaikan (huruf "a" di ≥ 3/4 rotasi); pesan-pilihan: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi [pilihan-saja: claude-haiku-4.5 isi -, deepseek-v4.1-flash isi -, glm-5.3 isi - (diabaikan); pesan-pil |
| 1 | angka-lain-waktu:harga-2025-12-09 | 3 | penebak | tebak rotasi gagal: pesan-pilihan: kunci 4/8 (6,0/12); pilihan-saja: deepseek/deepseek-v4.1-flash diabaikan (huruf "c" di ≥ 3/4 rotasi); pesan-pilihan: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: deepseek/deepseek-v4.1-flash diabaikan (huruf "c" di ≥ 3/4 rotasi) [pil |

</details>

<details><summary>m2d11-tirt-3: versi</summary>

| omongan | rencana | versi | berhenti | alasan |
|---|---|---|---|---|
| 1 | angka-lain-waktu:harga-2025-12-09 | 1 | penebak | tebak rotasi abu-abu: pesan-pilihan: kunci 4/8 (6,0/12); pilihan-saja: z-ai/glm-5.3 diabaikan (huruf "b" di ≥ 3/4 rotasi); pesan-pilihan: deepseek/deepseek-v4.1-flash diabaikan (huruf "b" di ≥ 3/4 rotasi) [pilihan-saja: claude-haiku-4.5 isi -, deepseek-v4.1-flash isi -, glm-5.3 isi - (diabaikan); pe |
| 1 | angka-lain-waktu:harga-2025-12-09 | 2 | penebak | tebak rotasi gagal: pesan-pilihan: kunci 8/12 (8,0/12); pilihan-saja: anthropic/claude-haiku-4.5 diabaikan (huruf "b" di ≥ 3/4 rotasi); pilihan-saja: z-ai/glm-5.3 diabaikan (huruf "b" di ≥ 3/4 rotasi); pesan-pilihan: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi [pilihan-saja: claude- |
| 1 | angka-lain-waktu:harga-2025-12-09 | 3 | kode | detektor D1 (panjang) (pilihan): panjang alasan tidak seragam: terpanjang/terpendek 1,73 > 1,60 (b 57 vs d 33 karakter); opsi b, d |

</details>

<details><summary>m2d11-tirt-4: versi</summary>

| omongan | rencana | versi | berhenti | alasan |
|---|---|---|---|---|
| 1 | angka-lain-waktu:harga-2025-12-09 | 1 | kode | templat: penjelasan (penjelasan): penjelasan harus merujuk kartu penentu (harga-2025-12-09) |
| 1 | angka-lain-waktu:harga-2025-12-09 | 2 | penebak | tebak rotasi abu-abu: pesan-pilihan: kunci 4/8 (6,0/12); pilihan-saja: deepseek/deepseek-v4.1-flash diabaikan (huruf "b" di ≥ 3/4 rotasi); pesan-pilihan: deepseek/deepseek-v4.1-flash diabaikan (huruf "b" di ≥ 3/4 rotasi) [pilihan-saja: claude-haiku-4.5 isi -, deepseek-v4.1-flash isi - (diabaikan), g |
| 1 | angka-lain-waktu:harga-2025-12-09 | 3 | penebak | tebak rotasi gagal: pesan-pilihan: kunci 3/4 (9,0/12); pilihan-saja: anthropic/claude-haiku-4.5 diabaikan (huruf "b" di ≥ 3/4 rotasi); pilihan-saja: z-ai/glm-5.3 diabaikan (huruf "b" di ≥ 3/4 rotasi); pesan-pilihan: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: deepsee |
| 1 | angka-lain-waktu:harga-2025-12-09 | 4 | kode | detektor D1 (panjang) (pilihan): alasan kunci 49 karakter, terpanjang dan > 1,25 × median pengecoh (38,00); opsi c |

</details>

<details><summary>m2d11-tirt-5: versi</summary>

| omongan | rencana | versi | berhenti | alasan |
|---|---|---|---|---|
| 1 | angka-lain-waktu:harga-2025-12-09 | 1 | kode | templat: penjelasan (penjelasan): penjelasan memakai rujukan [[harga-2025-12-09/Rp89]] yang tidak ada di daftar rujukan yang diizinkan |
| 1 | angka-lain-waktu:harga-2025-12-09 | 2 | penebak | tebak rotasi abu-abu: pesan-pilihan: kunci 4/8 (6,0/12); pesan-pilihan: deepseek/deepseek-v4.1-flash diabaikan (huruf "b" di ≥ 3/4 rotasi) [pilihan-saja: claude-haiku-4.5 isi -, deepseek-v4.1-flash isi -, glm-5.3 isi -; pesan-pilihan: claude-haiku-4.5 isi -, deepseek-v4.1-flash isi - (diabaikan), gl |
| 1 | angka-lain-waktu:harga-2025-12-09 | 3 | penebak | tebak rotasi abu-abu: pesan-pilihan: kunci 4/8 (6,0/12); pilihan-saja: anthropic/claude-haiku-4.5 diabaikan (huruf "b" di ≥ 3/4 rotasi); pilihan-saja: z-ai/glm-5.3 diabaikan (huruf "b" di ≥ 3/4 rotasi); pesan-pilihan: deepseek/deepseek-v4.1-flash diabaikan (huruf "b" di ≥ 3/4 rotasi) [pilihan-saja:  |
| 1 | angka-lain-waktu:harga-2025-12-09 | 4 | penebak | tebak rotasi abu-abu: pesan-pilihan: kunci 4/8 (6,0/12); pilihan-saja: anthropic/claude-haiku-4.5 diabaikan (huruf "b" di ≥ 3/4 rotasi); pesan-pilihan: deepseek/deepseek-v4.1-flash diabaikan (huruf "b" di ≥ 3/4 rotasi) [pilihan-saja: claude-haiku-4.5 isi - (diabaikan), deepseek-v4.1-flash isi -, glm |

</details>

<details><summary>m2d11-tirt-6: versi</summary>

| omongan | rencana | versi | berhenti | alasan |
|---|---|---|---|---|
| 1 | angka-lain-waktu:harga-2025-12-09 | 1 | kartu | pembaca kartu tidak memilih kunci di kedua rotasi: r0: memilih c (kunci c); r2: memilih d (kunci a) — Kartu 2 menunjukkan penutupan 8 Desember 2025 Rp97, sehingga omongan Tio tentang penutupan kemarin cocok. |
| 1 | angka-lain-waktu:harga-2025-12-09 | 2 | kode | templat: penjelasan (penjelasan): penjelasan harus merujuk kartu penentu (harga-2025-12-09) |
| 1 | angka-lain-waktu:harga-2025-12-09 | 3 | penebak | tebak rotasi abu-abu: pesan-pilihan: kunci 4/8 (6,0/12); pilihan-saja: anthropic/claude-haiku-4.5 diabaikan (huruf "b" di ≥ 3/4 rotasi); pilihan-saja: z-ai/glm-5.3 diabaikan (huruf "b" di ≥ 3/4 rotasi); pesan-pilihan: deepseek/deepseek-v4.1-flash diabaikan (huruf "b" di ≥ 3/4 rotasi) [pilihan-saja:  |
| 1 | angka-lain-waktu:harga-2025-12-09 | 4 | kode | detektor D1 (panjang) (pilihan): alasan kunci 49 karakter, terpanjang dan > 1,25 × median pengecoh (38,00); opsi c |

</details>

<details><summary>m2d11-tirt-7: versi</summary>

| omongan | rencana | versi | berhenti | alasan |
|---|---|---|---|---|
| 1 | angka-lain-waktu:harga-2025-12-09 | 1 | penebak | tebak rotasi abu-abu: pesan-pilihan: kunci 4/8 (6,0/12); pesan-pilihan: deepseek/deepseek-v4.1-flash diabaikan (huruf "b" di ≥ 3/4 rotasi) [pilihan-saja: claude-haiku-4.5 isi -, deepseek-v4.1-flash isi -, glm-5.3 isi -; pesan-pilihan: claude-haiku-4.5 isi -, deepseek-v4.1-flash isi - (diabaikan), gl |
| 1 | angka-lain-waktu:harga-2025-12-09 | 2 | penebak | tebak rotasi abu-abu: pesan-pilihan: kunci 4/8 (6,0/12); pilihan-saja: anthropic/claude-haiku-4.5 diabaikan (huruf "b" di ≥ 3/4 rotasi); pilihan-saja: z-ai/glm-5.3 diabaikan (huruf "b" di ≥ 3/4 rotasi); pesan-pilihan: deepseek/deepseek-v4.1-flash diabaikan (huruf "b" di ≥ 3/4 rotasi) [pilihan-saja:  |
| 1 | angka-lain-waktu:harga-2025-12-09 | 3 | lolos |  |
| 2 | setengah-benar:susp-2025-01-21 | 1 | penebak | tebak rotasi gagal: pesan-pilihan: kunci 11/12 (11,0/12); pilihan-saja: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi; pilihan-saja: z-ai/glm-5.3 memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: deepseek/dee |
| 2 | setengah-benar:susp-2025-01-21 | 2 | penebak | tebak rotasi gagal: pesan-pilihan: kunci 9/12 (9,0/12); pilihan-saja: z-ai/glm-5.3 diabaikan (huruf "b" di ≥ 3/4 rotasi); pesan-pilihan: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: z-ai/glm-5.3 memilih isi kunci di ≥ 3/4 rotasi [pilihan-saja: claude-haiku-4.5 isi -,  |
| 2 | setengah-benar:susp-2025-01-21 | 3 | penebak | tebak rotasi gagal: pesan-pilihan: kunci 8/12 (8,0/12); pilihan-saja: deepseek/deepseek-v4.1-flash diabaikan (huruf "d" di ≥ 3/4 rotasi); pilihan-saja: z-ai/glm-5.3 memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: z-ai/glm |
| 2 | arah-kali-tingkat:hari-naik-beruntun | 1 | lolos |  |
| 3 | besaran-hitungan:kelipatan-2025-11-26-2025-12-09 | 1 | lolos |  |

</details>

### Draf terbit (m2d11-tirt-7) — tidak dipasang; menunggu audit Opus reviewer + penyetuju

Terbit di jalan ke-7 dari 7 (total 29 versi omongan diperiksa di semua jalan). Patokan §1 pra-registrasi dipenuhi oleh gerbang di dalam mesin: nol bendera detektor, label & umpan balik sah, tebak rotasi lulus, pembaca kartu r0+r2 benar, kritikus tanpa keberatan, draf akhir lolos validator.

**Omongan 1 — angka-lain-waktu** (kunci c)

Pesan: "Gw yakin banget harga penutupan Perusahaan T kemarin Rp97."

- a) Keliru, yang tercatat untuk 9 Desember Rp89, bukan Rp97.
- b) Betul, Rp97 itu penutupan tertinggi sebelum hari ini.
- c) Keliru, yang tercatat untuk 9 Desember Rp106, bukan Rp97.
- d) Betul, penutupan 9 Desember memang Rp97.

- tebak rotasi: lulus — pesan-pilihan: kunci 3/8 (4,5/12); pilihan-saja: anthropic/claude-haiku-4.5 diabaikan (huruf "b" di ≥ 3/4 rotasi); pilihan-saja: z-ai/glm-5.3 diabaikan (huruf "b" di ≥ 3/4 rotasi); pesan-pilihan: anthropic/claude-haiku-4.5 diabaikan (huruf "b" di ≥ 3/4 rotasi)
- pembaca kartu: r0 memilih c (kunci c), r2 memilih a (kunci a)
- kritikus (Wafer, 7023 token penalaran): tanpa keberatan; arahan dicatat: "Angka Rp89 di pilihan a tidak berakar pada kartu mana pun; usahakan alasan setiap pilihan merujuk konten yang benar-benar ada di kartu agar semua opsi tetap teruji dari dokumen."
- umpan balik: Yang menentukan jawabannya: kartu 1 (terbit 9 Desember 2025). a) angka nyaris benar: angkanya dekat, tetapi bukan angka di kartu — cek kartu 1. b) menjawab pertanyaan lain: kalimat ini menjawab hal lain, bukan apakah omongan teman cocok — cek kartu 2. d) salah periode: isinya milik tanggal lain, bukan hari yang dibicarakan — cek kartu 2. Pertanyaan cek: Angka ini milik tanggal yang mana menurut kartu?

**Omongan 2 — arah-kali-tingkat** (kunci d)

Pesan: "Harga penutupan 9 Desember masih puluhan rupiah per lembar, jadi harganya belum ke mana-mana. Gw mah santai aja wkwk."

- a) Betul, harganya naik tapi 9 Desember masih puluhan rupiah.
- b) Keliru, harganya turun tapi 9 Desember masih ratusan rupiah.
- c) Betul, harganya turun sampai puluhan rupiah pada 9 Desember.
- d) Keliru, harganya naik sampai ratusan rupiah pada 9 Desember.

- tebak rotasi: lulus — pesan-pilihan: kunci 0/12 (0,0/12)
- pembaca kartu: r0 memilih d (kunci d), r2 memilih b (kunci b)
- kritikus (Wafer, 4804 token penalaran): tanpa keberatan; arahan dicatat: "Di penjelasan, sebut angka Rp48 dan Rp106 dari kartu agar jelas dari mana kesimpulan 'ratusan rupiah' dan bantahan atas 'belum ke mana-mana' (harga lebih dari dua kali lipat) diperoleh."
- umpan balik: Yang menentukan jawabannya: kartu 1 (terbit 9 Desember 2025). a) sebagian benar: sebagian isinya cocok, tetapi ada bagian yang tidak cocok dengan kartu — cek kartu 1. b) sebagian benar: sebagian isinya cocok, tetapi ada bagian yang tidak cocok dengan kartu — cek kartu 1. c) percaya omongan tanpa cek: ini mengulang omongan teman tanpa dicek ke kartu — cek kartu 1. Pertanyaan cek: Ke arah mana harganya bergerak, dan sampai tingkat berapa menurut kartu?

**Omongan 3 — besaran-hitungan** (kunci d)

Pesan: "Sejak 26 November harga penutupan Perusahaan T udah lebih dari dua kali lipat, ya? Beneran ga sih?"

- a) Keliru, yang bertambah cuma selisih rupiahnya, bukan dua kali lipat.
- b) Betul, penutupan 9 Desember 2,02 kali penutupan 26 November.
- c) Keliru, penutupan 9 Desember malah lebih rendah dari 26 November.
- d) Betul, penutupan 9 Desember 2,21 kali penutupan 26 November.

- tebak rotasi: lulus — pesan-pilihan: kunci 5/12 (5,0/12); pilihan-saja: anthropic/claude-haiku-4.5 diabaikan (huruf "b" di ≥ 3/4 rotasi)
- pembaca kartu: r0 memilih d (kunci d), r2 memilih b (kunci b)
- kritikus (Wafer, 10565 token penalaran): tanpa keberatan; arahan dicatat: "Di penjelasan, tegaskan eksplisit bahwa 2,21 kali berarti lebih dari dua kali lipat; saat ini hubungan angka kartu dengan frasa 'dua kali lipat' di pesan Sari hanya implisit."
- umpan balik: Yang menentukan jawabannya: kartu 1 (terbit 9 Desember 2025). a) sebagian benar: sebagian isinya cocok, tetapi ada bagian yang tidak cocok dengan kartu — cek kartu 1. b) angka nyaris benar: angkanya dekat, tetapi bukan angka di kartu — cek kartu 1. c) menjawab pertanyaan lain: kalimat ini menjawab hal lain, bukan apakah omongan teman cocok — cek kartu 1. Pertanyaan cek: Ini kelipatan harga atau selisih rupiah, dan berapa angkanya di kartu?

**Catatan untuk penyetuju (pemilik).** (1) Omongan 1 lolos tebak rotasi di versi ke-3 jalan ke-7 sesudah berulang kali abu-abu tepat 6/12; omongan 3 lolos tepat di batas 5/12 — lulusnya rapuh dan sebagian karena kebetulan percobaan berulang. (2) Kritikus mencatat Rp89 di pengecoh omongan 1 tidak ada di kartu yang ditampilkan (harga 5 Desember); pemain tetap bisa menolaknya dari kartu 9 Desember, tetapi pengecoh itu tidak "menunjuk" kartu. (3) Pembaca kartu menandai kalimat teman ("Gw yakin banget…") sebagai membingungkan di kedua rotasi — dicatat, bukan penolakan. (4) Audit Opus reviewer: dengan kartu 4/4 tiap omongan, TANPA kartu juga 4/4 tiap omongan (tertebak model kuat; sinyal ditinjau, bukan patokan) — lihat `docs/bukti/lingkar-agen-pemula-audit.md`. Draf tidak dipasang.

## 6. Soal pemanasan (D-6)

Soal pemanasan M2d-10 dinilai ulang: kartu r0:b✓ r2:c✗, detektor —, putusan inti (tanpa syarat 3) tidak lulus; label pengecoh & umpan balik tidak ada di bentuk lama → ditulis ulang.

Penulisan ulang mesin M2d-11 (sebab-resmi:susp-2025-12-10): **LOLOS**; 2 percobaan; US$0,0283.

- percobaan 1: penjelasan: penjelasan harus merujuk kartu penentu (susp-2025-12-10)
- percobaan 2: lolos

Soal (kunci b): pesan "Gw yakin banget bursa nyetop dagang saham Perusahaan T hari ini, soalnya bursa ragu usahanya bisa lanjut terus."
- a) Betul, pengumuman hari ini juga menyebut rencana pengambilalihan belum diumumkan.
- b) Keliru, alasan resmi hari ini: kenaikan harganya terlalu tajam.
- c) Betul, bursa menghentikannya hari ini karena usahanya diragukan bisa terus berjalan.
- d) Keliru, alasan resmi hari ini: laporan keuangannya terlambat diserahkan.

Umpan balik: Yang menentukan jawabannya: kartu 1 (terbit 10 Desember 2025). a) percaya omongan tanpa cek: ini mengulang omongan teman tanpa dicek ke kartu — cek kartu 1. c) salah periode: isinya milik tanggal lain, bukan hari yang dibicarakan — cek kartu 2. d) sebagian benar: sebagian isinya cocok, tetapi ada bagian yang tidak cocok dengan kartu — cek kartu 1. Pertanyaan cek: Penghentian tanggal berapa yang dibicarakan, dan apa alasan resminya di kartu?

## 7. Biaya nyata (ledger, `usage.cost`)

| model | entri | biaya |
|---|---|---|
| anthropic/claude-haiku-4.5 | 527 | US$0,4723 |
| deepseek/deepseek-v4.1-flash | 599 | US$0,1947 |
| z-ai/glm-5.3 | 461 | US$0,2973 |
| **total** | 1587 | **US$0,9643** |

| bagian | biaya |
|---|---|
| uji ulang | US$0,4975 |
| pemanasan | US$0,0283 |
| jalan TIRT | US$0,4385 |

## 8. Keterbatasan

- Ambang detektor dan ambang tebak rotasi (5/12, 3/4) adalah **opini rekayasa dari riset**, dikalibrasi hanya pada 6 soal tayang.
- **LLM bukan pemula.** Lulus/gagal tebak rotasi mengukur petunjuk permukaan bagi model, bukan kesulitan bagi pemain; data pemain n kecil.
- Kondisi pilihan-saja ikut menentukan konsistensi isi kunci (pra-registrasi); banyak kegagalan terjadi di kondisi itu. Penolakan Haiku ("tidak dapat menjawab" tanpa pesan) dihitung kunci — lihat kepekaan §2.
- Jalan TIRT diulang sampai lulus atau pagu habis (kontrak D-5); bila ada yang lulus, peluang lolos karena kebetulan bertambah dengan jumlah percobaan — jumlah jalan dan versi dilaporkan di §5.
- Audit Opus (reviewer, `docs/bukti/lingkar-agen-pemula-audit.md`): 6/8 soal yang lulus tebak rotasi tiga keluarga tetap ditebak Opus tanpa kartu — lulus patokan ≠ tidak tertebak model kuat.
- Schmucker & Moore: angka versi v1/v3 berbeda; cek versi terbit sebelum dikutip publik (dari sintesis riset).

