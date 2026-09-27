# Bukti: uji tanding tiga model penyusun (M2d)

Berkas ini ditulis oleh `npm run llm:laporan` dari keluaran mentah di `eval/keluaran-m2d/` (sel dua putaran, paket, ledger biaya, bahan dan jawaban mentah penguji). Semua angka dihitung ulang tiap kali perintah itu dijalankan; hanya bagian di bawah "Rekomendasi" yang ditulis tangan (`eval/keluaran-m2d/laporan-tangan.md`).

## Yang diuji

Tiga model di Featherless, lewat klien OpenAI-compatible buatan sendiri (`factory/llm/klien.ts`), × tiga paket fakta. Prompt sistem sama (`factory/llm/prompt-susun.md`), pesan paket sama, suhu 0.3, paling banyak 3 percobaan per sel dengan umpan balik validator (`factory/llm/validasi.ts`). **Putaran 1**: `max_tokens` 12.000. **Putaran 2**: `max_tokens` 32.000 — dinaikkan untuk ketiga model sekaligus sesudah putaran 1 menunjukkan kedua model GLM menghabiskan seluruh batas untuk penalaran. Draf LLM **tidak** dipasang ke produk.

| paket | T | samaran | fakta di paket | tersingkir | peristiwa |
|---|---|---|---:|---:|---|
| DADA | 8 Oktober 2025 | Perusahaan D | 14 | 4 | Harga saham naik berlipat dalam dua bulan, sementara pemilik terbesarnya melaporkan penjualan. Sebelumnya bursa menghentikan sementara perdagangannya karena laporan keuangan auditan tahunan belum disampaikan, dan perusahaan membagi dividen tunai. |
| ULTJ | 4 Mei 2026 | Perusahaan U | 29 | 1 | Hari ini tanggal ex dividen tunai perusahaan; dividen tunai tercatat dibagikan tiap tahun sejak 2020; dan pada Januari orang dalam perusahaan melaporkan pembelian saham. |
| TIRT | 10 Desember 2025 | Perusahaan T | 20 | 2 | Hari ini bursa menghentikan sementara perdagangan saham perusahaan (cooling down) sesudah harganya naik berturut-turut; awal tahun yang sama bursa juga pernah menghentikan perdagangannya dengan alasan lain. |

## Hasil per model

| model | lolos validator p1 / p2 | percobaan sampai lolos | keluaran terpotong (p1 / p2) | tebak buta lolos (omongan) | rata-rata penguji benar (dari 3) | kealamian rata-rata (n) | biaya p1 / p2 | biaya per simulasi lolos | latensi rata-rata per panggilan p1 / p2 |
|---|---|---|---|---:|---:|---:|---|---:|---|
| `deepseek-ai/DeepSeek-V4.1-Flash` | 3/3 · 3/3 | 2, 2, 1, 2, 1, 1 | 1/5 · 0/4 | 2/9 | 2,11 | 3,00 (9) | US$0.0216 · US$0.0202 | US$0.0070 | 23,9 s · 28,6 s |
| `zai-org/GLM-5.3-Flash` | 0/3 · 3/3 | 1, 2, 1 | 9/9 · 1/4 | 0/9 | 2,89 | 3,22 (9) | US$0.0592 · US$0.0481 | US$0.0358 | 98,2 s · 177,4 s |
| `zai-org/GLM-5.3` | 0/3 · 2/3 | 2, 2 | 8/9 · 4/7 | 1/6 | 2,17 | 4,00 (6) | US$0.3670 · US$0.7217 | US$0.5444 | 146,6 s · 334,3 s |

Token masuk / keluar per model (p1 · p2):

- `deepseek-ai/DeepSeek-V4.1-Flash`: 20.521 / 44.835 · 15.734 / 43.727
- `zai-org/GLM-5.3-Flash`: 34.869 / 108.000 · 15.988 / 91.477
- `zai-org/GLM-5.3`: 29.920 / 96.000 · 26.686 / 196.152

Pembanding manusia (omongan DADA dan ULTJ yang sekarang hidup, dinilai buta di antara draf model): kealamian rata-rata **5,00** (n = 6).

**Total biaya menurut ledger** (seluruh panggilan milestone, termasuk sonda ketersediaan): **US$1.2380** dari pagu US$5,00.

Harga per juta token yang dipakai (konservatif, `factory/llm/harga.ts`):

- `deepseek-ai/DeepSeek-V4.1-Flash`: masuk 0.196, keluar 0.392 — 2x harga OpenRouter DeepSeek V4 Flash (0,098/0,196), dikutip kontrak M2d D-2, 27 Sep 2026
- `zai-org/GLM-5.3-Flash`: masuk 0.15, keluar 0.5 — 2x harga OpenRouter GLM 5.3 Flash (0,075/0,25), dikutip kontrak M2d D-2, 27 Sep 2026
- `zai-org/GLM-5.3`: masuk 1, keluar 3 — angka penjaga kontrak M2d D-2 (1,00/3,00) sampai ada harga resmi, 27 Sep 2026

## Per sel — putaran 1 (`max_tokens` 12.000)

| paket | model | lolos | kode penolakan / hasil per percobaan | token masuk / keluar | biaya | latensi per percobaan |
|---|---|---|---|---|---:|---|
| DADA | `deepseek-ai/DeepSeek-V4.1-Flash` | ya (p2) | p1: OPSI_PANJANG_TIMPANG<br>p2: lolos | 7.679 / 15.753 | US$0.0077 | 30,5 s, 10,4 s |
| DADA | `zai-org/GLM-5.3-Flash` | tidak | p1: JSON_RUSAK (terpotong)<br>p2: JSON_RUSAK (terpotong)<br>p3: JSON_RUSAK (terpotong) | 9.432 / 36.000 | US$0.0194 | 95,7 s, 105,2 s, 94,6 s |
| DADA | `zai-org/GLM-5.3` | tidak | p1: JSON_RUSAK (terpotong)<br>p2: JSON_RUSAK (terpotong)<br>p3: JSON_RUSAK (terpotong) | 9.432 / 36.000 | US$0.1174 | 157,1 s, 114,7 s, 166,3 s |
| ULTJ | `deepseek-ai/DeepSeek-V4.1-Flash` | ya (p2) | p1: JSON_RUSAK (terpotong)<br>p2: lolos | 9.278 / 18.868 | US$0.0092 | 35,2 s, 18,5 s |
| ULTJ | `zai-org/GLM-5.3-Flash` | tidak | p1: JSON_RUSAK (terpotong)<br>p2: JSON_RUSAK (terpotong)<br>p3: JSON_RUSAK (terpotong) | 14.241 / 36.000 | US$0.0201 | 99,0 s, 104,3 s, 102,3 s |
| ULTJ | `zai-org/GLM-5.3` | tidak | p1: JSON_RUSAK (terpotong)<br>p2: JSON_RUSAK (terpotong)<br>p3: JSON_RUSAK | 9.292 / 24.000 | US$0.1304 | 144,3 s, 149,1 s |
| TIRT | `deepseek-ai/DeepSeek-V4.1-Flash` | ya (p1) | p1: lolos | 3.564 / 10.214 | US$0.0047 | 25,2 s |
| TIRT | `zai-org/GLM-5.3-Flash` | tidak | p1: JSON_RUSAK (terpotong)<br>p2: JSON_RUSAK (terpotong)<br>p3: JSON_RUSAK (terpotong) | 11.196 / 36.000 | US$0.0197 | 96,6 s, 93,4 s, 92,8 s |
| TIRT | `zai-org/GLM-5.3` | tidak | p1: JSON_RUSAK (terpotong)<br>p2: JSON_RUSAK (terpotong)<br>p3: JSON_RUSAK (terpotong) | 11.196 / 36.000 | US$0.1192 | 145,8 s, 134,7 s, 160,9 s |

