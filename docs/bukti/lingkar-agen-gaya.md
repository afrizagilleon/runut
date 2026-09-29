# Bukti: lingkar agen gaya & makna (M2d-4)

Berkas ini ditulis oleh `npm run gaya:laporan` dari keluaran mentah di `eval/keluaran-m2d4/` (riwayat tiap putaran, jejak langkah, ledger biaya, bahan dan jawaban mentah penguji eksternal). Semua angka dihitung ulang tiap kali perintah itu dijalankan; hanya bagian "Catatan penulis" yang ditulis tangan (`eval/keluaran-m2d4/laporan-tangan.md`). Draf **tidak** dipasang ke produk.

## Metode

Lingkar berperan M2d-3 (`factory/llm/peran.md`) dengan perubahan M2d-4, semuanya ditetapkan kode (`GENERASI_M2D4` di `factory/llm/agen-peran.ts`):

- **Pemeriksa** menambah tiga gerbang gaya (`factory/llm/gerbang-gaya.ts`): G-panjang — pilihan ≤ 11 kata, pesan ≤ 26 kata (maksimum soal manusia di `cases/*.json`, dihitung dari teks tampil); G-satu-klausa — `Betul|Keliru, <satu klausa>`, tanpa ekor ", jadi …"/", karena …", koma kedua hanya untuk ", bukan …"/", tapi …"; G-register — tanpa "gue"/"gua"/"lo"/"elo".
- **Penulis** memakai `prompt-penulis-gaya.md` dan bank gaya v2 (`factory/llm/bank-gaya-v2.json`, 90 kalimat, enam nada termasuk "ikut-ikutan").
- **Penebak ×3** tetap tanpa kartu: ke-1 dan ke-2 `deepseek-ai/DeepSeek-V4.1-Flash`, ke-3 `zai-org/GLM-5.3`; petunjuk "pemain pintar".
- **Kritikus** (`zai-org/GLM-5.3`) dipanggil sesudah pemeriksa dan pembaca kartu, SEBELUM penebak, dengan dua pertanyaan wajib yang diubah kode menjadi keberatan yang menolak: bagian klaim yang tak bisa dicek dari kartu padahal kunci "Betul", dan pilihan lain yang juga benar menurut kartu.

**Bank gaya v2 dan korpus.** Kalimat bank v2 semuanya ditulis baru (K-07); gayanya disarikan dari statistik korpus santai berlisensi, **tanpa menyalin kalimat korpus** (diperiksa: nol 6-gram bersama). Sumber statistik: STIF-Indonesia — Wibowo, H. A., dkk. (2020), *Semi-Supervised Low-Resource Style Transfer of Indonesian Informal to Formal Language with Iterative Forward-Translation*, IALP 2020, github.com/haryoa/stif-indonesia (MIT License, © 2020 Haryo AW); IndoNLU EmoT dan SmSA — Wilie, B., dkk. (2020), *IndoNLU: Benchmark and Resources for Evaluating Indonesian Natural Language Understanding*, AACL-IJCNLP 2020, github.com/IndoNLP/indonlu (data MIT menurut kartu data; kode Apache-2.0). Korpus hanya disimpan lokal (tidak terlacak).

## Hasil per simulasi