## Per sel — putaran 2 (`max_tokens` 32.000)

| paket | model | lolos | kode penolakan / hasil per percobaan | token masuk / keluar | biaya | latensi per percobaan |
|---|---|---|---|---|---:|---|
| DADA | `deepseek-ai/DeepSeek-V4.1-Flash` | ya (p2) | p1: OPSI_PANJANG_TIMPANG<br>p2: lolos | 7.661 / 24.007 | US$0.0109 | 43,7 s, 18,6 s |
| DADA | `zai-org/GLM-5.3-Flash` | ya (p1) | p1: lolos | 3.054 / 24.902 | US$0.0129 | 186,1 s |
| DADA | `zai-org/GLM-5.3` | ya (p2) | p1: JSON_RUSAK (terpotong)<br>p2: lolos | 6.198 / 57.297 | US$0.1781 | 366,6 s, 319,1 s |
| ULTJ | `deepseek-ai/DeepSeek-V4.1-Flash` | ya (p1) | p1: lolos | 4.509 / 10.671 | US$0.0051 | 24,3 s |
| ULTJ | `zai-org/GLM-5.3-Flash` | ya (p2) | p1: JSON_RUSAK (terpotong)<br>p2: lolos | 9.292 / 45.347 | US$0.0241 | 243,1 s, 112,9 s |
| ULTJ | `zai-org/GLM-5.3` | ya (p2) | p1: JSON_RUSAK (terpotong)<br>p2: lolos | 9.292 / 53.630 | US$0.1702 | 461,5 s, 252,4 s |
| TIRT | `deepseek-ai/DeepSeek-V4.1-Flash` | ya (p1) | p1: lolos | 3.564 / 9.049 | US$0.0042 | 27,7 s |
| TIRT | `zai-org/GLM-5.3-Flash` | ya (p1) | p1: lolos | 3.642 / 21.228 | US$0.0112 | 167,6 s |
| TIRT | `zai-org/GLM-5.3` | tidak | p1: JSON_RUSAK (terpotong)<br>p2: JSON_RUSAK (terpotong)<br>p3: ANDAIAN_DI_PENJELASAN, OPSI_PANJANG_TIMPANG | 11.196 / 85.225 | US$0.3734 | 148,4 s, 595,7 s, 196,7 s |

## Alasan penolakan terbanyak

Dihitung per percobaan yang ditolak, kedua putaran (satu kode dihitung sekali per percobaan).

| kode | seluruhnya | `deepseek-ai/DeepSeek-V4.1-Flash` | `zai-org/GLM-5.3-Flash` | `zai-org/GLM-5.3` |
|---|---:|---:|---:|---:|
| JSON_RUSAK | 24 | 1 | 10 | 13 |
| OPSI_PANJANG_TIMPANG | 3 | 2 | 0 | 1 |
| ANDAIAN_DI_PENJELASAN | 1 | 0 | 0 | 1 |

## Uji tebak buta (K-05)

Draf yang diuji: satu draf lolos per (paket, model) — dari putaran 2, atau putaran 1 bila putaran 2 tidak menghasilkan draf lolos untuk sel itu (kolom "putaran"). Tiga penguji subagent (opus, tanpa konteks eksekutor) per bundel; tiap bundel memuat paling banyak satu draf per paket (bujur sangkar latin), jadi tidak ada penguji yang melihat dua versi omongan tentang fakta yang sama. Penguji melihat pesan, judul pertanyaan, dan empat pilihan — **tanpa kartu**. Lolos bila ≤ 1 dari 3 benar dan rata-rata keyakinan penebak yang benar < 40%. Bahan: `eval/keluaran-m2d/penguji/tebak-B*.md`; jawaban mentah: `penguji/jawaban/`.

**Kalibrasi penguji** (bundel BM: keenam omongan DADA dan ULTJ yang sekarang hidup, prosedur dan petunjuk yang sama, tiga penguji subagent baru): **2/6** omongan lolos, rata-rata 1,50 dari 3 penguji menebak benar. Baris "manusia" di tabel di bawah.

| paket | model | putaran | omongan | kunci | jawaban penguji (pilihan/yakin) | benar | yakin penebak benar | lolos |
|---|---|---:|---:|---|---|---:|---:|---|
| DADA | `deepseek-ai/DeepSeek-V4.1-Flash` | 2 | 1 | a | a/55, a/55, a/50 | 3/3 | 53 | tidak |
| DADA | `deepseek-ai/DeepSeek-V4.1-Flash` | 2 | 2 | b | b/40, b/35, b/45 | 3/3 | 40 | tidak |
| DADA | `deepseek-ai/DeepSeek-V4.1-Flash` | 2 | 3 | c | c/55, c/55, c/55 | 3/3 | 55 | tidak |
| DADA | `manusia` | — | 1 | b | d/75, d/70, d/70 | 0/3 | — | ya |
| DADA | `manusia` | — | 2 | a | a/35, b/40, a/40 | 2/3 | 38 | tidak |
| DADA | `manusia` | — | 3 | c | c/40, d/40, d/35 | 1/3 | 40 | tidak |
| DADA | `zai-org/GLM-5.3` | 2 | 1 | a | a/55, a/70, a/70 | 3/3 | 65 | tidak |
| DADA | `zai-org/GLM-5.3` | 2 | 2 | b | b/65, b/60, b/65 | 3/3 | 63 | tidak |
| DADA | `zai-org/GLM-5.3` | 2 | 3 | c | c/70, c/50, c/70 | 3/3 | 63 | tidak |
| DADA | `zai-org/GLM-5.3-Flash` | 2 | 1 | a | a/45, a/45, a/50 | 3/3 | 47 | tidak |
| DADA | `zai-org/GLM-5.3-Flash` | 2 | 2 | b | b/55, b/65, b/65 | 3/3 | 62 | tidak |
| DADA | `zai-org/GLM-5.3-Flash` | 2 | 3 | d | d/55, d/55, d/60 | 3/3 | 57 | tidak |
| TIRT | `deepseek-ai/DeepSeek-V4.1-Flash` | 2 | 1 | a | a/55, a/60, a/55 | 3/3 | 57 | tidak |
| TIRT | `deepseek-ai/DeepSeek-V4.1-Flash` | 2 | 2 | d | b/50, b/50, b/50 | 0/3 | — | ya |
| TIRT | `deepseek-ai/DeepSeek-V4.1-Flash` | 2 | 3 | b | d/45, d/45, d/45 | 0/3 | — | ya |
| TIRT | `zai-org/GLM-5.3-Flash` | 2 | 1 | a | b/55, a/55, a/60 | 2/3 | 58 | tidak |
| TIRT | `zai-org/GLM-5.3-Flash` | 2 | 2 | b | b/65, b/60, b/70 | 3/3 | 65 | tidak |
| TIRT | `zai-org/GLM-5.3-Flash` | 2 | 3 | d | d/60, d/60, d/70 | 3/3 | 63 | tidak |
| ULTJ | `deepseek-ai/DeepSeek-V4.1-Flash` | 2 | 1 | b | b/50, b/45, b/50 | 3/3 | 48 | tidak |
| ULTJ | `deepseek-ai/DeepSeek-V4.1-Flash` | 2 | 2 | c | d/40, c/45, d/40 | 1/3 | 45 | tidak |
| ULTJ | `deepseek-ai/DeepSeek-V4.1-Flash` | 2 | 3 | a | a/55, a/55, a/55 | 3/3 | 55 | tidak |
| ULTJ | `manusia` | — | 1 | b | b/35, b/35, b/35 | 3/3 | 35 | tidak |
| ULTJ | `manusia` | — | 2 | a | a/40, a/40, a/40 | 3/3 | 40 | tidak |
| ULTJ | `manusia` | — | 3 | d | a/40, a/45, a/45 | 0/3 | — | ya |
| ULTJ | `zai-org/GLM-5.3` | 2 | 1 | b | b/45, b/45, b/50 | 3/3 | 47 | tidak |
| ULTJ | `zai-org/GLM-5.3` | 2 | 2 | a | b/40, b/40, b/40 | 0/3 | — | ya |
| ULTJ | `zai-org/GLM-5.3` | 2 | 3 | d | c/40, d/40, c/40 | 1/3 | 40 | tidak |
| ULTJ | `zai-org/GLM-5.3-Flash` | 2 | 1 | a | a/60, a/55, a/60 | 3/3 | 58 | tidak |
| ULTJ | `zai-org/GLM-5.3-Flash` | 2 | 2 | b | b/55, b/45, b/50 | 3/3 | 50 | tidak |
| ULTJ | `zai-org/GLM-5.3-Flash` | 2 | 3 | c | c/50, c/45, c/40 | 3/3 | 45 | tidak |

## Kealamian bahasa

Tiga penilai subagent buta: draf diberi label acak per kelompok (kunci label di `penguji/kunci.json`, tidak dikirim ke penilai), model tidak disebut, omongan manusia yang hidup ikut di antara draf DADA dan ULTJ. Skala 1–5, satu kalimat alasan.