| paket | T | hasil | putaran | versi diperiksa | panggilan (ledger) | biaya (ledger) | penulis / kartu / penebak (GLM) / kritikus | waktu |
|---|---|---|---:|---:|---:|---:|---|---:|
| TIRT | 10 Desember 2025 | tidak terbit (omongan 2 gagal di 3 sudut (naik-2025-11-26-2025-12-09, kelipatan-2025-11-26-2025-12-09, hari-naik-beruntun); simulasi tidak terbit) | 15 | 18 | 77 | US$1.1811 | US$0.2417 / US$0.0029 / US$0.1611 (US$0.1448) / US$0.7753 | 129,5 menit |
| ULTJ | 4 Mei 2026 | **terbit (lolos penuh)** | 9 | 13 | 59 | US$1.0316 | US$0.1197 / US$0.0047 / US$0.0791 (US$0.0642) / US$0.8282 | 93,5 menit |
| DADA | 8 Oktober 2025 | tidak terbit (pagu tercapai: Pagu milestone tercapai: biaya milestone (tag m2d4/*) US$3.962874 + perkiraan maksimum US$0.079726 untuk zai-org/GLM-5.3 > pagu milestone US$4.00. Panggilan tidak dikirim.) | 11 | 20 | 93 | US$1.2926 | US$0.2276 / US$0.0039 / US$0.1330 (US$0.1023) / US$0.9281 | 122,1 menit |

**Biaya milestone menurut ledger** (entri bertag `m2d4/`, dipotong 2026-09-29T00:21:43.129Z): **US$3.9629** dalam 262 panggilan — penulis US$0.6597 (84), pembaca kartu US$0.0128 (37), penebak US$0.4573 (83; DeepSeek US$0.0695, **tambahan GLM US$0.3878**), kritikus GLM US$2.7435 (49). Pagu milestone US$4,00 (ditegakkan kode) di dalam pagu kumulatif US$5,00 yang dimulai dari nol sesudah arsip. **Ledger lama diarsipkan** (`.cache/llm/arsip/`, tidak dihapus): US$3.7521 dalam 624 entri (M2d-1 s.d. M2d-3). Total sepanjang lingkar LLM: US$7.7150.

Di luar tiga jalan yang dilaporkan (tetap dihitung di biaya milestone; rekamannya di `eval/keluaran-m2d4/dibuang/`, sebabnya di catatan penulis):

| kelompok | panggilan | biaya |
|---|---:|---:|
| jalan TIRT dibuang (ke-1 dan ke-2) | 24 | US$0.3680 |
| probe GLM penebak | 7 | US$0.0234 |
| KOREKSI jalan1 | 1 | US$0.0491 |
| KOREKSI jalan2 | 1 | US$0.0170 |

### Sudut per posisi

| paket | omongan | sudut (fakta penentu) → hasil, putaran |
|---|---:|---|
| TIRT | 1 | 1. `susp-2025-12-10` → lolos (1–2) |
| TIRT | 2 | 1. `naik-2025-11-26-2025-12-09` → dibuang (1–5); 2. `kelipatan-2025-11-26-2025-12-09` → dibuang (6–10); 3. `hari-naik-beruntun` → dibuang (11–15) |
| TIRT | 3 | 1. `susp-2025-01-21` → lolos (1–1) |
| ULTJ | 1 | 1. `tahun-berdividen` → lolos (1–1) |
| ULTJ | 2 | 1. `fil-jan-orang-dalam-lain` → lolos (1–3) |
| ULTJ | 3 | 1. `turun-2026-05-04` → dibuang (1–5); 2. `laporan-jan-2026` → lolos (6–9) |
| DADA | 1 | 1. `kelipatan-2025-08-01-2025-10-08` → lolos (1–3) |
| DADA | 2 | 1. `jumlah-jual-terverifikasi` → dibuang (1–5); 2. `laporan-jual-terverifikasi` → lolos (6–7) |
| DADA | 3 | 1. `susp-2025-06-30` → dibuang (1–5); 2. `andai-10-lot-dividen` → dibuang (6–10); 3. `harga-2025-10-08` → berjalan (11–) |

### Keputusan per versi omongan

Setiap versi yang ditulis penulis (atau dibawa ulang), dan penilai pertama yang keberatan (urutan M2d-4: pemeriksa → pembaca kartu → kritikus → penebak).

| paket | versi | tidak-ada | ditolak-pemeriksa | ditolak-kartu | ditolak-kritikus | kritikus-tidak-menjawab | ditolak-tebak | galat-gerbang | lolos | rincian pemeriksa | penulis terpotong / cadangan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| TIRT | 18 | 1 | 8 | 0 | 0 | 2 | 5 | 0 | 2 | ANGKA_TANPA_RUJUKAN 7, KUNCI_SERAGAM 5, OPSI_PANJANG_TIMPANG 3, TAK_TERBACA 1, G-angka-cukup 1 | 14 / 14 |
| ULTJ | 13 | 0 | 4 | 0 | 1 | 1 | 4 | 0 | 3 | OPSI_PANJANG_TIMPANG 2, KATA_PENILAIAN 1, G-panjang 1, AJAKAN_TRANSAKSI 1 | 4 / 4 |
| DADA | 20 | 0 | 5 | 0 | 3 | 2 | 8 | 0 | 2 | G-angka-cukup 2, KUNCI_TAK_TERBUKTI_KARTU 1, ANGKA_TANPA_RUJUKAN 1, ANDAIAN_DI_OMONGAN_BETUL 1, ANGKA_TAK_COCOK 1 | 7 / 8 |

### Kritikus: keberatan dan cek makna

**TIRT** — kritikus menilai 9 versi (13 panggilan; terpotong di 3 versi); cek makna: bagian klaim tak tercek disebut di 0 versi, pilihan lain juga benar di 0 versi; keberatan per jenis: tidak-menjawab 2.

- putaran 10, omongan 2 · tidak-menjawab (-): kritikus tidak menjawab (terpotong, tak terbaca, atau galat) dua kali
- putaran 12, omongan 2 · tidak-menjawab (-): kritikus tidak menjawab (terpotong, tak terbaca, atau galat) dua kali

**ULTJ** — kritikus menilai 9 versi (13 panggilan; terpotong di 3 versi); cek makna: bagian klaim tak tercek disebut di 1 versi, pilihan lain juga benar di 1 versi; keberatan per jenis: kunci 2, makna 1, ambigu 1, tidak-menjawab 1.

- putaran 2, omongan 2 · makna (kunci): Bagian klaim teman yang tidak bisa dicek dari kartu: "dia tau sesuatu (motif orang dalam membeli) — kartu hanya memuat transaksi dan jumlah lembar, tidak ada yang menunjukka…"; kunci tidak boleh "Betul" kecuali pilihan itu menyatakan bagian tersebut tak bisa dipastikan.
- putaran 2, omongan 2 · kunci (pilihan): Pilihan c juga benar menurut kartu (Kartu 3 dan 4 membenarkan persis isi pilihan c — porsi naik dari 1,21 persen ke 1,37 persen — sehingga ada dua pilihan 'Betul,' yang sama-sama didukung kartu.); hanya satu pilihan yang boleh benar.
- putaran 2, omongan 2 · ambigu (pilihan): Pilihan c juga benar menurut kartu 3 dan 4, jadi pemain yang memilih c akan dianggap salah padahal alasannya cocok dengan dokumen.
- putaran 2, omongan 2 · kunci (kunci): Pilihan kunci 'Betul,' tidak menyatakan bahwa bagian 'dia tau sesuatu' tidak bisa dipastikan dari kartu, padahal penjelasan sendiri mengakui alasan pembelian tidak terbaca di laporan.
- putaran 7, omongan 3 · tidak-menjawab (-): kritikus tidak menjawab (terpotong, tak terbaca, atau galat) dua kali

**DADA** — kritikus menilai 16 versi (18 panggilan; terpotong di 3 versi); cek makna: bagian klaim tak tercek disebut di 3 versi, pilihan lain juga benar di 0 versi; keberatan per jenis: tidak-menjawab 2, makna 1, ambigu 1, bahasa 1.

- putaran 1, omongan 1 · makna (penjelasan): Penjelasan menyatakan hasil patokan 7 Oktober 'beda' padahal tidak ada kartu tentang penutupan 7 Oktober, sehingga klaim itu tidak bisa dicek dari dokumen.
- putaran 4, omongan 3 · ambigu (pilihan): Pilihan a dan c terbaca hampir sama karena sama-sama menegaskan penghentian cuma sehari, sehingga pemain bisa menyingkirkan keduanya sekaligus lalu memilih b sebagai opsi paling hati-hati tanpa membaca kartu.
- putaran 5, omongan 2 · bahasa (kartu): Kartu 4 memuat frasa 'yang lolos seluruh pemeriksaan', istilah sistem yang bukan bagian dokumen resmi dan bisa membuat pemain bertanya apakah ada laporan yang tidak ikut dihitung.
- putaran 9, omongan 3 · tidak-menjawab (-): kritikus tidak menjawab (terpotong, tak terbaca, atau galat) dua kali
- putaran 10, omongan 3 · tidak-menjawab (-): kritikus tidak menjawab (terpotong, tak terbaca, atau galat) dua kali

### Penebak di dalam: siapa yang menebak benar tanpa kartu

| paket | model | tebakan | benar | proporsi benar |
|---|---|---:|---:|---:|
| TIRT | `deepseek-ai/DeepSeek-V4.1-Flash` | 14 | 10 | 0,71 |
| TIRT | `zai-org/GLM-5.3` | 7 | 4 | 0,57 |
| ULTJ | `deepseek-ai/DeepSeek-V4.1-Flash` | 14 | 7 | 0,50 |
| ULTJ | `zai-org/GLM-5.3` | 7 | 4 | 0,57 |
| DADA | `deepseek-ai/DeepSeek-V4.1-Flash` | 20 | 11 | 0,55 |
| DADA | `zai-org/GLM-5.3` | 10 | 8 | 0,80 |

### TIRT — putaran demi putaran

**Putaran 1** — tulis 1, 2, 3; sudut 1:susp-2025-12-10 (1.1), 2:naik-2025-11-26-2025-12-09 (1.1), 3:susp-2025-01-21 (1.1); US$0.0837, 524 s.

- omongan 1: **ditolak-tebak** · pembaca kartu b (kunci b) · kritikus: 0 keberatan · tanpa kartu b/60, b/65, b/62 (ke-3 = GLM)
  - pesan: "Fix disuspen hari ini gara-gara kelangsungan usahanya diragukan, sama kayak awal tahun." (kunci b)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "b", rata-rata keyakinan 62 (tebakan: b/60, b/65, b/62). Alasan mereka: "Suspensi harian di pasar lebih lazim karena kenaikan harga kumulatif, bukan isu kelangsungan usaha, sehingga klaim Rizky kemungkinan tidak cocok dengan dokumen." "Suspensi saham harian di
- omongan 2: **tidak-ada**
  - [bentuk] keluaran bukan JSON yang sah: JSON tidak bisa diurai: Unexpected non-whitespace character after JSON at position 1529 (line 1 column 1530)
- omongan 3: **lolos** · pembaca kartu a (kunci a) · kritikus: 0 keberatan · tanpa kartu b/65, b/78, b/60 (ke-3 = GLM)
  - pesan: "Aku masih ragu sih, yang disetop 21 Januari itu alasannya kelangsungan usaha ya?" (kunci a)

**Putaran 2** — tulis 1, 2; sudut 1:susp-2025-12-10 (1.2), 2:naik-2025-11-26-2025-12-09 (1.2); US$0.0573, 476 s.

- omongan 1: **lolos** · pembaca kartu a (kunci a) · kritikus: 0 keberatan · tanpa kartu b/65, b/70, b/60 (ke-3 = GLM)
  - pesan: "Yang disetop hari ini pasti gara-gara naiknya udah kelewat batas, bukan karena usaha mereka bermasalah." (kunci a)
- omongan 2: **ditolak-pemeriksa**
  - pesan: "Aku udah hafal polanya, dari 26 November sampai 9 Desember harganya naik Rp58. Itu angka gede banget buat saham receh." (kunci b)
  - [pemeriksa: ANGKA_TANPA_RUJUKAN] Pilihan a memuat angka di luar rujukan: 58, 48, 106.. Tulis tiap angka sebagai [[fact_id/teks]].
  - [pemeriksa: ANGKA_TANPA_RUJUKAN] Pilihan b memuat angka di luar rujukan: 58. Tulis tiap angka sebagai [[fact_id/teks]].
  - [pemeriksa: ANGKA_TANPA_RUJUKAN] Pilihan c memuat angka di luar rujukan: 21. Tulis tiap angka sebagai [[fact_id/teks]].

**Putaran 3** — tulis 2; sudut 2:naik-2025-11-26-2025-12-09 (1.3); US$0.0159, 122 s.

- omongan 2: **ditolak-pemeriksa**
  - pesan: "Aku udah hafal polanya, dari 26 November sampai 9 Desember naiknya Rp58. Itu tanda ada yang nampung diam-diam." (kunci a)
  - [pemeriksa: OPSI_PANJANG_TIMPANG] Panjang pilihan timpang: 35 lawan 63 karakter; yang terpendek harus ≥ 60% yang terpanjang.
  - [pemeriksa: ANGKA_TANPA_RUJUKAN] Penjelasan memuat angka di luar rujukan: 48, 106. Tulis tiap angka sebagai [[fact_id/teks]].
  - [pemeriksa: KUNCI_SERAGAM, seluruh draf] Huruf kunci ketiga omongan sama semua ("a").

**Putaran 4** — tulis 2; sudut 2:naik-2025-11-26-2025-12-09 (1.4); US$0.0159, 166 s.

- omongan 2: **ditolak-pemeriksa**
  - pesan: "Aku udah hafal polanya, dari 26 November sampai 9 Desember naiknya Rp58. Itu tanda ada yang nampung diam-diam." (kunci a)
  - [pemeriksa: OPSI_PANJANG_TIMPANG] Panjang pilihan timpang: 35 lawan 63 karakter; yang terpendek harus ≥ 60% yang terpanjang.
  - [pemeriksa: ANGKA_TANPA_RUJUKAN] Penjelasan memuat angka di luar rujukan: 48, 106. Tulis tiap angka sebagai [[fact_id/teks]].
  - [pemeriksa: KUNCI_SERAGAM, seluruh draf] Huruf kunci ketiga omongan sama semua ("a").

**Putaran 5** — tulis 2; sudut 2:naik-2025-11-26-2025-12-09 (1.5); US$0.0159, 168 s.

- omongan 2: **ditolak-pemeriksa**
  - pesan: "Aku udah hafal polanya, dari 26 November sampai 9 Desember naiknya Rp58. Itu tanda ada yang nampung diam-diam." (kunci a)
  - [pemeriksa: OPSI_PANJANG_TIMPANG] Panjang pilihan timpang: 35 lawan 63 karakter; yang terpendek harus ≥ 60% yang terpanjang.
  - [pemeriksa: ANGKA_TANPA_RUJUKAN] Penjelasan memuat angka di luar rujukan: 48, 106. Tulis tiap angka sebagai [[fact_id/teks]].
  - [pemeriksa: KUNCI_SERAGAM, seluruh draf] Huruf kunci ketiga omongan sama semua ("a").
- **sudut dibuang**: omongan 2 `naik-2025-11-26-2025-12-09` → `kelipatan-2025-11-26-2025-12-09`

**Putaran 6** — tulis 2; sudut 2:kelipatan-2025-11-26-2025-12-09 (2.1); US$0.0155, 205 s.

- omongan 2: **ditolak-pemeriksa**
  - pesan: "Gw udah bilang dari awal bulan, naiknya udah dua kali lipat lebih dari harga akhir November. Kalian baru sadar sekarang ya." (kunci b)
  - [pemeriksa: ANGKA_TANPA_RUJUKAN] Pilihan b memuat angka di luar rujukan: 2,21. Tulis tiap angka sebagai [[fact_id/teks]].
  - [pemeriksa: ANGKA_TANPA_RUJUKAN] Pilihan c memuat angka di luar rujukan: 1,21. Tulis tiap angka sebagai [[fact_id/teks]].
  - [pemeriksa: ANGKA_TANPA_RUJUKAN] Pilihan d memuat angka di luar rujukan: 2,21. Tulis tiap angka sebagai [[fact_id/teks]].

**Putaran 7** — tulis 2; sudut 2:kelipatan-2025-11-26-2025-12-09 (2.2); US$0.0159, 211 s.

- omongan 2: **ditolak-pemeriksa**
  - pesan: "Aku udah bilang dari awal bulan, harga penutupannya udah jadi 2,21 kali harga akhir November. Kalian baru ngeh ya." (kunci a)
  - [pemeriksa: ANGKA_TANPA_RUJUKAN] Penjelasan memuat angka di luar rujukan: 2,21, 26, 58. Tulis tiap angka sebagai [[fact_id/teks]].
  - [pemeriksa: KUNCI_SERAGAM, seluruh draf] Huruf kunci ketiga omongan sama semua ("a").

**Putaran 8** — tulis 2; sudut 2:kelipatan-2025-11-26-2025-12-09 (2.3); US$0.0083, 111 s.

- omongan 2: **ditolak-pemeriksa**
  - pesan: "Aku udah hitung dari awal bulan, penutupan terakhir udah 2,21 kali penutupan 1 Desember. Kalian baru ngeh ya." (kunci b)
  - [pemeriksa: ANGKA_TANPA_RUJUKAN] Penjelasan memuat angka di luar rujukan: 2,21. Tulis tiap angka sebagai [[fact_id/teks]].

**Putaran 9** — tulis 2; sudut 2:kelipatan-2025-11-26-2025-12-09 (2.4); US$0.0159, 158 s.

- omongan 2: **ditolak-pemeriksa**
  - pesan: "Aku udah bilang dari awal bulan bakal naik terus, sekarang penutupan terakhir udah 2,21 kali penutupan akhir November. Kalian baru ngeh ya." (kunci a)
  - [pemeriksa: KUNCI_SERAGAM, seluruh draf] Huruf kunci ketiga omongan sama semua ("a").

**Putaran 10** — tulis 2; sudut 2:kelipatan-2025-11-26-2025-12-09 (2.5); US$0.1679, 692 s.

- omongan 2: **kritikus-tidak-menjawab** · pembaca kartu b (kunci b) · kritikus: tidak menjawab
  - pesan: "Gw udah pantau dari awal bulan, penutupan terakhir udah 2,21 kali penutupan akhir November. Kalian baru ngeh ya." (kunci b)
  - [kritikus] kritikus tidak menjawab (terpotong, tak terbaca, atau galat) dua kali; versi ini diperiksa lagi di putaran berikutnya tanpa ditulis ulang.
- **sudut dibuang**: omongan 2 `kelipatan-2025-11-26-2025-12-09` → `hari-naik-beruntun`

**Putaran 11** — tulis 2; sudut 2:hari-naik-beruntun (3.1); US$0.1379, 756 s.

- omongan 2: **ditolak-tebak** · pembaca kartu b (kunci b) · kritikus: 0 keberatan · tanpa kartu b/65, b/60, b/100 (tak terbaca) (ke-3 = GLM)
  - pesan: "Aku hafal polanya, saham begini naiknya beruntun terus, minggu lalu juga gitu kan?" (kunci b)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "b", rata-rata keyakinan 75 (tebakan: b/65, b/60, b/100). Alasan mereka: "Naik beruntun saham biasanya dihitung dalam hari bursa, jadi opsi sembilan hari bursa lebih masuk akal daripada sembilan hari kalender." "Wulan menyebut naik beruntun; opsi yang paling m

**Putaran 12** — tulis 2; sudut 2:hari-naik-beruntun (3.2); US$0.1679, 1158 s.

- omongan 2: **kritikus-tidak-menjawab** · pembaca kartu b (kunci b) · kritikus: tidak menjawab
  - pesan: "Aku hafal polanya, saham begini naiknya beruntun terus, minggu lalu juga gitu kan?" (kunci b)
  - [kritikus] kritikus tidak menjawab (terpotong, tak terbaca, atau galat) dua kali; versi ini diperiksa lagi di putaran berikutnya tanpa ditulis ulang.

**Putaran 13** — tulis —; bawa 2; sudut 2:hari-naik-beruntun (3.3); US$0.0967, 527 s.

- omongan 2: **ditolak-tebak** · pembaca kartu b (kunci b) · kritikus: 0 keberatan · tanpa kartu b/60, b/65, b/55 (ke-3 = GLM)
  - pesan: "Aku hafal polanya, saham begini naiknya beruntun terus, minggu lalu juga gitu kan?" (kunci b)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "b", rata-rata keyakinan 60 (tebakan: b/60, b/65, b/55). Alasan mereka: "Dalam konteks pasar, rentetan naik dihitung hari bursa, dan sembilan hari bursa paling masuk akal dengan klaim Wulan tentang pola naik beruntun termasuk minggu lalu." "Pola naik beruntun 

**Putaran 14** — tulis 2; sudut 2:hari-naik-beruntun (3.4); US$0.1220, 1663 s.

- omongan 2: **ditolak-tebak** · pembaca kartu b (kunci b) · kritikus: 0 keberatan · tanpa kartu b/60, b/65, b/100 (tak terbaca) (ke-3 = GLM)
  - pesan: "Aku hafal polanya, saham begini naiknya beruntun terus, minggu lalu juga gitu kan?" (kunci b)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "b", rata-rata keyakinan 75 (tebakan: b/60, b/65, b/100). Alasan mereka: "Klaim Wulan tentang naik beruntun paling masuk akal jika dokumen menyebut sembilan hari bursa, bukan hari kalender, karena pasar saham dihitung per hari bursa." "Dalam konteks saham, nai

**Putaran 15** — tulis 2; sudut 2:hari-naik-beruntun (3.5); US$0.1638, 833 s.

- omongan 2: **ditolak-tebak** · pembaca kartu b (kunci b) · kritikus: 0 keberatan · tanpa kartu b/60, b/66, c/45 (ke-3 = GLM)
  - pesan: "Aku hafal polanya, saham begini naiknya beruntun terus, minggu lalu juga gitu kan?" (kunci b)
  - [penebak tanpa kartu] 2/3 penebak TANPA kartu memilih kunci "b", rata-rata keyakinan 63 (tebakan: b/60, b/66, c/45). Alasan mereka: "Di pasar saham rentetan kenaikan biasanya dihitung dalam hari bursa, dan sembilan hari bursa paling masuk akal untuk klaim 'naik beruntun terus'." "Di bursa, rentetan kenaikan biasanya di
- **sudut dibuang**: omongan 2 `hari-naik-beruntun` → tidak ada pengganti

### ULTJ — putaran demi putaran

**Putaran 1** — tulis 1, 2, 3; sudut 1:tahun-berdividen (1.1), 2:fil-jan-orang-dalam-lain (1.1), 3:turun-2026-05-04 (1.1); US$0.2318, 1826 s.

- omongan 1: **lolos** · pembaca kartu c (kunci c) · kritikus: 0 keberatan · tanpa kartu b/65, b/58, b/60 (ke-3 = GLM)
  - pesan: "Dividen Perusahaan U tuh tiap tahun keluar terus, dari dulu ga pernah bolos. Aman lah." (kunci c)
- omongan 2: **ditolak-pemeriksa**
  - pesan: "Orang dalem lain di Perusahaan U itu beli terus sepanjang Januari, gw yakin dia tau sesuatu nih." (kunci a)
  - [pemeriksa: KATA_PENILAIAN] Penjelasan memakai kata penilaian "bagus"; produk ini tidak menilai saham.
  - [pemeriksa: G-panjang] Pilihan a 12 kata; paling banyak 11 kata (pilihan manusia terpanjang di kasus yang hidup). Satu label + satu klausa pendek.
- omongan 3: **ditolak-tebak** · pembaca kartu c (kunci c) · kritikus: 0 keberatan · tanpa kartu c/80, c/85, c/75 (ke-3 = GLM)
  - pesan: "Hari ini bukanya turun lumayan jauh, kayak kebesaran buat sekadar ex dividen. Gw ragu nih." (kunci c)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "c", rata-rata keyakinan 80 (tebakan: c/80, c/85, c/75). Alasan mereka: "Tio merasa penurunan buka terlalu besar untuk sekadar ex dividen, dan opsi c menyatakan turun Rp145 lebih besar dari dividen Rp130." "Tio menilai penurunan buka terlalu besar untuk sekada

**Putaran 2** — tulis 2, 3; sudut 2:fil-jan-orang-dalam-lain (1.2), 3:turun-2026-05-04 (1.2); US$0.1418, 669 s.

- omongan 2: **ditolak-kritikus** · pembaca kartu a (kunci a) · kritikus: 4 keberatan
  - pesan: "Orang dalem lain di Perusahaan U itu beli terus sepanjang Januari, gw yakin dia tau sesuatu nih." (kunci a)
  - [kritikus: makna, kunci] Bagian klaim teman yang tidak bisa dicek dari kartu: "dia tau sesuatu (motif orang dalam membeli) — kartu hanya memuat transaksi dan jumlah lembar, tidak ada yang menunjukka…"; kunci tidak boleh "Betul" kecuali pilihan itu menyatakan bagian tersebut tak bisa dipastikan.
  - [kritikus: kunci, pilihan] Pilihan c juga benar menurut kartu (Kartu 3 dan 4 membenarkan persis isi pilihan c — porsi naik dari 1,21 persen ke 1,37 persen — sehingga ada dua pilihan 'Betul,' yang sama-sama didukung kartu.); hanya satu pilihan yang boleh benar.
  - [kritikus: ambigu, pilihan] Pilihan c juga benar menurut kartu 3 dan 4, jadi pemain yang memilih c akan dianggap salah padahal alasannya cocok dengan dokumen.
- omongan 3: **ditolak-tebak** · pembaca kartu b (kunci b) · kritikus: 0 keberatan · tanpa kartu b/65, b/65, b/65 (ke-3 = GLM)
  - pesan: "Hari ini harganya turun, tapi gw ragu nih turunnya kayak lebih kecil dari dividennya. Bener ga sih?" (kunci b)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "b", rata-rata keyakinan 65 (tebakan: b/65, b/65, b/65). Alasan mereka: "Angka turun Rp145 lebih besar dari dividen Rp130, jadi omongan Adit yang merasa turunnya lebih kecil justru keliru." "Adit mengira penurunan lebih kecil dari dividen, tetapi opsi b menyeb

**Putaran 3** — tulis 2, 3; sudut 2:fil-jan-orang-dalam-lain (1.3), 3:turun-2026-05-04 (1.3); US$0.1141, 767 s.

- omongan 2: **lolos** · pembaca kartu a (kunci a) · kritikus: 0 keberatan · tanpa kartu b/60, b/65, b/55 (ke-3 = GLM)
  - pesan: "Orang dalam lain itu beli terus sepanjang Januari, malah lebih banyak dari pemilik terbesarnya. Gw sih udah cek laporannya." (kunci a)
- omongan 3: **ditolak-pemeriksa**
  - pesan: "Hari ini ex dividen katanya. Gw ragu nih, turunnya di pembukaan kok beda ya dari angka dividennya?" (kunci b)
  - [pemeriksa: OPSI_PANJANG_TIMPANG] Panjang pilihan timpang: 35 lawan 62 karakter; yang terpendek harus ≥ 60% yang terpanjang.

**Putaran 4** — tulis 3; sudut 3:turun-2026-05-04 (1.4); US$0.0161, 206 s.

- omongan 3: **ditolak-pemeriksa**
  - pesan: "Hari ini katanya tanggal ex dividen. Gw ragu sih, turunnya di pembukaan kok beda dari angka dividennya ya?" (kunci b)
  - [pemeriksa: OPSI_PANJANG_TIMPANG] Panjang pilihan timpang: 35 lawan 62 karakter; yang terpendek harus ≥ 60% yang terpanjang.

**Putaran 5** — tulis 3; sudut 3:turun-2026-05-04 (1.5); US$0.0718, 428 s.

- omongan 3: **ditolak-tebak** · pembaca kartu b (kunci b) · kritikus: 0 keberatan · tanpa kartu b/65, b/60, b/55 (ke-3 = GLM)
  - pesan: "Hari ini katanya ex dividen. Gw ragu, turunnya kok pas banget sama angka dividennya ya?" (kunci b)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "b", rata-rata keyakinan 60 (tebakan: b/65, b/60, b/55). Alasan mereka: "Jika dokumen menyebut turun Rp145 sedangkan dividennya Rp130, maka omongan Nadia yang merasa turunnya 'pas banget' tidak cocok." "Nadia mengira penurunan harga persis sebesar dividen, tet
- **sudut dibuang**: omongan 3 `turun-2026-05-04` → `laporan-jan-2026`

**Putaran 6** — tulis 3; sudut 3:laporan-jan-2026 (2.1); US$0.0050, 74 s.

- omongan 3: **ditolak-pemeriksa**
  - pesan: "Katanya orang dalam Perusahaan U borong saham terus sepanjang Januari, ga ada yang jual. Aku ikut-ikutan percaya aja sih." (kunci c)
  - [pemeriksa: AJAKAN_TRANSAKSI] Pesan memuat ajakan bertransaksi: "borong".

**Putaran 7** — tulis 3; sudut 3:laporan-jan-2026 (2.2); US$0.1556, 787 s.

- omongan 3: **kritikus-tidak-menjawab** · pembaca kartu b (kunci b) · kritikus: tidak menjawab
  - pesan: "Katanya laporan orang dalam Perusahaan U bulan Januari cuma sedikit doang. Aku ikut-ikutan percaya aja sih." (kunci b)
  - [kritikus] kritikus tidak menjawab (terpotong, tak terbaca, atau galat) dua kali; versi ini diperiksa lagi di putaran berikutnya tanpa ditulis ulang.

**Putaran 8** — tulis —; bawa 3; sudut 3:laporan-jan-2026 (2.3); US$0.1461, 556 s.

- omongan 3: **ditolak-tebak** · pembaca kartu b (kunci b) · kritikus: 0 keberatan · tanpa kartu a/60, b/60, b/50 (ke-3 = GLM)
  - pesan: "Katanya laporan orang dalam Perusahaan U bulan Januari cuma sedikit doang. Aku ikut-ikutan percaya aja sih." (kunci b)
  - [penebak tanpa kartu] 2/3 penebak TANPA kartu memilih kunci "b", rata-rata keyakinan 55 (tebakan: a/60, b/60, b/50). Alasan mereka: "Pesan Nadia hanya rumor; dokumen mencatat 8 laporan orang dalam Perusahaan U bulan Januari, sehingga tidak cocok." "Pesan Nadia cuma desas-desus ('ikut-ikutan percaya'), dan pilihan (a) y

**Putaran 9** — tulis 3; sudut 3:laporan-jan-2026 (2.4); US$0.0692, 300 s.

- omongan 3: **lolos** · pembaca kartu a (kunci a) · kritikus: 0 keberatan · tanpa kartu b/70, b/68, b/65 (ke-3 = GLM)
  - pesan: "Katanya orang dalam Perusahaan U pada beli saham terus bulan Januari, ga ada yang jual. Aku ikut-ikutan percaya aja sih." (kunci a)

### DADA — putaran demi putaran

**Putaran 1** — tulis 1, 2, 3; sudut 1:kelipatan-2025-08-01-2025-10-08 (1.1), 2:jumlah-jual-terverifikasi (1.1), 3:susp-2025-06-30 (1.1); US$0.1746, 1103 s.

- omongan 1: **ditolak-kritikus** · pembaca kartu a (kunci a) · kritikus: 1 keberatan
  - pesan: "Gw baru cek, saham D naik 22 kali lipat belakangan ini. Gilaaa, ga nyangka banget." (kunci a)
  - [kritikus: makna, penjelasan] Penjelasan menyatakan hasil patokan 7 Oktober 'beda' padahal tidak ada kartu tentang penutupan 7 Oktober, sehingga klaim itu tidak bisa dicek dari dokumen.
  - [kritikus: arahan] Ubah kalimat penolakan pilihan b di penjelasan: cukup katakan tidak ada dokumen tentang penutupan 7 Oktober, tanpa mengklaim hasilnya pasti berbeda.
- omongan 2: **ditolak-pemeriksa**
  - pesan: "Pemilik terbesarnya cuma jual 70 juta lembar doang, gw yakin itu angka totalnya. Gw udah hafal pola beginian." (kunci b)
  - [pemeriksa: KUNCI_TAK_TERBUKTI_KARTU] Pilihan kunci merujuk "laporan-jual-terverifikasi", yang bukan kartu omongan ini; pemain tidak bisa mencocokkannya.
- omongan 3: **ditolak-tebak** · pembaca kartu c (kunci c) · kritikus: 0 keberatan · tanpa kartu c/70, c/80, c/62 (ke-3 = GLM)
  - pesan: "Aku masih ragu nih, saham D disetop 30 Juni itu gara-gara harganya naik kebablasan ya?" (kunci c)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "c", rata-rata keyakinan 71 (tebakan: c/70, c/80, c/62). Alasan mereka: "Penghentian saham pada 30 Juni umumnya karena belum menyampaikan laporan keuangan auditan tahunan, bukan karena harga naik terlalu cepat." "Penghentian saham pada 30 Juni lebih wajar kare

**Putaran 2** — tulis 1, 2, 3; sudut 1:kelipatan-2025-08-01-2025-10-08 (1.2), 2:jumlah-jual-terverifikasi (1.2), 3:susp-2025-06-30 (1.2); US$0.1540, 1099 s.

- omongan 1: **ditolak-pemeriksa**
  - pesan: "Gw baru cek, saham D naik 22 kali lipat belakangan ini. Yakin gw, angkanya beneran." (kunci a)
  - [pemeriksa: ANGKA_TANPA_RUJUKAN] Pilihan d memuat angka di luar rujukan: 1. Tulis tiap angka sebagai [[fact_id/teks]].
- omongan 2: **ditolak-tebak** · pembaca kartu b (kunci b) · kritikus: 0 keberatan · tanpa kartu b/60, b/60, b/55 (ke-3 = GLM)
  - pesan: "Pemilik terbesarnya cuma lepas 70 juta lembar doang, gw yakin itu total jualnya. Gw udah hafal pola beginian." (kunci b)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "b", rata-rata keyakinan 58 (tebakan: b/60, b/60, b/55). Alasan mereka: "Sari terlalu yakin hanya melihat satu transaksi 70 juta lembar, padahal total penjualan pemilik terbesar kemungkinan 299.500.000 lembar dari beberapa laporan." "Sari hanya melihat satu tr
- omongan 3: **ditolak-tebak** · pembaca kartu b (kunci b) · kritikus: 0 keberatan · tanpa kartu d/62, d/75, b/60 (ke-3 = GLM)
  - pesan: "Aku masih ragu nih, saham D disetop 30 Juni itu cuma sehari doang ya?" (kunci b)
  - [penebak tanpa kartu] 1/3 penebak TANPA kartu memilih kunci "b", rata-rata keyakinan 60 (tebakan: d/62, d/75, b/60). Alasan mereka: "Tanpa dokumen, klaim 'hanya sehari' tidak bisa diverifikasi, dan pilihan lain terlalu spesifik atau hanya mengulang perkataan Nadia, jadi kemungkinan besar durasi penghentian memang tidak

**Putaran 3** — tulis 1, 2, 3; sudut 1:kelipatan-2025-08-01-2025-10-08 (1.3), 2:jumlah-jual-terverifikasi (1.3), 3:susp-2025-06-30 (1.3); US$0.1611, 1062 s.

- omongan 1: **lolos** · pembaca kartu a (kunci a) · kritikus: 0 keberatan · tanpa kartu c/65, c/65, c/70 (ke-3 = GLM)
  - pesan: "Gw baru cek, saham D naik 22 kali lipat. Serius, gw ga ngarang, angkanya segitu." (kunci a)
- omongan 2: **ditolak-pemeriksa**
  - pesan: "Pemilik terbesarnya jualan terus, gw yakin dia udah lepas 299,5 juta lembar. Gw udah hafal pola beginian." (kunci a)
  - [pemeriksa: G-angka-cukup] Pilihan kunci a bisa dihitung dari angka yang sudah ada di pesan dan pilihan, tanpa kartu: "299.500.000" = 299,5 − 3 = 299.499.997. Penebak akan menghitungnya. Jangan taruh di pesan dan pilihan semua angka yang dibutuhkan untuk menghitung klaim kunci — biarkan angka penentunya hanya ada di ka
- omongan 3: **ditolak-tebak** · pembaca kartu d (kunci d) · kritikus: 0 keberatan · tanpa kartu d/60, d/75, d/60 (ke-3 = GLM)
  - pesan: "Aku masih ragu, saham D disetop 30 Juni itu gara-gara harganya naik kebablasan ya?" (kunci d)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "d", rata-rata keyakinan 65 (tebakan: d/60, d/75, d/60). Alasan mereka: "Alasan resmi suspensi saham di dokumen biasanya berupa keterlambatan laporan keuangan, bukan harga naik kebablasan seperti dugaan Wulan." "Tanggal 30 Juni biasanya terkait suspensi karena

**Putaran 4** — tulis 2, 3; sudut 2:jumlah-jual-terverifikasi (1.4), 3:susp-2025-06-30 (1.4); US$0.1431, 842 s.

- omongan 2: **ditolak-tebak** · pembaca kartu b (kunci b) · kritikus: 0 keberatan · tanpa kartu c/55, c/45, b/60 (ke-3 = GLM)
  - pesan: "Pemilik terbesarnya cuma lepas 70 juta lembar doang. Gw udah tau polanya, abis itu dia diem aja." (kunci b)
  - [penebak tanpa kartu] 1/3 penebak TANPA kartu memilih kunci "b", rata-rata keyakinan 60 (tebakan: c/55, c/45, b/60). Alasan mereka: "Klaim 'cuma 70 juta terus diem' khasnya cuma lihat laporan pertama; dokumen semacam ini biasanya mencatat beberapa transaksi berturut, dan 179,5 juta tampak seperti jumlah parsial (70 + 1
- omongan 3: **ditolak-kritikus** · pembaca kartu b (kunci b) · kritikus: 1 keberatan
  - pesan: "Aku masih ragu soal saham D yang disetop 30 Juni itu. Bener kan berhentinya cuma sehari doang?" (kunci b)
  - [kritikus: ambigu, pilihan] Pilihan a dan c terbaca hampir sama karena sama-sama menegaskan penghentian cuma sehari, sehingga pemain bisa menyingkirkan keduanya sekaligus lalu memilih b sebagai opsi paling hati-hati tanpa membaca kartu.
  - [kritikus: arahan] Bedakan pilihan a dan c supaya tidak sama-sama bermakna 'penghentian cuma sehari'; kemiripannya membuat pemain bisa menebak kunci tanpa kartu.

**Putaran 5** — tulis 2, 3; sudut 2:jumlah-jual-terverifikasi (1.5), 3:susp-2025-06-30 (1.5); US$0.1196, 740 s.

- omongan 2: **ditolak-kritikus** · pembaca kartu a (kunci a) · kritikus: 1 keberatan
  - pesan: "Pemilik terbesarnya jualan terus ya. Gw yakin dia udah lepas 299,5 juta lembar, bukan cuma sekali doang." (kunci a)
  - [kritikus: bahasa, kartu] Kartu 4 memuat frasa 'yang lolos seluruh pemeriksaan', istilah sistem yang bukan bagian dokumen resmi dan bisa membuat pemain bertanya apakah ada laporan yang tidak ikut dihitung.
  - [kritikus: arahan] Hapus frasa 'yang lolos seluruh pemeriksaan' dari Kartu 4 dan biarkan kartu hanya menampilkan penjumlahan tiga laporan.
- omongan 3: **ditolak-tebak** · pembaca kartu c (kunci c) · kritikus: 0 keberatan · tanpa kartu d/65, c/78, c/72 (ke-3 = GLM)
  - pesan: "Aku masih ragu soal saham D yang disetop 30 Juni itu. Menurutku sih gara-gara harganya naik kebablasan, tapi aku ga yakin." (kunci c)
  - [penebak tanpa kartu] 2/3 penebak TANPA kartu memilih kunci "c", rata-rata keyakinan 75 (tebakan: d/65, c/78, c/72). Alasan mereka: "Tanggal 30 Juni biasanya terkait batas akhir penyampaian laporan keuangan auditan, jadi alasan yang paling masuk akal adalah keterlambatan laporan, bukan harga naik kebablasan." "Tanggal 
- **sudut dibuang**: omongan 2 `jumlah-jual-terverifikasi` → `laporan-jual-terverifikasi`
- **sudut dibuang**: omongan 3 `susp-2025-06-30` → `andai-10-lot-dividen`

**Putaran 6** — tulis 2, 3; sudut 2:laporan-jual-terverifikasi (2.1), 3:andai-10-lot-dividen (2.1); US$0.1060, 578 s.

- omongan 2: **ditolak-tebak** · pembaca kartu d (kunci d) · kritikus: 0 keberatan · tanpa kartu d/55, d/68, d/60 (ke-3 = GLM)
  - pesan: "Gw udah baca semua laporannya, pemilik terbesar jualan di 3 laporan, semuanya terbit Agustus. Gw yang pertama sadar." (kunci d)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "d", rata-rata keyakinan 61 (tebakan: d/55, d/68, d/60). Alasan mereka: "Sinta mengklaim ketiga laporan terbit Agustus, tetapi satu laporan kemungkinan baru terbit 1 September sehingga omongannya tidak cocok." "Klaim Sinta bahwa semua laporan terbit Agustus ke
- omongan 3: **ditolak-tebak** · pembaca kartu a (kunci a) · kritikus: 0 keberatan · tanpa kartu a/75, a/82, a/72 (ke-3 = GLM)
  - pesan: "Katanya yang punya 10 lot dapet dividen Rp140 ya? Di grup sebelah rame banget bahas itu, aku jadi ikut penasaran." (kunci a)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "a", rata-rata keyakinan 76 (tebakan: a/75, a/82, a/72). Alasan mereka: "10 lot sama dengan 1.000 lembar, jadi Rp140 setara Rp0,14 per lembar." "10 lot sama dengan 1.000 lembar, sehingga dividen Rp140 setara Rp0,14 per lembar." "10 lot = 1.000 lembar, dan Rp14

**Putaran 7** — tulis 2, 3; sudut 2:laporan-jual-terverifikasi (2.2), 3:andai-10-lot-dividen (2.2); US$0.0870, 546 s.

- omongan 2: **lolos** · pembaca kartu b (kunci b) · kritikus: 0 keberatan · tanpa kartu d/60, d/65, c/45 (ke-3 = GLM)
  - pesan: "Gw udah baca semua laporannya dari awal, pemilik terbesar jualan di 3 laporan dan transaksinya semua di Agustus." (kunci b)
- omongan 3: **ditolak-pemeriksa**
  - pesan: "Katanya tiap lot dapet dividen Rp140 ya? Di grup sebelah rame banget, aku jadi ikut penasaran." (kunci a)
  - [pemeriksa: ANDAIAN_DI_OMONGAN_BETUL] "tiap lot" ditandai andaian, padahal jawabannya Betul: omongan yang betul tidak boleh memuat angka yang tidak ada di dokumen.

**Putaran 8** — tulis 3; sudut 3:andai-10-lot-dividen (2.3); US$0.0103, 116 s.

- omongan 3: **ditolak-pemeriksa**
  - pesan: "Katanya yang pegang 10 lot dapet dividen Rp140 ya? Di grup sebelah rame banget, aku jadi ikut penasaran." (kunci a)
  - [pemeriksa: ANGKA_TAK_COCOK] Pilihan c: [[andai-10-lot-dividen/100 lot]] menampilkan 100, yang tidak ada di fakta itu (Pengandaian: pemilik 10 lot (1.000 lembar) menerima 1.000 × Rp0,14 = Rp140 dividen tunai sebelum pajak.)
  - [pemeriksa: G-angka-cukup] Pilihan kunci a bisa dihitung dari angka yang sudah ada di pesan dan pilihan, tanpa kartu: "140" = 140 − 0,14 = 139,86. Penebak akan menghitungnya. Jangan taruh di pesan dan pilihan semua angka yang dibutuhkan untuk menghitung klaim kunci — biarkan angka penentunya hanya ada di kartu.

**Putaran 9** — tulis 3; sudut 3:andai-10-lot-dividen (2.4); US$0.1674, 696 s.

- omongan 3: **kritikus-tidak-menjawab** · pembaca kartu b (kunci b) · kritikus: tidak menjawab
  - pesan: "Katanya tiap tahun dividennya keluar terus ya? Di grup sebelah rame banget, aku jadi ikut penasaran." (kunci b)
  - [kritikus] kritikus tidak menjawab (terpotong, tak terbaca, atau galat) dua kali; versi ini diperiksa lagi di putaran berikutnya tanpa ditulis ulang.

**Putaran 10** — tulis —; bawa 3; sudut 3:andai-10-lot-dividen (2.5); US$0.1518, 507 s.

- omongan 3: **kritikus-tidak-menjawab** · pembaca kartu b (kunci b) · kritikus: tidak menjawab
  - pesan: "Katanya tiap tahun dividennya keluar terus ya? Di grup sebelah rame banget, aku jadi ikut penasaran." (kunci b)
  - [kritikus] kritikus tidak menjawab (terpotong, tak terbaca, atau galat) dua kali; versi ini diperiksa lagi di putaran berikutnya tanpa ditulis ulang.
- **sudut dibuang**: omongan 3 `andai-10-lot-dividen` → `harga-2025-10-08`

**Putaran 11** — tulis 3; sudut 3:harga-2025-10-08 (3.1); US$0.0015, 34 s.


## Draf akhir

### TIRT — tidak terbit (omongan 2 gagal di 3 sudut (naik-2025-11-26-2025-12-09, kelipatan-2025-11-26-2025-12-09, hari-naik-beruntun); simulasi tidak terbit); omongan yang dikunci

**Omongan 1** (dikunci di putaran 2, sudut `susp-2025-12-10`)

> **Tio (19.05):** Yang disetop hari ini pasti gara-gara naiknya udah kelewat batas, bukan karena usaha mereka bermasalah.

- **a) Betul, hari ini disetop karena kenaikan harga kumulatif.** (kunci)
- b) Keliru, hari ini disetop karena keraguan kelangsungan usaha.
- c) Betul, hari ini disetop karena volume perdagangan nol.
- d) Keliru, hari ini disetop karena harga turun tajam.

**Omongan 3** (dikunci di putaran 1, sudut `susp-2025-01-21`)

> **Sinta (20.15):** Aku masih ragu sih, yang disetop 21 Januari itu alasannya kelangsungan usaha ya?

- **a) Betul, Januari dihentikan karena keraguan kelangsungan usaha.** (kunci)
- b) Keliru, Januari dihentikan karena kenaikan harga kumulatif.
- c) Betul, Januari dihentikan karena volume perdagangan nol.
- d) Keliru, Januari dihentikan karena harga turun tajam.

### ULTJ — **terbit**, draf utuh apa adanya

**Omongan 1**

> **Wulan (19.42):** Dividen Perusahaan U tuh tiap tahun keluar terus, dari dulu ga pernah bolos. Aman lah.

- a) Betul, dividennya makin besar tiap tahun tanpa kecuali.
- b) Keliru, ada tahun yang bolos tanpa pembagian dividen.
- **c) Betul, pembagiannya tercatat beruntun selama 7 tahun.** (kunci)
- d) Keliru, yang tercatat cuma pembagian tahun ini saja.

**Omongan 2**

> **Sinta (20.31):** Orang dalam lain itu beli terus sepanjang Januari, malah lebih banyak dari pemilik terbesarnya. Gw sih udah cek laporannya.

- **a) Betul, dia nambah 16,07 juta lembar sepanjang Januari.** (kunci)
- b) Keliru, yang nambah lebih banyak justru pemilik terbesarnya.
- c) Betul, dia nambahnya cuma lewat 2 laporan.
- d) Keliru, dia cuma menambah 1 juta lembar.

**Omongan 3**

> **Fitri (21.15):** Katanya orang dalam Perusahaan U pada beli saham terus bulan Januari, ga ada yang jual. Aku ikut-ikutan percaya aja sih.

- **a) Betul, semuanya pembelian tanpa ada yang jual.** (kunci)
- b) Keliru, ada juga laporan yang isinya penjualan.
- c) Betul, yang beli cuma orang dalam lain.
- d) Keliru, laporannya cuma dua laporan.

```json
{
  "omongan": [
    {
      "nama": "Wulan",
      "jam": "19.42",
      "pesan": "Dividen Perusahaan U tuh tiap tahun keluar terus, dari dulu ga pernah bolos. Aman lah.",
      "angka_pesan": [],
      "kartu": [
        "tahun-berdividen",
        "dividen-tercatat",
        "div-2021-09-01",
        "div-2022-08-04"
      ],
      "kartu_penentu": [
        "tahun-berdividen",
        "dividen-tercatat"
      ],
      "pilihan": {
        "a": "Betul, dividennya makin besar tiap tahun tanpa kecuali.",
        "b": "Keliru, ada tahun yang bolos tanpa pembagian dividen.",
        "c": "Betul, pembagiannya tercatat beruntun selama [[tahun-berdividen|7 tahun]].",
        "d": "Keliru, yang tercatat cuma pembagian tahun ini saja."
      },
      "kunci": "c",
      "penjelasan": "Kalau daftar aksi korporasinya dibuka, pembagian dividen tunai muncul tiap tahun tanpa ada tahun yang kosong, dan jumlahnya [[tahun-berdividen|7 tahun]] beruntun. Daftar yang sama juga memuat [[dividen-tercatat|7 pembagian]] dari yang paling lama sampai hari ini. Yang tidak terbaca di situ: nilainya tidak selalu naik, sebab ada tahun dengan [[div-2021-09-01|Rp85]] per lembar dan tahun sesudahnya [[div-2022-08-04|Rp25]] per lembar. Jadi soal rutinnya cocok, sedangkan yang bilang ada tahun bolos atau cuma sekali bagi tidak cocok. Salah-kaprah yang umum: orang menyamakan dividen yang rutin dengan dividen yang naik terus, padahal yang tercatat cuma soal rutinnya."
    },
    {
      "nama": "Sinta",
      "jam": "20.31",
      "pesan": "Orang dalam lain itu beli terus sepanjang Januari, malah lebih banyak dari pemilik terbesarnya. Gw sih udah cek laporannya.",
      "angka_pesan": [],
      "kartu": [
        "fil-jan-orang-dalam-lain",
        "fil-jan-pemilik-terbesar",
        "fil-jan-orang-dalam-lain-laporan",
        "fil-jan-pemilik-terbesar-laporan"
      ],
      "kartu_penentu": [
        "fil-jan-orang-dalam-lain",
        "fil-jan-pemilik-terbesar"
      ],
      "pilihan": {
        "a": "Betul, dia nambah [[fil-jan-orang-dalam-lain|16,07 juta lembar]] sepanjang Januari.",
        "b": "Keliru, yang nambah lebih banyak justru pemilik terbesarnya.",
        "c": "Betul, dia nambahnya cuma lewat [[fil-jan-pemilik-terbesar-laporan|2 laporan]].",
        "d": "Keliru, dia cuma menambah [[fil-jan-pemilik-terbesar|1 juta lembar]]."
      },
      "kunci": "a",
      "penjelasan": "Kalau laporan kepemilikan sahamnya dibuka, orang dalam lain muncul berkali-kali sepanjang Januari dan semuanya pembelian. Kalau ditotal, tambahannya [[fil-jan-orang-dalam-lain|16,07 juta lembar]] yang tersebar di [[fil-jan-orang-dalam-lain-laporan|6 laporan]]. Bandingkan dengan pemilik terbesar, yang cuma menambah [[fil-jan-pemilik-terbesar|1 juta lembar]] lewat [[fil-jan-pemilik-terbesar-laporan|2 laporan]]. Jadi yang bilang orang dalam lain menambah lebih banyak dari pemilik terbesar itu cocok. Yang tidak terbaca di situ: alasan mereka membeli, sebab laporannya cuma memuat transaksi dan jumlah lembar. Salah-kaprah yang umum: orang mengira pemilik terbesar selalu yang paling banyak menambah, padahal yang tercatat di Januari justru sebaliknya."
    },
    {
      "nama": "Fitri",
      "jam": "21.15",
      "pesan": "Katanya orang dalam Perusahaan U pada beli saham terus bulan Januari, ga ada yang jual. Aku ikut-ikutan percaya aja sih.",
      "angka_pesan": [],
      "kartu": [
        "laporan-jan-2026",
        "fil-jan-orang-dalam-lain-laporan",
        "fil-jan-pemilik-terbesar-laporan"
      ],
      "kartu_penentu": [
        "laporan-jan-2026"
      ],
      "pilihan": {
        "a": "Betul, semuanya pembelian tanpa ada yang jual.",
        "b": "Keliru, ada juga laporan yang isinya penjualan.",
        "c": "Betul, yang beli cuma orang dalam lain.",
        "d": "Keliru, laporannya cuma [[fil-jan-pemilik-terbesar-laporan|dua laporan]]."
      },
      "kunci": "a",
      "penjelasan": "Kalau daftar laporan kepemilikan dibuka, sepanjang Januari ada [[laporan-jan-2026|8 laporan]] dan isinya pembelian semua, tidak ada satu pun yang penjualan. Yang lapor juga bukan cuma satu pihak: pemilik terbesar muncul [[fil-jan-pemilik-terbesar-laporan|2 laporan]] dan orang dalam lain [[fil-jan-orang-dalam-lain-laporan|6 laporan]]. Yang tidak terbaca di situ: alasan mereka membeli, sebab laporannya cuma memuat tanggal transaksi dan jumlah lembar. Jadi yang bilang ada laporan penjualan tidak cocok, begitu juga yang bilang yang beli cuma satu pihak atau laporannya cuma dua. Salah-kaprah yang umum: orang mengira laporan orang dalam selalu campur beli dan jual, padahal yang tercatat di Januari justru semuanya pembelian."
    }
  ]
}
```

### DADA — tidak terbit (pagu tercapai: Pagu milestone tercapai: biaya milestone (tag m2d4/*) US$3.962874 + perkiraan maksimum US$0.079726 untuk zai-org/GLM-5.3 > pagu milestone US$4.00. Panggilan tidak dikirim.); omongan yang dikunci

**Omongan 1** (dikunci di putaran 3, sudut `kelipatan-2025-08-01-2025-10-08`)

> **Adit (20.15):** Gw baru cek, saham D naik 22 kali lipat. Serius, gw ga ngarang, angkanya segitu.

- **a) Betul, dari penutupan 1 Agustus ke penutupan 8 Oktober.** (kunci)
- b) Betul, dari penutupan 1 Agustus ke penutupan 7 Oktober.
- c) Keliru, angkanya cuma 2,25 kali dari patokan itu.
- d) Keliru, patokan awalnya penutupan 7 Oktober.

**Omongan 2** (dikunci di putaran 7, sudut `laporan-jual-terverifikasi`)

> **Nadia (21.30):** Gw udah baca semua laporannya dari awal, pemilik terbesar jualan di 3 laporan dan transaksinya semua di Agustus.

- a) Betul, ketiga laporan itu terbit di hari yang sama.
- **b) Betul, ketiga transaksinya tercatat 12 Agustus sampai 14 Agustus.** (kunci)
- c) Keliru, cuma dua laporan penjualan yang tercatat.
- d) Keliru, transaksi terakhirnya jatuh 1 September.

## Panjang dan bentuk pilihan dibanding soal manusia

Dihitung dengan fungsi gerbang (`hitungKata`, `masalahKlausa`, `gRegister`) atas omongan yang dikunci. Batas M2d-4: pilihan ≤ 11 kata, pesan ≤ 26 kata.

| sumber | omongan | kata/pilihan rata | maks | pilihan > batas | pilihan berekor (bukan satu klausa) | kata/pesan rata | maks | pesan ber-"gue" |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| agen M2d-4 | 7 | 7,5 | 9 | 0 | 0/28 | 16,4 | 20 | 0/7 |
| agen M2d-3 | 8 | 10,3 | 14 | 8 | 10/32 | 24,9 | 30 | 8/8 |
| manusia (DADA, ULTJ) | 6 | 8,5 | 11 | 0 | 0/24 | 19,0 | 26 | 3/6 |

## Pembanding eksternal

Penguji dan penilai: subagent Claude (opus) **baru**, tanpa konteks eksekutor, masing-masing hanya menerima isi satu berkas bahan (`eval/keluaran-m2d4/penguji/`); label acak. Jawaban mentah: `penguji/jawaban/`. Petunjuk sama persis dengan M2d-1…M2d-3.

### Tebak buta (tanpa kartu) — gerbang-dalam vs penguji-luar

| paket | omongan | kunci | di dalam (DeepSeek, DeepSeek, GLM) | di luar (3 subagent) | benar luar | yakin benar | lolos luar |
|---|---:|---|---|---|---:|---:|---|
| TIRT | 1 | a | b/65, b/70, b/60 | b/50, a/50, b/50 | 1/3 | 50 | **tidak** |
| TIRT | 3 | a | b/65, b/78, b/60 | b/55, a/40, b/55 | 1/3 | 40 | **tidak** |
| ULTJ | 1 | c | b/65, b/58, b/60 | b/45, b/55, b/50 | 0/3 | — | ya |
| ULTJ | 2 | a | b/60, b/65, b/55 | b/45, b/40, b/40 | 0/3 | — | ya |
| ULTJ | 3 | a | b/70, b/68, b/65 | b/55, b/45, b/55 | 0/3 | — | ya |
| DADA | 1 | a | c/65, c/65, c/70 | c/60, c/35, c/55 | 0/3 | — | ya |
| DADA | 2 | b | d/60, d/65, c/45 | d/45, d/40, d/40 | 0/3 | — | ya |

**Kesepakatan:** dari 7 omongan yang lolos di dalam, **5 juga lolos** tebak buta luar dan **2 gagal** di luar; rata-rata penguji luar yang menebak benar 0,29 dari 3 (M2d-3: 3/8 lolos, rata-rata 1,88).

### Jawab dengan kartu

| paket | omongan | kunci | kartu penentu | jawaban luar (pilihan/kartu) | benar | menunjuk penentu | kalimat membingungkan |
|---|---:|---|---|---|---:|---:|---|
| TIRT | 1 | a | 1 | a/1, a/1, a/1 | 3/3 | 3/3 | "Yang disetop hari ini pasti gara-gara naiknya udah kelewat batas"; "Yang disetop hari ini — pesannya tidak menyebut tanggal, jadi aku menebak 'hari ini' itu 10 Desember 2025."; "Yang disetop hari ini pasti gara-gara naiknya udah kelewat batas" |
| TIRT | 3 | a | 1 | a/1, a/1, a/1 | 3/3 | 3/3 | — |
| ULTJ | 1 | c | 1, 2 | c/1+2, c/1+2, c/1 | 3/3 | 3/3 | "Daftar itu sendiri tidak bisa dibuktikan habis, jadi yang tercatat bukan tentu saja yang pernah terjadi."; "Daftar itu sendiri tidak bisa dibuktikan habis, jadi yang tercatat bukan tentu saja yang pernah terjadi."; "Daftar itu sendiri tidak bisa dibuktikan habis, jadi yang tercatat bukan tentu saja yang pernah terjadi." |
| ULTJ | 2 | a | 1, 2 | a/1+2, a/1+2, a/1+2 | 3/3 | 3/3 | "Orang dalam lain menambah 16.069.900 lembar lewat 6 laporan yang terbit 6 Januari 2026–22 Januari 2026."; "Orang dalam lain itu beli terus sepanjang Januari" |
| ULTJ | 3 | a | 1 | a/1, a/1, a/1 | 3/3 | 3/3 | — |
| DADA | 1 | a | 4 | a/4, a/4, a/4 | 3/3 | 3/3 | — |
| DADA | 2 | b | 1, 4 | b/2+3+4, b/2+3+4, b/2+3+4 | 3/3 | 3/3 | "Laporan penjualan pemilik terbesar yang lolos seluruh pemeriksaan: 3 laporan."; "Laporan penjualan pemilik terbesar yang lolos seluruh pemeriksaan: 3 laporan."; "Laporan penjualan pemilik terbesar yang lolos seluruh pemeriksaan: 3 laporan." |

K-05 penuh (3/3 benar dan menunjuk penentu): 7/7 (M2d-3: 8/8). Omongan dengan kalimat yang ditandai membingungkan oleh ≥ 1 penguji: 4/7 (M2d-3: 5/8). Penggolongan masalah makna ada di catatan penulis.

### Kealamian bahasa (buta, penilai yang sama untuk M2d-4, M2d-3, dan manusia)

| sumber | rata-rata | n |
|---|---:|---:|
| agen M2d-4 (bank v2) | 3,67 | 9 |
| agen M2d-3 (bank v1) | 3,00 | 9 |
| manusia (hidup) | 4,00 | 6 |

| paket | sumber | penilai | skor | alasan |
|---|---|---|---:|---|
| DADA | agen-m2d3 | alami-p1 | 3 | Istilah "lolos pemeriksaan" dan "laporan keuangan auditan tahunan" terasa janggal dalam obrolan grup, dan penjelasan seperti "penjualan yang lolos seluruh pemeriksaan tercatat 3 laporan" terdengar seperti keluaran sistem. |
| DADA | agen-m2d3 | alami-p2 | 3 | Pesan pertama terasa dibuat-buat karena ada jargon "lolos pemeriksaan", dan penjelasannya punya susunan janggal seperti "penjualan yang lolos seluruh pemeriksaan tercatat 3 laporan". |
| DADA | agen-m2d3 | alami-p3 | 3 | Kerangkanya wajar, tetapi 'laporannya nggak lolos pemeriksaan' terasa seperti jargon sistem yang aneh di obrolan grup, dan penjelasan seperti 'menyebut tanggal pencabutannya nggak ada di data' bernada teknis/meta. |
| DADA | agen-m2d4 | alami-p1 | 4 | Pesannya singkat dan meyakinkan sebagai obrolan, penjelasannya jelas dan runtut ("Yang bikin ragu biasanya tanggal pengumumannya"); hanya "Teman itu benar" dan "Angka yang disebut teman itu" terasa sedikit kaku. |
| DADA | agen-m2d4 | alami-p2 | 4 | Ringkas dan wajar, pesan dan penjelasannya terdengar seperti percakapan sungguhan; hanya "jualan di 3 laporan" yang sedikit tidak lazim. |
| DADA | agen-m2d4 | alami-p3 | 4 | Pesan dan penjelasannya singkat, lugas, dan wajar ('Teman itu benar.', membedakan tanggal diumumkan dengan tanggal transaksi), hanya sedikit datar dan formal untuk suasana teman. |
| DADA | manusia | alami-p1 | 4 | Pesannya sangat alami ("buat bayar parkir motor aja kurang"), tetapi penjelasannya bergaya buku teks dengan titik koma dan rujukan "kartu", ditambah frasa ganjil "menganggap harga yang naik sebagai semacam pengumuman". |
| DADA | manusia | alami-p2 | 4 | Pesannya sangat hidup ("buat bayar parkir motor aja kurang") dan penjelasannya enak dibaca, meski ada frasa agak aneh seperti "menganggap harga yang naik sebagai semacam pengumuman", serta "ia" yang formal bercampur dengan nada santai. |
| DADA | manusia | alami-p3 | 4 | Pesannya sangat hidup ('buat bayar parkir motor aja kurang') dan penjelasannya fasih, tetapi ada frasa agak janggal seperti 'menganggap harga yang naik sebagai semacam pengumuman' dan rujukan 'kartu kedua' yang kaku. |
| TIRT | agen-m2d3 | alami-p1 | 4 | Pesan bergaya gue-lo dan penjelasan santainya terdengar hidup ("angka yang diteriakkan temanmu"), tetapi ada kalimat yang strukturnya patah, misalnya "Yang bikin orang salah kalau angka itu disangka datang dari..." dan "bursa menulis ragu soal kelanjutan usaha". |
| TIRT | agen-m2d3 | alami-p2 | 3 | Gaya gaul "gue" di pesan terasa hidup, tetapi penjelasannya punya kalimat yang tata bahasanya janggal, misalnya "Yang bikin orang salah kalau angka itu disangka..." dan "Yang bikin naiknya disebut beruntun ada di ringkasan", serta "dicap hoaks" yang diulang. |
| TIRT | agen-m2d3 | alami-p3 | 3 | Pesan bergaya gaul terasa hidup, tetapi penjelasannya berisi klausa janggal seperti 'Yang bikin orang salah kalau angka itu disangka datang dari...', 'Yang bikin naiknya disebut beruntun ada di ringkasan...', dan 'bursa menulis ragu soal kelanjutan usaha'. |
| TIRT | agen-m2d4 | alami-p1 | 4 | Pesan grupnya wajar, tetapi penjelasannya agak kaku dan mengulang pola ("cocok dengan dokumennya", "jadi tidak bisa dipindah ke hari ini"), dan pasangan pilihan seperti "Keliru, Januari dihentikan karena kenaikan harga kumulatif" terasa seperti templat. |
| TIRT | agen-m2d4 | alami-p2 | 4 | Pesan terdengar seperti obrolan sungguhan dan penjelasannya runtut, hanya agak kaku seperti laporan di beberapa frasa, misalnya "klaim teman soal hari ini cocok dengan dokumennya". |
| TIRT | agen-m2d4 | alami-p3 | 4 | Pesan grup dan pilihannya wajar, penjelasannya runtut dan mudah diikuti, hanya sedikit kaku di beberapa bagian (misalnya 'bukan sebab penghentiannya', 'klaim teman soal hari ini'). |
| ULTJ | agen-m2d3 | alami-p1 | 3 | Pesannya wajar, tetapi penjelasannya bocor istilah mesin ("sudah dirapikan jadi 8 laporan", "sudah dirapikan jadi Rp145"), dan beberapa frasa tidak lazim ("lebih dangkal dari dividen", "turun persis sama banyak dengan"). |
| ULTJ | agen-m2d3 | alami-p2 | 3 | Bisa dipahami, tetapi ada frasa yang terasa bocoran mesin, yaitu "sudah dirapikan jadi 8 laporan" dan "Selisih ... sudah dirapikan jadi Rp145", juga "jatuhnya lebih dangkal", "laporan itu terbitnya cuma dari", dan "turun persis sama banyak dengan". |
| ULTJ | agen-m2d3 | alami-p3 | 2 | Ada frasa yang jelas tidak alami dan terasa bocoran mesin, yaitu 'sudah dirapikan jadi 8 laporan', 'Selisih ... sudah dirapikan jadi Rp145', 'jatuhnya lebih dangkal dari dividen', dan 'turun persis sama banyak dengan'. |
| ULTJ | agen-m2d4 | alami-p1 | 3 | Frasa "orang dalam lain" tidak lazim dalam obrolan, dan ada beberapa frasa janggal atau berulang ("muncul 2 laporan", "laporannya cuma dua laporan", "dia nambahnya cuma lewat 2 laporan", "Yang tidak terbaca di situ:"). |
| ULTJ | agen-m2d4 | alami-p2 | 3 | Pesannya wajar, tetapi penjelasannya berpola kaku ("Kalau ... dibuka", "Yang tidak terbaca di situ") dan ada frasa tidak lazim seperti "pemilik terbesar muncul 2 laporan" dan "laporannya cuma dua laporan". |
| ULTJ | agen-m2d4 | alami-p3 | 3 | Bisa dipahami, tetapi istilah templat 'orang dalam lain' terasa kaku di dalam obrolan, dan ada frasa tidak lazim seperti 'pemilik terbesar muncul 2 laporan', 'laporannya cuma dua laporan', serta 'Yang tidak terbaca di situ' yang malah diikuti isi yang terbaca. |
| ULTJ | manusia | alami-p1 | 4 | Pesannya alami ("Jangan kegeeran dulu" agak kurang pas maknanya), tetapi penjelasannya bernada esai dan terasa terjemahan: rujukan "kartu kedua", tanda pisah, dan kalimat seperti "bagian yang terdengar paling meyakinkan justru yang paling jarang dicek". |
| ULTJ | manusia | alami-p2 | 4 | Pesan alami ("Jangan kegeeran dulu") dan penjelasannya lancar seperti teman yang menerangkan, hanya sesekali agak formal atau kaku, misalnya "Yang tidak dikatakan kartu mana pun". |
| ULTJ | manusia | alami-p3 | 4 | Penjelasannya lancar dan terdengar seperti teman yang menerangkan dengan cermat ('Setengah omongan Fajar cocok...'), hanya 'Jangan kegeeran dulu' kurang pas maknanya dan rujukan 'kartu pertama/ketiga' sedikit kaku. |

## M2d-1 → M2d-2 → M2d-3 → M2d-4

| ukuran | M2d-1 (tanpa lingkar) | M2d-2 (lingkar, satu model) | M2d-3 (berperan) | M2d-4 (gaya & makna) |
|---|---|---|---|---|
| simulasi terbit | — (tanpa gerbang) | 0/3 | 2/3 | 1/3 |
| tebak buta luar K-05 (lolos / diuji), rata-rata benar | 2/9, 2,11 | 2/3, 1,00 | 3/8, 1,88 | 5/7, 0,29 |
| jawab-dengan-kartu K-05 penuh | — | — | 8/8 | 7/7 |
| omongan dengan kalimat membingungkan (penguji kartu) | — | — | 5/8 | 4/7 |
| kealamian, penilai masing-masing milestone (manusia) | 3,00 (5,00) | 3,83 (4,33) | 3,33 (4,00) | 3,67 (4,00) |
| kealamian, penilai M2d-4 yang SAMA | — | — | 3,00 | 3,67 |
| kata per pilihan, rata-rata (maks) — manusia 8,5 (11) | — | — | 10,3 (14) | 7,5 (9) |
| biaya milestone (ledger) | — | — | US$1.4776 | US$3.9629 |

## Catatan penulis

### Singkatnya

**Satu dari tiga simulasi terbit: ULTJ di putaran 9.** TIRT tidak terbit (omongan 2 habis tiga sudut; omongan 1 dan 3 dikunci di putaran 1–2). DADA dihentikan **pagu milestone** di putaran 11 (US$3,96 + perkiraan panggilan kritikus berikutnya > US$4,00; ditegakkan kode, panggilan tidak dikirim) dengan omongan 1 dan 2 dikunci. M2d-3: 2/3 terbit. Draf tetap **tidak** dipasang ke produk.

Yang membaik menurut pembanding eksternal (subagent Opus baru, petunjuk sama persis dengan M2d-3):

- **Tebak buta luar: 5 dari 7 omongan yang dikunci lolos** (M2d-3: 3 dari 8); rata-rata penguji luar yang menebak benar turun dari 1,88 ke 0,29 dari 3. Dua yang gagal (TIRT 1 dan 3) masing-masing ditebak benar oleh SATU penguji dengan yakin 50 dan 40 — gagal karena aturan yakin ≥ 40, bukan karena mayoritas menebak benar.
- **Jawab-dengan-kartu K-05: 7/7** (M2d-3: 8/8).
- **Kealamian, penilai yang sama: M2d-4 3,67, M2d-3 3,00, manusia 4,00** (n = 9, 9, 6). Pembeda terbesar ada di draf TIRT dan DADA (4, 4, 4); draf ULTJ M2d-4 tetap 3 karena "orang dalam lain" dan frasa berulang di penjelasan.
- **Panjang & bentuk pilihan: rata-rata 7,5 kata (maks 9), 0 dari 28 pilihan berekor** — manusia 8,5 (maks 11), 0/24; M2d-3 10,3 (maks 14), 10/32 berekor. Pesan: 16,4 kata rata-rata (maks 20), 0/7 memakai "gue" (manusia 19,0 / maks 26; 3 dari 6 pesan manusia sendiri memakai "Gue").

### Masalah makna (penggolongan tangan atas kalimat "bingung" penguji kartu, dan bacaan ulang eksekutor)

Dua masalah makna M2d-3 yang dilihat penguji luar — **bagian klaim yang tak bisa dicek padahal kunci "Betul"** (TIRT 1 "ngeborong") dan **pilihan lain yang ikut benar** (ULTJ 1 pilihan d) — **tidak muncul** di tujuh omongan M2d-4. Kalimat yang ditandai membingungkan (4/7 omongan) terbagi:

- **istilah kartu dari paket fakta**, bukan tulisan penulis: "Daftar itu sendiri tidak bisa dibuktikan habis…" (ULTJ 1, 3/3 penguji), "…yang lolos seluruh pemeriksaan: 3 laporan" (DADA 2, 3/3 penguji). Kritikus juga menandai frasa kedua di DADA putaran 5 (jenis bahasa, bagian kartu). Perbaikannya di teks kartu paket (`factory/llm/paket.ts`), di luar batas M2d-4.
- **"hari ini" tanpa tanggal di pesan** (TIRT 1, 1 penguji) dan kalimat pesan/kartu yang diulang tanpa keterangan (ULTJ 2) — bukan salah makna.

Keraguan eksekutor yang tidak tertangkap siapa pun: ULTJ 1 (Wulan) menutup dengan "Aman lah." — penilaian yang tak bisa dicek kartu, sedangkan kuncinya "Betul". Kritikus menjawab `bagian_tak_tercek: []`. Menurut saya ini sejenis dengan "ngeborong", walau lebih lemah (perasaan, bukan klaim sebab). Juga: TIRT 1 dan 3 berpola hampir sama ("… disetop karena …" × 4), yang terasa templat.

Kritikus dengan dua pertanyaan wajib memang menolak masalah makna di dalam lingkar: ULTJ putaran 2 (omongan 2: "dia tau sesuatu" tak tercek + pilihan c juga benar — keduanya diturunkan kode dari jawaban wajib), DADA putaran 1 (penjelasan menyebut patokan 7 Oktober yang tidak ada di kartu).

### Apa yang dikerjakan tiap peran

- **Pemeriksa (gerbang gaya)** hampir tidak pernah menolak di jalan sungguhan: G-panjang 1 kali, G-satu-klausa dan G-register 0 — penulis mematuhi prompt `prompt-penulis-gaya.md`. Efeknya terlihat di hasil (pilihan pendek, satu klausa, tanpa "gue"), bukan di jumlah penolakan. Penolakan pemeriksa terbanyak tetap dari validator lama (angka tanpa rujukan, kunci seragam, panjang timpang).
- **Kritikus GLM-5.3 (sebelum penebak)**: 49 panggilan, **US$2,74 = 69 % biaya milestone**. Ia terpotong batas token sering: 3 dari 5 panggilan di 16.384 (jalan TIRT ke-2, dibuang) dan 14 dari 44 di 24.576; keluaran yang selesai 6.362–22.734 token (median 15.730). Lima kali "tidak menjawab" dua kali berturut-turut (US$0,10–0,16 per kejadian, tanpa hasil). Karena kritikus kini dipanggil sebelum penebak, ia menilai lebih banyak versi (34 di tiga jalan dilaporkan, M2d-3: 11) — itulah harga "kritikus lebih awal".
- **Penebak GLM-5.3 (ke-3)**: tambahan **US$0,388** (plus probe US$0,023). Menebak benar tanpa kartu 57–80 % (DeepSeek 50–71 %) di versi yang sampai ke penebak. Ia juga kadang berputar sampai batas token (8.000): tebakan tak terbaca dua kali dihitung benar/100 (menolak), sesuai aturan M2d-2.
- **Penulis DeepSeek** terpotong di 32.768 token berpikir 25 kali (TIRT 14, ULTJ 4, DADA 7); cadangan tanpa berpikir selalu mengisi.

### Keputusan di tengah jalan (semua tercatat di `eval/keluaran-m2d4/dibuang/`)

1. **Jalan TIRT ke-1 dihentikan** sesudah penebak GLM ke-3 berputar sampai 16.000 token (US$0,048, 292 s) pada tebakan pertamanya. Probe tujuh panggilan (US$0,023; `dibuang/probe-glm-penebak.md`): `enable_thinking=false` tidak mematikan penalaran, `thinking=false` menumpahkan penalaran ke jawaban; pada soal TIRT sungguhan GLM menjawab dalam 1.045–1.463 token. Putusan: penebak GLM tetap berpenalaran dengan `max_tokens` 8.000. Panggilan ulang yang mungkin sedang berjalan saat dihentikan dicatat KOREKSI (perkiraan maksimum US$0,049).
2. **Jalan TIRT ke-2 dihentikan** di awal putaran 2: kritikus dengan dua pertanyaan wajib terpotong di 16.384 token pada 3 dari 5 panggilan (dua kali berturut-turut pada omongan 2 = "tidak menjawab" seharga US$0,10). Putusan: kritikus M2d-4 24.576 token (M2d-3 tetap 16.384). KOREKSI US$0,017 untuk panggilan penulis yang mungkin berjalan.
3. Kedua jalan yang dibuang + probe + KOREKSI = **US$0,457** (12 % pagu milestone). Setelan sesudahnya tidak diubah lagi; ULTJ dan DADA memakai setelan jalan TIRT ke-3.
4. **Urutan kontrak TIRT → ULTJ → DADA** dijalankan tanpa syarat sisa pagu (kontrak M2d-4 tidak menyebutnya); DADA berhenti oleh pagu milestone sebelum omongan 3 selesai.

### Keterbatasan

- **n kecil**: 3 simulasi, 7 omongan dikunci, 3 penguji per uji. Selisih satu penguji membalik status lolos satu omongan (TIRT 3 gagal tebak buta luar dengan satu tebakan benar di yakin 40 — tepat di batas).
- **Biaya**: M2d-4 menghabiskan US$3,96 (M2d-3 US$1,48) untuk hasil terbit yang lebih sedikit; dua pertiga untuk kritikus yang sering terpotong. Dengan sisa pagu kumulatif ±US$1,04 dan kredit Featherless ±US$3 (dari ±US$7), satu jalan penuh lagi dengan setelan ini tidak muat.
- **Kealamian naik, tetapi kritikan penilai pindah ke penjelasan** (pola "Kalau … dibuka", "Yang tidak terbaca di situ", "sudah dirapikan jadi" di M2d-3). Penjelasan tidak disentuh gerbang gaya.
- **Pembanding manusia memakai "Gue"** (kasus hidup tidak diubah; `cases/` terlarang). G-register menolaknya bila diperiksa; tes mencatat ini sebagai keputusan pemilik.
- **Batas G-satu-klausa adalah tafsiran**: koma kedua dibolehkan hanya untuk ", bukan …"/", tapi …"/", tetapi …"/", melainkan …" (diturunkan dari soal manusia); "karena" tanpa koma dibolehkan.
- **Harga GLM** tetap angka penjaga 1,00/3,00 per juta token, bukan tagihan; saldo sebenarnya perlu dicek pemilik di dasbor penyedia.