| paket | sumber | penilai | skor | alasan |
|---|---|---|---:|---|
| DADA | `deepseek-ai/DeepSeek-V4.1-Flash` | alami-p1 | 3 | Pesan Sinta terbaca seperti pengumuman, bukan obrolan; pilihan "Rp140 sepuluh lot" terlalu dipadatkan; dan "bilangan di omongan" tidak lazim bagi penutur asli. |
| DADA | `deepseek-ai/DeepSeek-V4.1-Flash` | alami-p2 | 3 | Pesan-pesannya lebih mirip laporan daripada obrolan ("ex date 16 September 2025. Yang punya 10 lot dapat Rp140."), pilihannya terpotong janggal ("Rp140 sepuluh lot"), dan "bilangan di omongan" tidak lazim. |
| DADA | `deepseek-ai/DeepSeek-V4.1-Flash` | alami-p3 | 3 | Pesannya datar seperti pengumuman, bukan obrolan (terutama pesan Sinta), pilihannya dipadatkan dengan janggal ('Rp140 sepuluh lot'), dan penjelasannya kaku ('bilangan di omongan sama dengan yang tertulis'). |
| DADA | manusia (hidup) | alami-p1 | 5 | Pesannya sangat alami ("buat bayar parkir motor aja kurang", "nggak kedengeran jual"), dan penjelasannya mengalir seperti teman yang menerangkan ("jual-beli disetop", "Perhatikan juga tanggalnya"); hanya ada satu frasa yang sedikit ganjil, "semacam pengumuman". |
| DADA | manusia (hidup) | alami-p2 | 5 | Pesannya terdengar seperti grup sungguhan ("buat bayar parkir motor aja kurang", "nggak kedengeran jual"), dan penjelasannya mengalir seperti teman yang menerangkan ("jual-beli disetop", "kebagian"). Hanya ada sedikit frasa ganjil. |
| DADA | manusia (hidup) | alami-p3 | 5 | Pesannya sangat alami ('buat bayar parkir motor aja kurang', 'nggak kedengeran jual') dan penjelasannya mengalir seperti teman yang menjelaskan; hanya 'harga yang naik sebagai semacam pengumuman' yang sedikit janggal. |
| DADA | `zai-org/GLM-5.3` | alami-p1 | 4 | Pesan dan pilihannya wajar, tetapi penjelasannya memakai frasa kaku seperti "Kartu hitungan 22,25 kali membandingkan" dan "angka yang disebut di omongan". |
| DADA | `zai-org/GLM-5.3` | alami-p2 | 4 | Pesannya hidup dan wajar ("Aku baru denger dari grup sebelah"), tetapi penjelasannya memuat frasa janggal seperti "angka yang disebut di omongan" dan "Kartu hitungan 22,25 kali membandingkan". |
| DADA | `zai-org/GLM-5.3` | alami-p3 | 4 | Obrolannya wajar, tetapi ada frasa benda yang kaku ('Kartu hitungan 22,25 kali membandingkan...') dan kalimat longgar seperti 'penjualan pemegang saham besar selalu ada laporan kepemilikannya'. |
| DADA | `zai-org/GLM-5.3-Flash` | alami-p1 | 4 | Pesannya hidup seperti obrolan grup ("Woi cek dong", "udah buang"), tetapi "Kata orang dalam beneran segitu" agak janggal, dan penjelasannya kaku karena terus mengulang pola "Kartu ... menulis/menyebut". |
| DADA | `zai-org/GLM-5.3-Flash` | alami-p2 | 3 | Pembuka pesan terasa obrolan ("Woi cek dong"), tetapi tanggal lengkap dan "per lembar" yang diulang di pesan grup tidak wajar, dan penjelasannya kaku seperti templat ("Kartu hitungannya mengandaikan pemegang 10 lot yaitu 1.000 lembar"). |
| DADA | `zai-org/GLM-5.3-Flash` | alami-p3 | 4 | Pesannya hidup seperti obrolan grup ('Woi cek dong', 'Gila, katanya...'), tetapi penjelasannya agak seperti templat dengan frasa kaku seperti 'Kartu hitungannya mengandaikan pemegang 10 lot yaitu 1.000 lembar'. |
| TIRT | `deepseek-ai/DeepSeek-V4.1-Flash` | alami-p1 | 4 | Pesan dan penjelasannya umumnya wajar, tetapi masih ada istilah internal "hitungan paket" dan frasa ganjil "penghentiannya ini menyusul". |
| TIRT | `deepseek-ai/DeepSeek-V4.1-Flash` | alami-p2 | 4 | Pesannya alami ("Suspend 21 Januari 2025 itu alasannya sama dong") dan penjelasannya umumnya lancar, tetapi ada istilah internal ("hitungan paket") dan pilihan yang janggal ("penghentiannya ini menyusul"). |
| TIRT | `deepseek-ai/DeepSeek-V4.1-Flash` | alami-p3 | 4 | Pesan dan penjelasannya umumnya wajar, tetapi ada istilah dari dalam sistem ('hitungan paket') dan pilihan yang agak kaku ('penghentiannya ini menyusul rapat umum pemegang saham'). |
| TIRT | `zai-org/GLM-5.3-Flash` | alami-p1 | 3 | Pesannya alami, tetapi penjelasannya berisi potongan yang rusak seperti tempelan nama kolom, yaitu "sebagai perlindungan investor penghentian 10 Desember 2025" dan "untuk cooling down penghentian 10 Desember 2025". |
| TIRT | `zai-org/GLM-5.3-Flash` | alami-p2 | 3 | Pesannya wajar, dengan campur kode "dicooling down" yang lazim di obrolan, tetapi penjelasannya dua kali memuat sisipan patah seperti hasil templat ("sebagai perlindungan investor penghentian 10 Desember 2025"). |
| TIRT | `zai-org/GLM-5.3-Flash` | alami-p3 | 3 | Obrolannya alami, tetapi penjelasannya memuat potongan label yang tertempel dan merusak kalimat ('sebagai perlindungan investor penghentian 10 Desember 2025', 'untuk cooling down penghentian 10 Desember 2025'). |
| ULTJ | `deepseek-ai/DeepSeek-V4.1-Flash` | alami-p1 | 2 | Pesannya datar seperti pernyataan data ("orang dalam lain nambah"), sedangkan penjelasannya berulang dan mekanis ("kartu data harga harian bursa mencatat" ditulis dua kali, "Kartu daftar aksi korporasi menegaskan ... tercatat di daftar", "dihitung di paket"). |
| ULTJ | `deepseek-ai/DeepSeek-V4.1-Flash` | alami-p2 | 2 | Pesannya datar seperti pernyataan data, bukan obrolan. Penjelasannya mengulang subjek yang sama secara mekanis ("kartu data harga harian bursa mencatat ... dan kartu data harga harian bursa mencatat") dan membocorkan istilah internal ("sudah dihitung di paket"). |
| ULTJ | `deepseek-ai/DeepSeek-V4.1-Flash` | alami-p3 | 2 | Pesannya berupa pernyataan datar yang tidak terasa seperti obrolan, dan penjelasannya berulang secara mekanis ('kartu data harga harian bursa mencatat... dan kartu data harga harian bursa mencatat', 'sudah dihitung di paket') seperti keluaran mesin. |
| ULTJ | manusia (hidup) | alami-p1 | 5 | Pesannya terasa asli ("Jangan kegeeran dulu", "Rapi banget"), dan penjelasannya runtut serta bernada teman; hanya satu kalimat yang sedikit formal, yaitu "Yang tidak dikatakan kartu mana pun". |
| ULTJ | manusia (hidup) | alami-p2 | 5 | Pesannya alami dan berkarakter ("Jangan kegeeran dulu", "Rapi banget"), dan penjelasannya lancar serta menyapa pembaca dengan wajar ("jadi tidak ada yang perlu kamu hitung"), meskipun agak panjang. |
| ULTJ | manusia (hidup) | alami-p3 | 5 | Terdengar ditulis penutur asli: pesannya luwes ('Jangan kegeeran dulu', 'Rapi banget') dan penjelasannya bernada teman yang menuntun dengan 'Perhatikan juga...'. |
| ULTJ | `zai-org/GLM-5.3` | alami-p1 | 4 | Obrolan dan penjelasannya cukup luwes, tetapi ada salah ketik "dividenya" yang berulang, dan "jarak dari penutupan ... ke pembukaan" terasa kaku. |
| ULTJ | `zai-org/GLM-5.3` | alami-p2 | 4 | Pesannya terasa seperti obrolan ("Btw ... pada beli saham sendiri lho") dan penjelasannya cukup lancar, tetapi ada salah ketik berulang "dividenya" dan beberapa kalimat masih bergaya templat. |
| ULTJ | `zai-org/GLM-5.3` | alami-p3 | 4 | Pesan dan penjelasannya umumnya alami, tetapi ada salah ketik 'dividenya' (dua kali) dan beberapa kalimat penjelasan agak kaku ('Contohnya kartu pembelian 700.000 lembar oleh pemilik terbesar'). |
| ULTJ | `zai-org/GLM-5.3-Flash` | alami-p1 | 3 | Pesannya wajar, tetapi penjelasannya janggal: "Rp130 per lembar" ditulis dua kali ("dividen per lembar Rp130 per lembar"), lalu ada "jarak ... turun Rp145", "selisih keduanya lebih Rp15", dan "laporannya beli". |
| ULTJ | `zai-org/GLM-5.3-Flash` | alami-p2 | 3 | Pesannya wajar, tetapi penjelasannya berisi pengulangan dan frasa kaku seperti "dividen per lembar Rp130 per lembar", "selisih keduanya lebih Rp15", dan "salah satu laporannya beli 6.338.600 lembar". |
| ULTJ | `zai-org/GLM-5.3-Flash` | alami-p3 | 3 | Pesannya wajar, tetapi penjelasannya berisi pengulangan dan frasa janggal seperti 'dividen per lembar Rp130 per lembar', 'selisih keduanya lebih Rp15', dan 'salah satu laporannya beli 6.338.600 lembar'. |

## Draf terbaik per model (utuh)

Per model: draf lolos dengan omongan lolos tebak buta terbanyak, lalu kealamian tertinggi, lalu putaran 2 lebih dulu.

### `deepseek-ai/DeepSeek-V4.1-Flash`

Paket TIRT, putaran 2, lolos di percobaan 1.

```json
{
  "omongan": [
    {
      "nama": "Sinta",
      "jam": "19.42",
      "pesan": "Eh, saham Perusahaan T katanya dihentikan sementara hari ini gara-gara harganya naik 9 hari bursa berturut-turut. Bener nggak sih?",
      "angka_pesan": [
        {
          "teks": "9 hari",
          "fact_id": "hari-naik-beruntun"
        }
      ],
      "kartu": [
        "susp-2025-12-10",
        "hari-naik-beruntun",
        "harga-2025-12-09"
      ],
      "kartu_penentu": [
        "susp-2025-12-10"
      ],
      "pilihan": {
        "a": "Betul, bursa menghentikannya [[susp-2025-12-10|10 Desember 2025]] karena harga naik kumulatif",
        "b": "Keliru, penghentian itu karena keraguan atas kelangsungan usaha perseroan",
        "c": "Betul, penghentiannya ini menyusul rapat umum pemegang saham [[rups-2025-09-25|25 September 2025]]",
        "d": "Keliru, harganya justru turun [[naik-2025-11-26-2025-12-09|58 rupiah]] dalam sembilan hari bursa"
      },
      "kunci": "a",
      "penjelasan": "Pengumuman bursa [[susp-2025-12-10|10 Desember 2025]] menyebut perdagangan saham Perusahaan T dihentikan sementara hari itu, dengan alasan resmi kenaikan harga kumulatif yang signifikan, sebagai cooling down untuk melindungi investor. Kartu harga mencatat penutupan [[harga-2025-12-09|9 Desember 2025]], dan hitungan paket menyebut naik [[hari-naik-beruntun|9 hari bursa]] berturut-turut. Jadi omongan teman cocok dengan dokumennya. Salah-kaprah yang umum: orang mengira penghentian sementara selalu berarti ada masalah di perusahaan, padahal dokumen kali ini menyebut alasannya kenaikan harga."
    },
    {
      "nama": "Gilang",
      "jam": "20.15",
      "pesan": "Suspend 21 Januari 2025 itu alasannya sama dong kayak yang sekarang, gara-gara harga naik juga kan?",
      "angka_pesan": [
        {
          "teks": "21 Januari 2025",
          "fact_id": "susp-2025-01-21"
        }
      ],
      "kartu": [
        "susp-2025-01-21",
        "susp-2025-12-10"
      ],
      "kartu_penentu": [
        "susp-2025-01-21"
      ],
      "pilihan": {
        "a": "Betul, alasan penghentian [[susp-2025-01-21|21 Januari 2025]] sama dengan yang sekarang",
        "b": "Keliru, penghentian [[susp-2025-01-21|21 Januari 2025]] karena keraguan kelangsungan usaha",
        "c": "Betul, yang [[susp-2025-01-21|21 Januari 2025]] itu juga karena harga naik kumulatif",
        "d": "Keliru, yang [[susp-2025-01-21|21 Januari 2025]] itu karena harganya turun tajam"
      },
      "kunci": "d",
      "penjelasan": "Pengumuman bursa [[susp-2025-01-21|21 Januari 2025]] menuliskan alasan resmi penghentian sementara waktu itu: bursa menilai ada keraguan atas kelangsungan usaha perseroan. Pengumuman [[susp-2025-12-10|10 Desember 2025]] menuliskan alasan yang berbeda, yaitu kenaikan harga kumulatif yang signifikan sebagai cooling down. Jadi alasan keduanya tidak sama, dan omongan teman tidak cocok dengan dokumennya. Salah-kaprah yang umum: karena dua-duanya berupa penghentian sementara, orang menyimpulkan alasannya pasti sama."
    },
    {
      "nama": "Nadia",
      "jam": "21.07",
      "pesan": "Volume hari ini katanya 1.461.200 lembar, rame banget berarti banyak yang masuk. Cek dong.",
      "angka_pesan": [
        {
          "teks": "1.461.200 lembar",
          "fact_id": "volume-2025-12-09"
        }
      ],
      "kartu": [
        "volume-2025-12-10",
        "volume-2025-12-09",
        "susp-2025-12-10"
      ],
      "kartu_penentu": [
        "volume-2025-12-10"
      ],
      "pilihan": {
        "a": "Betul, volume [[volume-2025-12-09|1.461.200 lembar]] itu tercatat hari ini",
        "b": "Keliru, volume hari ini [[volume-2025-12-10|0 lembar]] karena perdagangannya dihentikan",
        "c": "Betul, [[volume-2025-12-09|1.461.200 lembar]] itu volume terakhir sebelum perdagangan dihentikan",
        "d": "Keliru, [[volume-2025-12-09|1.461.200 lembar]] itu tercatat pada [[susp-2025-12-10|10 Desember 2025]]"
      },
      "kunci": "b",
      "penjelasan": "Data perdagangan harian mencatat volume [[volume-2025-12-10|0 lembar]] pada hari penghentian, sementara angka [[volume-2025-12-09|1.461.200 lembar]] tercatat pada [[harga-2025-12-09|9 Desember 2025]], sehari sebelum perdagangannya dihentikan. Karena perdagangan sahamnya dihentikan sementara, tidak ada transaksi yang tercatat di hari penghentian. Salah-kaprah yang umum: angka ramai yang beredar di grup dianggap otomatis kejadian hari ini, padahal tanggalnya bisa berbeda."
    }
  ]
}
```

### `zai-org/GLM-5.3-Flash`

Paket DADA, putaran 2, lolos di percobaan 1.

```json
{
  "omongan": [
    {
      "nama": "Fajar",
      "jam": "19.12",
      "pesan": "Woi cek dong, saham Perusahaan D katanya dari Rp8 per lembar tanggal 1 Agustus 2025 tembus Rp178 per lembar tanggal 8 Oktober 2025? Serius itu?",
      "angka_pesan": [
        {
          "teks": "Rp8",
          "fact_id": "harga-2025-08-01"
        },
        {
          "teks": "1 Agustus 2025",
          "fact_id": "harga-2025-08-01"
        },
        {
          "teks": "Rp178",
          "fact_id": "harga-2025-10-08"
        },
        {
          "teks": "8 Oktober 2025",
          "fact_id": "harga-2025-10-08"
        }
      ],
      "kartu": [
        "harga-2025-08-01",
        "harga-2025-10-08",
        "kelipatan-2025-08-01-2025-10-08"
      ],
      "kartu_penentu": [
        "harga-2025-08-01",
        "harga-2025-10-08"
      ],
      "pilihan": {
        "a": "Betul, harga penutupannya memang naik dari [[harga-2025-08-01|Rp8]] jadi [[harga-2025-10-08|Rp178]] sesuai data harga bursa.",
        "b": "Keliru, data harga bursa tidak menunjukkan kenaikan seperti itu pada periode ini.",
        "c": "Betul, tapi angka itu bukan data resmi karena bursa belum menerbitkan datanya.",
        "d": "Keliru, yang melonjak bukan harga melainkan volume perdagangan hari ini saja."
      },
      "kunci": "a",
      "penjelasan": "Kartu data harga harian bursa menulis penutupan [[harga-2025-08-01|1 Agustus 2025]] sebesar [[harga-2025-08-01|Rp8 per lembar]], lalu penutupan [[harga-2025-10-08|8 Oktober 2025]] sebesar [[harga-2025-10-08|Rp178 per lembar]]. Kartu hitungan menyebut harga akhirnya [[kelipatan-2025-08-01-2025-10-08|22,25 kali]] harga awalnya. Jadi omongan soal harga itu cocok dengan dokumennya. Salah-kaprah yang umum: mengira harga yang melonjak pasti kabar bohong, padahal langkah pertama hanya mencocokkan angkanya dengan data harga harian bursa sebelum percaya atau menolak."
    },
    {
      "nama": "Nadia",
      "jam": "20.47",
      "pesan": "Gila, katanya pemilik terbesar Perusahaan D udah buang 500 juta lembar sahamnya. Kata orang dalam beneran segitu, gimana ceknya?",
      "angka_pesan": [
        {
          "teks": "500 juta lembar",
          "andaian": true
        }
      ],
      "kartu": [
        "fil-2025-08-25-03",
        "fil-2025-08-25-04",
        "fil-2025-09-01-01",
        "jumlah-jual-terverifikasi"
      ],
      "kartu_penentu": [
        "jumlah-jual-terverifikasi"
      ],
      "pilihan": {
        "a": "Betul, laporan kepemilikan memang mencatat penjualan sebesar itu dari pemilik terbesar.",
        "b": "Keliru, laporan yang tercatat totalnya [[jumlah-jual-terverifikasi|299,5 juta lembar]], bukan [[misal|500 juta lembar]].",
        "c": "Betul, karena pemilik terbesar memang boleh menjual kapan saja tanpa laporan.",
        "d": "Keliru, pemilik terbesar tidak menjual satu lembar pun menurut laporan publik."
      },
      "kunci": "b",
      "penjelasan": "Kartu laporan kepemilikan mencatat penjualan pemilik terbesar [[fil-2025-08-25-03|70 juta lembar]], lalu [[fil-2025-08-25-04|179,5 juta lembar]], lalu [[fil-2025-09-01-01|50 juta lembar]]. Kartu hitungannya merangkum total [[jumlah-jual-terverifikasi|299,5 juta lembar]] dari [[laporan-jual-terverifikasi|3 laporan]] yang lolos pemeriksaan. Angka yang dikabarkan jauh lebih besar daripada yang tercatat. Salah-kaprah yang umum: langsung percaya angka dari orang dalam, padahal laporan kepemilikan yang diumumkan ke publik bisa dibaca sendiri untuk mencocokkan jumlahnya."
    },
    {
      "nama": "Iqbal",
      "jam": "21.05",
      "pesan": "Katanya dividen Perusahaan D gede banget, punya 10 lot dapat Rp140 ribu. Bener nggak sih kabarnya?",
      "angka_pesan": [
        {
          "teks": "10 lot",
          "fact_id": "andai-10-lot-dividen"
        },
        {
          "teks": "Rp140 ribu",
          "andaian": true
        }
      ],
      "kartu": [
        "div-2025-09-16",
        "andai-10-lot-dividen"
      ],
      "kartu_penentu": [
        "andai-10-lot-dividen"
      ],
      "pilihan": {
        "a": "Betul, dividen tunai memang dibagikan sebesar itu untuk pemegang [[andai-10-lot-dividen|10 lot]].",
        "b": "Keliru, soalnya [[andai-10-lot-dividen|10 lot]] itu [[misal|100 lembar]], bukan [[andai-10-lot-dividen|1.000 lembar]].",
        "c": "Betul, laporan korporasi memang mencatat pembayaran dividen sebesar itu.",
        "d": "Keliru, hitungannya [[andai-10-lot-dividen|1.000 lembar]] × [[div-2025-09-16|Rp0,14]] = [[andai-10-lot-dividen|Rp140]] sebelum pajak."
      },
      "kunci": "d",
      "penjelasan": "Kartu aksi korporasi menulis dividen tunai [[div-2025-09-16|Rp0,14 per lembar]] dengan tanggal ex [[div-2025-09-16|16 September 2025]]. Kartu hitungannya mengandaikan pemegang [[andai-10-lot-dividen|10 lot]] yaitu [[andai-10-lot-dividen|1.000 lembar]] menerima [[andai-10-lot-dividen|Rp140]] sebelum pajak. Jadi kabar itu tidak sesuai dokumen. Salah-kaprah yang umum: menganggap angka dividen yang beredar pasti benar, padahal bisa dicocokkan dulu ke dokumen aksi korporasi dan kartu hitungannya."
    }
  ]
}
```

### `zai-org/GLM-5.3`

Paket ULTJ, putaran 2, lolos di percobaan 2.

```json
{
  "omongan": [
    {
      "nama": "Aji",
      "jam": "16.20",
      "pesan": "Eh, hari ini ex dividen tunai Perusahaan U. Katanya harga buka turun persis sebesar dividenya, Rp130 per lembar. Jadi pemegang saham gak rugi apa-apa dong.",
      "angka_pesan": [
        {
          "teks": "Rp130",
          "fact_id": "div-2026-05-04"
        }
      ],
      "kartu": [
        "div-2026-05-04",
        "harga-2026-05-04-buka",
        "turun-2026-05-04",
        "beda-turun-dividen"
      ],
      "kartu_penentu": [
        "turun-2026-05-04",
        "beda-turun-dividen"
      ],
      "pilihan": {
        "a": "Betul, ex dividen hari ini [[div-2026-05-04|Rp130]], wajar harga buka turun sebesar itu.",
        "b": "Keliru, harga buka turun [[turun-2026-05-04|Rp145 per lembar]], lebih besar dari dividenya.",
        "c": "Betul, pembukaan hari ini [[harga-2026-05-04-buka|Rp1.545]], turun pas sebesar dividen tunai.",
        "d": "Keliru, dividen dibayar dari kas perusahaan, bukan dipotong dari harga saham di bursa."
      },
      "kunci": "b",
      "penjelasan": "Kartu hitungan mencatat jarak dari penutupan terakhir sebelum tanggal ex ke pembukaan hari ini: [[turun-2026-05-04|Rp145 per lembar]]. Padahal dividen hari ini [[div-2026-05-04|Rp130 per lembar]], dan kartu hitungan lain mencatat selisihnya [[beda-turun-dividen|Rp15 per lembar]]. Jadi harga buka memang lebih rendah, tapi turunnya lebih besar dari dividen, bukan persis sebesar dividen. Salah-kaprah yang umum: mengira di tanggal ex dividen harga pasti terpotong persis sebesar dividen, padahal harga tetap ditentukan oleh transaksi pembeli dan penjual di pasar."
    },
    {
      "nama": "Sari",
      "jam": "19.05",
      "pesan": "Btw sepanjang Januari orang dalam Perusahaan U pada beli saham sendiri lho. Ada 8 laporan kepemilikan, semuanya pembelian, gak ada satu pun yang jual.",
      "angka_pesan": [
        {
          "teks": "8",
          "fact_id": "laporan-jan-2026"
        }
      ],
      "kartu": [
        "laporan-jan-2026",
        "fil-2026-01-06-01",
        "fil-2026-01-22-01"
      ],
      "kartu_penentu": [
        "laporan-jan-2026"
      ],
      "pilihan": {
        "a": "Betul, ada [[laporan-jan-2026|8 laporan]] orang dalam sepanjang Januari dan semuanya pembelian.",
        "b": "Keliru, yang melapor hanya pemilik terbesar; orang dalam lain tidak melapor di Januari.",
        "c": "Betul, orang dalam memang membeli, tetapi setengah laporannya adalah penjualan.",
        "d": "Keliru, tidak ada laporan kepemilikan orang dalam yang terbit pada bulan Januari."
      },
      "kunci": "a",
      "penjelasan": "Kartu hitungan mencatat [[laporan-jan-2026|8 laporan]] kepemilikan orang dalam yang terbit Januari, dan seluruhnya pembelian, tanpa satu pun penjualan. Contohnya kartu [[fil-2026-01-06-01|pembelian 700.000 lembar]] oleh pemilik terbesar dan kartu [[fil-2026-01-22-01|pembelian 6.338.600 lembar]] oleh orang dalam lain. Jadi omongan Sari cocok dengan dokumen. Salah-kaprah yang umum: mengira laporan orang dalam pasti campuran beli dan jual, padahal dalam satu bulan bisa saja seluruh laporannya pembelian."
    },
    {
      "nama": "Wulan",
      "jam": "21.40",
      "pesan": "Aneh, katanya Perusahaan U rajin bagi dividen. Tahun lalu cuma Rp25 per lembar, sekarang tiba-tiba Rp130. Kok bisa lompat segitu sih?",
      "angka_pesan": [
        {
          "teks": "Rp25",
          "andaian": true
        },
        {
          "teks": "Rp130",
          "fact_id": "div-2026-05-04"
        }
      ],
      "kartu": [
        "div-2025-05-15",
        "div-2026-05-04",
        "div-2022-08-04",
        "dividen-tercatat"
      ],
      "kartu_penentu": [
        "div-2025-05-15"
      ],
      "pilihan": {
        "a": "Betul, dividen naik dari [[misal|Rp25]] ke [[div-2026-05-04|Rp130]] dalam satu tahun terakhir.",
        "b": "Betul, tahun ini dividen [[div-2026-05-04|Rp130]] dan tahun lalu memang [[misal|Rp25]].",
        "c": "Keliru, ini pembagian dividen tunai pertama sejak perusahaan tercatat di bursa.",
        "d": "Keliru, dividen tahun lalu [[div-2025-05-15|Rp45 per lembar]], bukan [[misal|Rp25]]."
      },
      "kunci": "d",
      "penjelasan": "Kartu dividen mencatat pembagian tahun lalu dengan tanggal ex [[div-2025-05-15|15 Mei 2025]] senilai [[div-2025-05-15|Rp45 per lembar]]. Angka [[div-2022-08-04|Rp25 per lembar]] justru tercatat pada pembagian dengan tanggal ex [[div-2022-08-04|4 Agustus 2022]]. Dividen tahun ini memang [[div-2026-05-04|Rp130 per lembar]], dan daftar aksi korporasi mencatat [[dividen-tercatat|7 pembagian]] dividen tunai. Jadi klaim Wulan soal dividen tahun lalu tidak cocok dengan dokumen. Salah-kaprah yang umum: mengira angka dividen tahun lalu bisa diingat seadanya, padahal perlu dicek ke daftar aksi korporasi."
    }
  ]
}
```

## Aturan peringkat

Ditetapkan sebelum satu pun jawaban penguji dibaca, dan tidak disetel sesudahnya:

1. jumlah sel yang lolos validator, dijumlah atas kedua putaran (dari 6) — draf yang tidak lolos tidak bisa dipakai sama sekali;
2. proporsi omongan yang lolos uji tebak buta K-05 (≤ 1 dari 3 penguji benar dan rata-rata keyakinan penebak benar < 40%);
3. rata-rata skor kealamian bahasa Indonesia;
4. biaya per simulasi yang lolos, atas kedua putaran (lebih murah lebih baik);
5. rata-rata percobaan sampai lolos (lebih sedikit lebih baik).

Peringkat menurut aturan itu: 1. `deepseek-ai/DeepSeek-V4.1-Flash` · 2. `zai-org/GLM-5.3-Flash` · 3. `zai-org/GLM-5.3`.

## Rekomendasi

**`deepseek-ai/DeepSeek-V4.1-Flash` sebagai model penyusun bawaan untuk M2d berikutnya** (menggantikan bawaan `LLM_MODEL` = `zai-org/GLM-5.3`). Ia juga peringkat pertama menurut aturan yang ditetapkan sebelum jawaban penguji dibaca. Alasannya dari angka di atas, bukan dari selera:

1. **Lolos validator 6 dari 6 sel** di kedua putaran — satu-satunya model yang lolos dengan batas 12.000 token. GLM-5.3-Flash 3/6 (semuanya di putaran 2), GLM-5.3 2/6 (TIRT gagal walau diberi 32.000 token: dua percobaan terpotong, satu ditolak validator). Draf yang tidak lolos validator tidak bisa dipakai sama sekali, jadi ini syarat pertama.
2. **Biaya per simulasi yang lolos US$0,0070**, lawan US$0,0358 (GLM-5.3-Flash) dan US$0,5444 (GLM-5.3) — GLM-5.3 ±78 kali lebih mahal per draf yang bisa dipakai, dengan harga konservatif yang sama untuk semua.
3. **Latensi ±24–29 detik per panggilan**, lawan ±98–177 detik (GLM-5.3-Flash) dan ±147–334 detik (GLM-5.3; satu panggilan 596 detik, satu lagi lewat batas 900 detik). Untuk agen yang menyusun sambil pengguna menunggu, menit per panggilan tidak bisa dipakai.
4. **Tebak buta tidak membedakan secara berarti**: 2/9 omongan lolos (rata-rata 2,11 dari 3 penguji menebak benar), lawan 1/6 (2,17) untuk GLM-5.3 dan 0/9 (2,89) untuk GLM-5.3-Flash.
5. **Satu-satunya kriteria yang ia kalahkan: kealamian bahasa** — 3,00 lawan 4,00 (GLM-5.3) dan 3,22 (GLM-5.3-Flash); omongan manusia yang hidup 5,00. Selisih satu poin di skala 1–5, n = 9 penilaian, dari penilai model bahasa. Keluhan penilai atas draf DeepSeek konkret dan bisa diperbaiki di prompt: pesan yang terbaca seperti pengumuman, frasa internal ("dihitung di paket", "bilangan di omongan"), pengulangan "kartu data harga harian bursa mencatat".

**Yang TIDAK direkomendasikan, juga dari angka:** GLM-5.3 sebagai bawaan. Bahasanya paling alami, tetapi ±78 kali lebih mahal per draf lolos, gagal di satu dari tiga paket walau diberi 32.000 token, dan butuh 2,5–10 menit per panggilan. Model yang sekarang tertulis di `.env` sebagai `LLM_MODEL` adalah yang paling mahal dan paling lambat dari ketiganya.

**Peringatan yang lebih penting dari pilihan model: tidak satu pun draf LLM siap dipasang ke produk.** Hanya 3 dari 24 omongan draf yang lolos uji tebak buta K-05; kalibrasi dengan penguji dan prosedur yang sama atas omongan manusia yang hidup memberi 2/6, dengan rata-rata 1,50 dari 3 penguji menebak benar — draf ketiga model lebih mudah ditebak tanpa kartu (2,11–2,89). Validator menjaga **fakta** (jejak angka, tanggal ≤ T, bentuk 2×2, kata terlarang); ia tidak menjaga **tebakan**. Pola yang terlihat di jawaban mentah: pilihan benar sering hanya mengulang atau membantah angka di pesan dengan angka yang "lebih resmi", sementara pengecohnya jelas mengada-ada ("bursa tidak mencatat kenaikan harga", "dividen tunai itu hanya untuk pemilik terbesar saja"). Usul untuk milestone berikut: uji tebak buta otomatis menjadi langkah validator di dalam lingkar penyusun (penguji buta → umpan balik "pilihan kunci tertebak tanpa kartu" → tulis ulang), dan draf tetap melewati penyuntingan manusia sebelum sampai ke pemain.

## Keterbatasan

- **n kecil.** Tiga paket, satu sampel per model per putaran (suhu 0,3). Selisih satu sel lolos atau satu omongan tebak buta bukan bukti perbedaan model; yang cukup besar untuk dipegang hanya biaya, latensi, dan keterpotongan GLM di 12.000 token.
- **Penguji dan penilai adalah model bahasa** (subagent Claude Opus tanpa konteks eksekutor), bukan orang 20-an yang belum pernah beli saham. Penilaian kealamian oleh model bisa sejalan dengan gaya tulis model; pembanding manusia yang hidup ikut dinilai buta untuk mengukur itu (5,00 dari ketiga penilai).
- **Harga konservatif.** 2× harga OpenRouter untuk dua model Flash, dan angka penjaga 1,00/3,00 untuk GLM-5.3 — bukan tagihan Featherless (paketnya langganan; katalog `GET /models` sudah dihentikan penyedia, 404 "Gone."). Semua biaya di ledger bisa dihitung ulang dari token bila harga resmi diketahui.
- **Putaran 2 diputuskan sesudah melihat putaran 1.** Keputusan itu berlaku untuk ketiga model sekaligus dan kedua putaran dilaporkan; aturan peringkat menjumlah keduanya.
- **Validator adalah pendekatan.** "Kunci bisa diturunkan dari kartu penentu" diperiksa sebagai syarat rujukan (penjelasan merujuk kartu penentu; angka pilihan kunci ada di kartu atau dikutip dari pesan), bukan sebagai pembuktian logika bahwa jawabannya benar. Kata bilangan tanpa angka ("tujuh tahun") tidak dicek ke fakta. Reviewer disarankan membaca draf utuh di atas.
- **Teks yang dinilai adalah teks polos.** Rujukan `[[fact_id|teks]]` dilepas menjadi teksnya; di produk teks itu tautan. Satu keluhan penilai (GLM-5.3-Flash × TIRT: "…perlindungan investor penghentian 10 Desember 2025") berasal dari label rujukan yang ditempel di ujung kalimat — cacat tulisan modelnya, tetapi ia akan terbaca sedikit berbeda sebagai tautan.
- **Insiden jaringan.** Satu panggilan GLM-5.3 × TIRT putaran 2 melewati batas waktu 900 detik saat membaca badan respons; versi klien waktu itu tidak mencatatnya ke ledger. Klien diperbaiki (tes + sabotase), panggilan itu dicatat sesudahnya dengan perkiraan maksimum (US$0,1066, bertanda KOREKSI), dan selnya dijalankan ulang; rekaman sel yang terputus disimpan di `eval/keluaran-m2d/dibuang/`. Satu respons HTTP 200 tanpa `choices` (GLM-5.3 × ULTJ putaran 1, percobaan 3) juga dicatat dengan perkiraan maksimum.
- **Satu jendela waktu.** Semua panggilan terjadi 27 Sep 2026 ±11.20–13.10 UTC; latensi Featherless bergantung beban dan pemuatan model.
- **Pagu.** `.env` pemilik tidak memuat `LLM_PAGU_USD`; nilai kontrak (5) diberikan di baris perintah. Pagu diperiksa sebelum setiap percobaan HTTP; total ledger US$1,2380.

## Emiten ketiga: kenapa TIRT

Diukur dengan V2 atas seluruh gudang: emiten berharga dengan nol temuan berkeparahan konflik adalah ARNA, HITS, MERK, MLPT, dan TIRT. ARNA dan MERK hanya punya peristiwa dividen (sama dengan ULTJ). MLPT punya pemecahan saham dan penghentian cooling down, tetapi deret harganya tidak melompat di tanggal pemecahan — harga sebelum Juli 2026 sudah ditulis ulang, jadi harga "hari itu" tidak bisa dipercaya untuk peristiwa yang justru tentang harga. HITS datanya tipis (2 laporan, 1 suspensi). TIRT: penghentian sementara oleh bursa (cooling down) sesudah kenaikan harga kumulatif — jenis peristiwa yang tidak dipakai DADA maupun ULTJ — dengan alasan resmi tertulis di data, deret harga di kedua sisi, dan penghentian lain berasalan berbeda (keraguan atas kelangsungan usaha) sebagai pengecoh yang nyata. Kelemahannya: tidak ada laporan kepemilikan ≤ T, dan semua harga naiknya tercatat satu angka per hari (R19b; catatan itu ikut dikirim ke model).
