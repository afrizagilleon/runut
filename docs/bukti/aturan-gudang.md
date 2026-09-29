# Bukti: aturan verifikasi dijalankan atas seluruh gudang data

Berkas ini ditulis oleh `npm run verifikasi:gudang`. Jangan disunting tangan: jalankan perintahnya lagi. Perintah itu tidak membaca jaringan, jam dinding, maupun angka acak, jadi dua kali jalan atas data yang sama memberi berkas yang sama.

## Apa yang dibaca

Dari `.cache/sectors/`: **371 berkas**, **317 emiten**, **267 laporan kepemilikan unik** (1 rangkap dibuang), **7.523 baris harga unik** (261 rangkap dibuang), dan 556 baris suspensi.

Tidak ada berkas yang jenisnya tidak bisa dikenali dari isinya.

21 berkas adalah respons berpaginasi yang kosong. Respons seperti itu tidak memuat kode emitennya sama sekali, jadi ia tidak bisa dialamatkan ke emiten mana pun dari isinya: `ABMM-m4a-filings-p0.json`, `AGAR-m4a-filings-p0.json`, `AHAP-m4a-filings-p0.json`, `AKKU-m4a-filings-p0.json`, `ALTO-m4a-filings-p0.json`, `AMAG-m4a-filings-p0.json`, `APEX-m4a-filings-p0.json`, `AREA-m4a-filings-p0.json`, `ARGO-m4a-filings-p0.json`, `ASLC-m4a-filings-p0.json`, `ASPI-m4a-filings-p0.json`, `ASPR-m4a-filings-p0.json`, `ASSA-m4a-filings-p0.json`, `BBRM-m4a-filings-p0.json`, `BBSS-m4a-filings-p0.json`, `BEST-m4a-filings-p0.json`, `BNII-m4a-filings-p0.json`, `BSWD-m4a-filings-p0.json`, `COCO-filings-sebelum.json`, `MERK-filings.json`, `dada-news-2025.json`.

## Peristiwa perusahaan: apa yang boleh jadi kartu

Kurikulum melabeli kasus menurut **peristiwa**: perusahaan membagi dividen, menerbitkan saham baru, memecah saham, membeli kembali saham, keluar dari bursa. Tabel ini menghitung berapa kejadian tiap jenis ada di gudang, berapa yang punya harga harian di kedua sisi tanggalnya, dan berapa yang emitennya tidak punya satu pun angka yang saling bertentangan. Kolom terakhir adalah yang paling penting: apa yang **wajib dijelaskan** di kartu tentang jenis peristiwa itu.

| peristiwa | kejadian | punya harga di kedua sisi | lolos jadi bahan kartu | emiten |
|---|---:|---:|---:|---|
| dividen tunai | 131 | 31 | 27 | ABMM, ADHI, ADRO, ALII, AMAG, ARCI, ARNA, ARTA, ASLC, ASPR, ASSA, ATAP, AVIA, BBMD, BIRD, BNII, BOLT, CAMP, DADA, KRYA, MERK, MLPT, MTLA, RAJA, ULTJ |
| penerbitan saham baru | 25 | 6 | 2 | ADHI, AHAP, AKKU, ASSA, BAJA, BBRM, BCIC, BNII, BRNA, BSIM, BSWD, COCO, FORU |
| pemecahan saham | 13 | 2 | 1 | AIMS, ALKA, ARNA, BATA, BBRM, BCIC, MERK, MLPT, RAJA, RMKE, ULTJ |
| saham bonus | 1 | 0 | 0 | MTLA |
| pembelian kembali saham | 4 | 0 | 0 | ADRO, ARNA, ASLC, BBMD |
| keluar dari bursa | 0 | 0 | 0 | — |

Yang wajib dijelaskan di kartu, per jenis peristiwa:

- **dividen tunai** — Kartu harus menyebut tanggal ex — hari pertama pembeli baru tidak lagi kebagian dividen itu — karena harga biasanya membuka lebih rendah pada hari itu tanpa ada yang rugi.
- **penerbitan saham baru** — Harga sebelum dan sesudah tanggal ex penerbitan saham baru tidak bisa dibandingkan langsung, dan persen kepemilikan sebelum dan sesudahnya dibagi jumlah saham yang berbeda.
- **pemecahan saham** — Kartu harga tidak boleh melintasi tanggal pemecahan saham: di data ini dua medan dari endpoint yang sama saling bertentangan tentang apakah harga lama sudah ditulis ulang, dan sebabnya belum diketahui.
- **saham bonus** — Sama dengan pemecahan saham, jumlah lembar bertambah tanpa uang baru masuk, jadi harga per lembar sebelum dan sesudahnya bukan angka yang sebanding.
- **pembelian kembali saham** — Pembelian kembali saham hanya muncul sebagai kalimat di keputusan RUPS, tanpa jumlah dan tanpa tanggal, jadi tidak ada angka yang bisa dijadikan kartu.
- **keluar dari bursa** — Tidak ada satu medan pun di data ini yang menyatakan sebuah emiten keluar dari bursa, jadi peristiwa itu tidak bisa diperiksa sama sekali.

## Hasil per aturan

`ATURAN_V2` memuat 37 aturan; 4 di antaranya digantikan aturan lain dan hanya tercatat sebagai dilewati (R1 oleh R15, R2 oleh R14, R6 oleh R17B, R10 oleh R18a), jadi **33 aturan aktif**. 2 di antaranya lahir di M4b dari salah nyata audit gudang (R36, R37); sebelum M4b ada 31 aturan aktif. Cakupan R6 lama "laporannya ternyata bercerita tentang saham lain" kini dipegang R36; alasan lewat R6 di bawah sengaja tidak diubah karena tercantum di jejak pemeriksaan kasus ULTJ yang sedang tayang. Kasus tayang menjalankan daftar aturan bekunya sendiri (`docs/bukti/aturan-beku-kasus.json`), bukan daftar ini.

| aturan | satuan | diperiksa | hijau | merah[^merah] | tidak lengkap | dilewati |
|---|---|---:|---:|---:|---:|---:|
| R25 | emiten | 36 | 0 | 0 | 36 | 0 |
| R12 | laporan | 171 | 164 | 7 | 0 | 96 |
| R22 | nama pemegang | 319 | 281 | 38 | 0 | 0 |
| R20 | emiten | 52 | 32 | 20 | 0 | 0 |
| R32 | pergantian tahun buku | 222 | 212 | 10 | 0 | 0 |
| R21 | pasang sumber | 21 | 14 | 7 | 0 | 5.030 |
| R33 | pasang hari | 7.467 | 7.421 | 25 | 21 | 0 |
| R15 | laporan | 267 | 265 | 2 | 0 | 0 |
| R1 | laporan | 0 | 0 | 0 | 0 | 267 |
| R11a | laporan | 267 | 197 | 16 | 54 | 0 |
| R11b | sisi laporan | 508 | 399 | 42 | 67 | 26 |
| R7 | sisi laporan | 534 | 344 | 81 | 109 | 0 |
| R14 | sambungan | 166 | 145 | 21 | 0 | 0 |
| R16 | sambungan | 166 | 161 | 5 | 0 | 0 |
| R2 | sambungan | 0 | 0 | 0 | 0 | 267 |
| R13 | medan kepemilikan | 801 | 695 | 4 | 102 | 0 |
| R3 | laporan | 259 | 253 | 6 | 0 | 0 |
| R4 | laporan | 267 | 267 | 0 | 0 | 0 |
| R5 | rantai | 0 | 0 | 0 | 0 | 0 |
| R8 | laporan | 0 | 0 | 0 | 0 | 267 |
| R9 | laporan | 267 | 266 | 1 | 0 | 0 |
| R17B | butir transaksi | 370 | 172 | 123 | 75 | 4 |
| R6 | pemeriksaan | 0 | 0 | 0 | 0 | 267 |
| R18a | baris harga bervolume nol | 850 | 61 | 0 | 789 | 6.673 |
| R10 | baris harga | 0 | 0 | 0 | 0 | 267 |
| R19a | hari datar | 1.229 | 385 | 844 | 0 | 6.294 |
| R19b | hari bursa | 7.523 | 6.049 | 1.474 | 0 | 0 |
| R28 | aksi korporasi | 39 | 8 | 0 | 31 | 0 |
| R35 | nilai harga ekstrem | 440 | 174 | 4 | 262 | 0 |
| R23 | keputusan RUPS | 6 | 4 | 2 | 0 | 385 |
| R31 | angka dividen di keputusan RUPS | 11 | 9 | 2 | 0 | 381 |
| R26 | tahun buku berdividen | 112 | 84 | 10 | 18 | 0 |
| R27 | medan rasio | 4.344 | 1.369 | 14 | 2.961 | 0 |
| R29 | dividen | 129 | 29 | 0 | 100 | 2 |
| R36 | laporan | 267 | 216 | 1 | 50 | 0 |
| R37 | tahun buku | 363 | 343 | 3 | 17 | 0 |
| R34 | aksi korporasi | 170 | 39 | 0 | 131 | 0 |

[^merah]: Untuk aturan penolak, "merah" berarti dua angka di dalam data yang sama saling bertentangan. Untuk aturan penanda (R10, R11b, R12, R16, R18a, R19a, R19b, R20, R21, R22, R26, R27, R28, R29, R32, R33, R34), "merah" berarti hal itu perlu dijelaskan sebelum dipakai di kartu — bukan bahwa datanya salah.

### R25 — Kelengkapan halaman laporan

Kami menolak bukti negatif kalau daftar laporannya belum terbukti habis.

Diperiksa 36 emiten: 0 tidak bermasalah, 0 bertentangan, 36 datanya tidak cukup untuk memutuskan. 0 emiten tidak masuk pemeriksaan ini. Aturannya jalan untuk 36 emiten dan dilewati untuk 281.

Alasan dilewati:
- Tidak ada berkas respons laporan yang bisa dialamatkan ke emiten ini.

### R12 — Tanggal di nama berkas laporan

Kami menandai laporan yang tanggal di nama berkasnya berbeda dari jam terbitnya, dan memakai tanggal nama berkas untuk mengurutkan rantai.

Diperiksa 171 laporan: 164 tidak bermasalah, 7 ditandai, 0 datanya tidak cukup untuk memutuskan. 96 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 36 emiten dan dilewati untuk 281.

Alasan dilewati:
- Tidak ada laporan untuk diperiksa.

Contoh nyata:
- **ALII** — Nama berkas laporan menyebut tanggal 2026-02-20, sedangkan jam terbitnya 2026-02-27T05:57:00. Untuk mengurutkan rantai, yang dipakai adalah tanggal nama berkas.
- **ALII** — Nama berkas laporan menyebut tanggal 2026-02-20, sedangkan jam terbitnya 2026-02-27T05:57:00. Untuk mengurutkan rantai, yang dipakai adalah tanggal nama berkas.

### R22 — Ejaan nama pemegang saham

Kami menandai satu pemegang saham yang ditulis dengan lebih dari satu ejaan, supaya rantainya tidak terbaca sebagai dua orang.

Diperiksa 319 nama pemegang: 281 tidak bermasalah, 38 ditandai, 0 datanya tidak cukup untuk memutuskan. 0 nama pemegang tidak masuk pemeriksaan ini. Aturannya jalan untuk 55 emiten dan dilewati untuk 262.

Alasan dilewati:
- Tidak ada nama pemegang saham untuk dibandingkan.

Contoh nyata:
- **AIMS** — Satu pemegang saham ditulis dengan 2 ejaan berbeda: "Aims Indo Investama", "PT. Aims Indo Investama". Tanpa disatukan, rantainya terbaca sebagai 2 pemegang yang berbeda.
- **ALKA** — Satu pemegang saham ditulis dengan 2 ejaan berbeda: "Gesit Perkasa", "PT. Gesit Perkasa". Tanpa disatukan, rantainya terbaca sebagai 2 pemegang yang berbeda.

### R20 — Basis saham di laba per lembar

Kami menandai emiten yang laba per lembarnya tidak dihitung atas jumlah saham yang sama tiap tahun, karena dua angka seperti itu tidak bisa dibandingkan langsung.

Diperiksa 52 emiten: 32 tidak bermasalah, 20 ditandai, 0 datanya tidak cukup untuk memutuskan. 0 emiten tidak masuk pemeriksaan ini. Aturannya jalan untuk 52 emiten dan dilewati untuk 265.

Alasan dilewati:
- Kurang dari dua tahun buku yang punya laba sekaligus laba per lembar, jadi tidak ada dua basis yang bisa dibandingkan.

Contoh nyata:
- **ADHI** — Laba per lembar ADHI tidak dihitung atas jumlah saham yang sama tiap tahun. Laba dibagi laba per lembar — yaitu jumlah saham yang dipakai sebagai penyebutnya — memberi 3.886.585.365 lembar untuk tahun buku 2021 dan 8.407.608.979 lembar untuk tahun buku 2023, selisih 116,32%. Dua angka laba per lembar dari tahun yang berbeda karena itu tidak bisa dibandingkan langsung: sebagian perubahannya berasal dari jumlah sahamnya, bukan dari labanya.
- **ADRO** — Laba per lembar ADRO tidak dihitung atas jumlah saham yang sama tiap tahun. Laba dibagi laba per lembar — yaitu jumlah saham yang dipakai sebagai penyebutnya — memberi 29.389.689.400 lembar untuk tahun buku 2025 dan 31.986.013.986 lembar untuk tahun buku 2020, selisih 8,83%. Dua angka laba per lembar dari tahun yang berbeda karena itu tidak bisa dibandingkan langsung: sebagian perubahannya berasal dari jumlah sahamnya, bukan dari labanya.

### R32 — Perubahan jumlah saham dijelaskan aksi korporasi

Kami menandai perubahan jumlah saham dari satu tahun buku ke tahun berikutnya yang tidak ada satu pun aksi korporasi tercatat untuk menjelaskannya.

Diperiksa 222 pergantian tahun buku: 212 tidak bermasalah, 10 ditandai, 0 datanya tidak cukup untuk memutuskan. 0 pergantian tahun buku tidak masuk pemeriksaan ini. Aturannya jalan untuk 52 emiten dan dilewati untuk 265.

Alasan dilewati:
- Kurang dari dua tahun buku yang basis sahamnya bisa dihitung, jadi tidak ada pergantian tahun untuk diperiksa.

Contoh nyata:
- **ADHI** — Jumlah saham ADHI menjadi 2,163 kali lipat antara tahun buku 2021 dan 2022 — dari 3.886.585.365 lembar menjadi 8.407.024.793 lembar. Aksi korporasi yang tercatat tahun itu — penerbitan saham baru 10000000 berbanding 19783200 pada 2022-10-25 — rasionya tidak sebesar itu. Penyebabnya tidak diketahui.
- **AHAP** — Jumlah saham AHAP menjadi 1,303 kali lipat antara tahun buku 2021 dan 2022 — dari 3.758.620.689 lembar menjadi 4.896.103.896 lembar. Aksi korporasi yang tercatat tahun itu — penerbitan saham baru 3 berbanding 2 pada 2022-08-08 — rasionya tidak sebesar itu. Penyebabnya tidak diketahui.

### R21 — Jumlah saham beda antar sumber

Kami menandai dua sumber yang menyebut jumlah saham berbeda untuk tanggal yang sama, dan tidak mengadu dua angka yang diukur pada waktu yang berbeda.

Diperiksa 21 pasang sumber: 14 tidak bermasalah, 7 ditandai, 0 datanya tidak cukup untuk memutuskan. 5.030 pasang sumber tidak masuk pemeriksaan ini. Aturannya jalan untuk 54 emiten dan dilewati untuk 263.

Alasan dilewati:
- Kurang dari dua sumber jumlah saham, jadi tidak ada yang bisa diadu.

Contoh nyata:
- **ALII** — Dua sumber menyebut jumlah saham ALII yang berbeda untuk tanggal yang sama, 2024-12-31: 15.493.763.257 lembar menurut laporan keuangan tahun buku 2024, yang menyebut jumlah saham yang diterbitkan; 15.825.800.000 lembar menurut nilai pasar dibagi harga tutup pada 2025-01-02, hari bursa terakhir tahun buku 2024. Selisihnya 2,14%. Karena keduanya berbicara tentang hari yang sama, setidaknya satu di antaranya tidak bisa benar; mana yang benar tidak terbaca dari data ini.
- **AMMS** — Dua sumber menyebut jumlah saham AMMS yang berbeda untuk tanggal yang sama, 2025-12-31: 1.203.347.103 lembar menurut laporan keuangan tahun buku 2025, yang menyebut jumlah saham yang diterbitkan; 1.235.296.802 lembar menurut nilai pasar dibagi harga tutup pada 2025-12-30, hari bursa terakhir tahun buku 2025. Selisihnya 2,66%. Karena keduanya berbicara tentang hari yang sama, setidaknya satu di antaranya tidak bisa benar; mana yang benar tidak terbaca dari data ini.

### R33 — Kestabilan jumlah saham tersirat

Kami menandai hari yang jumlah saham tersiratnya melompat, karena penyebut persen tidak boleh diambil dari hari seperti itu.

Diperiksa 7.467 pasang hari: 7.421 tidak bermasalah, 25 ditandai, 21 datanya tidak cukup untuk memutuskan. 0 pasang hari tidak masuk pemeriksaan ini. Aturannya jalan untuk 56 emiten dan dilewati untuk 261.

Alasan dilewati:
- Kurang dari dua hari harga, tidak ada pasangan untuk dibandingkan.

Contoh nyata:
- **ADRO** — Jumlah saham tersirat ADRO berubah 4.45% dalam satu hari bursa: 30.758.665.900 lembar pada 2025-08-25 menjadi 29.389.689.400 lembar pada 2025-08-26. Tidak ada aksi korporasi tercatat dalam 21 hari di sekitarnya; penyebabnya tidak diketahui.
- **ADRO** — Jumlah saham tersirat ADRO berubah 2.00% dalam satu hari bursa: 29.389.689.400 lembar pada 2026-07-10 menjadi 28.800.494.200 lembar pada 2026-07-13. Tidak ada aksi korporasi tercatat dalam 21 hari di sekitarnya; penyebabnya tidak diketahui.

### R15 — Aritmetika per laporan, termasuk transaksi jenis lain

Kami menolak kartu kalau penjumlahan di dalam satu laporan tidak cocok, termasuk untuk laporan yang jenis transaksinya bukan beli maupun jual.

Diperiksa 267 laporan: 265 tidak bermasalah, 2 bertentangan, 0 datanya tidak cukup untuk memutuskan. 0 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 36 emiten dan dilewati untuk 281.

Alasan dilewati:
- Tidak ada laporan untuk diperiksa.

Contoh nyata:
- **ALII** — Laporan 2026-02-27T06:06:00 (jenis "sell") tidak konsisten sendiri: 335.829.650 - 7.450.300 = 328.379.350, tetapi laporan menulis 308.612.450 lembar sesudah transaksi.
- **ASHA** — Laporan 2025-12-30T21:24:55 (jenis "sell") tidak konsisten sendiri: 375.000.000 - 0 = 375.000.000, tetapi laporan menulis 0 lembar sesudah transaksi.

### R1 — Aritmetika per laporan

Kami menolak kartu kalau penjumlahan di dalam satu laporan tidak cocok dengan dirinya sendiri.

Diperiksa 0 laporan: 0 tidak bermasalah, 0 bertentangan, 0 datanya tidak cukup untuk memutuskan. 267 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 0 emiten dan dilewati untuk 317.

Alasan dilewati:
- Digantikan R15, yang memeriksa hal yang sama dan juga menangani transaction_type "others". Menjalankan keduanya akan melahirkan dua temuan untuk satu cacat data.

### R11a — Penyebut dua sisi satu laporan

Kami menolak kartu kalau dua persen di dalam satu laporan tidak mungkin berasal dari jumlah saham beredar yang sama.

Diperiksa 267 laporan: 197 tidak bermasalah, 16 bertentangan, 54 datanya tidak cukup untuk memutuskan. 0 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 36 emiten dan dilewati untuk 281.

Alasan dilewati:
- Tidak ada laporan untuk diperiksa.

Contoh nyata:
- **ALKA** — Laporan 2025-01-07T11:24:00 menulis 69% sebelum dan 84% sesudah, tetapi tidak ada satu jumlah saham beredar pun yang menjelaskan keduanya: sisi sebelum menuntut 510.265.640-510.339.597 lembar, sisi sesudah menuntut 506.390.757-506.451.045 lembar.
- **AMMS** — Laporan 2025-09-23T14:36:59 menulis 1.71% sebelum dan 2.47% sesudah, tetapi tidak ada satu jumlah saham beredar pun yang menjelaskan keduanya: sisi sebelum menuntut 1.201.451.895-1.208.498.534 lembar, sisi sesudah menuntut 1.229.797.980-1.234.787.018 lembar.

### R11b — Satu penyebut untuk seluruh rantai

Kami menandai rantai laporan satu emiten yang persennya tidak bisa berasal dari satu jumlah saham beredar yang sama.

Diperiksa 508 sisi laporan: 399 tidak bermasalah, 42 ditandai, 67 datanya tidak cukup untuk memutuskan. 26 sisi laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 27 emiten dan dilewati untuk 290.

Alasan dilewati:
- Kurang dari dua laporan, jadi tidak ada rantai yang perlu satu penyebut bersama.
- Tidak ada satu pun persen yang bisa memberi selang penyebut di rantai ini.

Contoh nyata:
- **ADRO** — Tidak ada satu jumlah saham beredar pun yang menjelaskan sebagian besar rantai laporan ADRO. Angka yang paling banyak cocok, 29.462.855.527 lembar, hanya menjelaskan 2 dari 4 sisi laporan. Sisanya, 2 sisi laporan, menyiratkan jumlah saham yang lain: 2025-10-17T22:27:59 sebelum transaksi menulis 84,451%, yang baru mungkin kalau sahamnya 40.882.335.437 lembar; 2025-10-17T22:27:59 sesudah transaksi menulis 85,016%, yang baru mungkin kalau sahamnya 40.882.352.851 lembar. Yang paling jauh meleset 38,76% dari angka pilihan. Perusahaan boleh menerbitkan saham di tengah rantai, jadi ini belum tentu kesalahan — tetapi dua persen dari rantai ini tidak boleh dibandingkan langsung sebelum diketahui keduanya memakai pembagi yang sama.
- **ALII** — Rantai laporan ALII tidak bisa dijelaskan satu jumlah saham beredar. Angka yang paling banyak cocok adalah 15.828.926.741 lembar. Angka ini masuk ke dalam selang 20 dari 24 sisi laporan, lebih banyak daripada angka lain mana pun. Sisanya, 4 sisi laporan, menyiratkan jumlah saham yang lain: 2026-02-27T05:57:00 sebelum transaksi menulis 0,097%, yang baru mungkin kalau sahamnya 18.196.391.753 lembar; 2026-02-27T05:57:00 sesudah transaksi menulis 0,07%, yang baru mungkin kalau sahamnya 17.428.857.143 lembar. Yang paling jauh meleset 14,96% dari angka pilihan. Perusahaan boleh menerbitkan saham di tengah rantai, jadi ini belum tentu kesalahan — tetapi dua persen dari rantai ini tidak boleh dibandingkan langsung sebelum diketahui keduanya memakai pembagi yang sama.

### R7 — Persen dihitung ulang terhadap saham beredar pada tanggal laporan

Kami menolak kartu kalau persen yang ditulis laporan tidak cocok dengan jumlah lembar dibagi saham beredar yang berlaku pada tanggal laporan itu.

Diperiksa 534 sisi laporan: 344 tidak bermasalah, 81 bertentangan, 109 datanya tidak cukup untuk memutuskan. 0 sisi laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 36 emiten dan dilewati untuk 281.

Alasan dilewati:
- Tidak ada laporan untuk diperiksa.

Contoh nyata:
- **ADRO** — Laporan 2025-10-17T22:27:59 menulis kepemilikan sebelum transaksi 84.451%, padahal 34.525.541.100 lembar dibagi 29.389.689.400 saham beredar yang berlaku 2025-10-17 adalah 117.48%. Persen 84.451% baru mungkin kalau penyebutnya antara 40.879.915.104 dan 40.884.756.057 lembar.
- **ADRO** — Laporan 2025-10-17T22:27:59 menulis kepemilikan sesudah transaksi 85.016%, padahal 34.756.541.100 lembar dibagi 29.389.689.400 saham beredar yang berlaku 2025-10-17 adalah 118.26%. Persen 85.016% baru mungkin kalau penyebutnya antara 40.879.948.601 dan 40.884.757.384 lembar.

### R14 — Rantai kepemilikan putus

Kami menolak kartu kalau ada lembar yang berpindah tangan tanpa laporan di antara dua laporan berurutan.

Diperiksa 166 sambungan: 145 tidak bermasalah, 21 bertentangan, 0 datanya tidak cukup untuk memutuskan. 0 sambungan tidak masuk pemeriksaan ini. Aturannya jalan untuk 28 emiten dan dilewati untuk 289.

Alasan dilewati:
- Rantai kurang dari dua laporan, tidak ada sambungan untuk diperiksa.

Contoh nyata:
- **BAPA** — Rantai Belvin Tannadi putus: laporan 2026-06-18T04:19:00 berakhir di 76.384.700 lembar, tetapi laporan berikutnya 2026-06-26T07:21:58 mulai dari 0 lembar. Ada 76.384.700 lembar yang berkurang tanpa laporan.
- **BATA** — Rantai Liem Tjen Hung putus: laporan 2026-04-01T15:40:35 berakhir di 68.554.100 lembar, tetapi laporan berikutnya 2026-06-04T17:08:47 mulai dari 71.239.700 lembar. Ada 2.685.600 lembar yang bertambah tanpa laporan.

### R16 — Jam terbit laporan terhadap urutan rantai

Kami menandai laporan yang terbit lebih dulu tetapi sudah memuat keadaan yang baru dihasilkan laporan berikutnya.

Diperiksa 166 sambungan: 161 tidak bermasalah, 5 ditandai, 0 datanya tidak cukup untuk memutuskan. 0 sambungan tidak masuk pemeriksaan ini. Aturannya jalan untuk 28 emiten dan dilewati untuk 289.

Alasan dilewati:
- Rantai kurang dari dua laporan, tidak ada sambungan untuk diperiksa.

Contoh nyata:
- **BIRD** — 1 sambungan yang jam terbitnya tidak searah dengan rantai juga putus rantainya, dan sudah dilaporkan sebagai satu temuan R14. Satu cacat data tidak dihitung dua kali.
- **COCO** — 1 sambungan yang jam terbitnya tidak searah dengan rantai juga putus rantainya, dan sudah dilaporkan sebagai satu temuan R14. Satu cacat data tidak dihitung dua kali.

### R2 — Kontinuitas rantai

Kami menolak kartu kalau saldo akhir satu laporan tidak sama dengan saldo awal laporan berikutnya.

Diperiksa 0 sambungan: 0 tidak bermasalah, 0 bertentangan, 0 datanya tidak cukup untuk memutuskan. 267 sambungan tidak masuk pemeriksaan ini. Aturannya jalan untuk 0 emiten dan dilewati untuk 317.

Alasan dilewati:
- Digantikan R14, yang memeriksa hal yang sama tetapi mengurutkan rantai dengan tanggal nama berkas (R12) dan menyatukan ejaan nama pemegang (R22).

### R13 — Lembar dilaporkan melebihi saham beredar

Kami menolak kartu kalau satu pemegang dilaporkan memegang lebih banyak lembar daripada yang diterbitkan.

Diperiksa 801 medan kepemilikan: 695 tidak bermasalah, 4 bertentangan, 102 datanya tidak cukup untuk memutuskan. 0 medan kepemilikan tidak masuk pemeriksaan ini. Aturannya jalan untuk 36 emiten dan dilewati untuk 281.

Alasan dilewati:
- Tidak ada laporan untuk diperiksa.

Contoh nyata:
- **ADRO** — Laporan 2025-10-17T22:27:59 menulis kepemilikan sebelum 34.525.541.100 lembar, yaitu 117.5% dari 29.389.689.400 saham beredar yang berlaku 2025-10-17. Satu pemegang tidak bisa memegang lebih banyak lembar daripada yang diterbitkan.
- **ADRO** — Laporan 2025-10-17T22:27:59 menulis kepemilikan sesudah 34.756.541.100 lembar, yaitu 118.3% dari 29.389.689.400 saham beredar yang berlaku 2025-10-17. Satu pemegang tidak bisa memegang lebih banyak lembar daripada yang diterbitkan.

### R3 — Laporan ganda

Kami menolak kartu kalau satu rangkaian transaksi yang sama dilaporkan dua kali.

Diperiksa 259 laporan: 253 tidak bermasalah, 6 bertentangan, 0 datanya tidak cukup untuk memutuskan. 0 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 28 emiten dan dilewati untuk 289.

Alasan dilewati:
- Rantai kurang dari dua laporan, tidak ada urutan yang bisa berulang.

Contoh nyata:
- **DADA** — 6 transaksi yang dilaporkan 2025-10-26T22:50:48–2025-10-26T22:54:38 dilaporkan ulang persis 2025-10-26T22:55:13–2025-10-26T23:01:13, dengan tanggal, jenis, jumlah, dan harga yang sama. Set ulangan berjumlah 586.000.000 lembar.

### R4 — Tanggal ketersediaan

Kami menolak kartu kalau laporannya memuat transaksi bertanggal sesudah laporan itu sendiri terbit.

Diperiksa 267 laporan: 267 tidak bermasalah, 0 bertentangan, 0 datanya tidak cukup untuk memutuskan. 0 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 36 emiten dan dilewati untuk 281.

Alasan dilewati:
- Tidak ada laporan untuk diperiksa.

### R5 — Rekonsiliasi dengan potret kepemilikan

Kami menolak kartu kalau saldo akhir rantai tidak cocok dengan sumber kedua.

Diperiksa 0 rantai: 0 tidak bermasalah, 0 bertentangan, 0 datanya tidak cukup untuk memutuskan. 0 rantai tidak masuk pemeriksaan ini. Aturannya jalan untuk 0 emiten dan dilewati untuk 317.

Alasan dilewati:
- Tidak ada sumber kedua (potret kepemilikan atau saldo awal laporan berikutnya) untuk dibandingkan.

### R8 — Tanda repo

Kami menolak kartu kalau dokumennya menandai transaksi sebagai perjanjian beli kembali, yang bukan jual lepas.

Diperiksa 0 laporan: 0 tidak bermasalah, 0 bertentangan, 0 datanya tidak cukup untuk memutuskan. 267 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 0 emiten dan dilewati untuk 317.

Alasan dilewati:
- Kolom repurchase agreement tidak ada di data API dan belum ada PDF laporan yang diurai, sehingga tanda repo tidak bisa diperiksa.

### R9 — Field terstruktur vs teks

Kami menolak kartu kalau angka di teks laporan berbeda dari angka di kolomnya sendiri.

Diperiksa 267 laporan: 266 tidak bermasalah, 1 bertentangan, 0 datanya tidak cukup untuk memutuskan. 0 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 36 emiten dan dilewati untuk 281.

Alasan dilewati:
- Laporan tidak memuat teks yang bisa diadu dengan field terstruktur.

Contoh nyata:
- **KRYA** — Laporan 2026-01-29T15:28:54: teks menyebut kepemilikan berubah dari 561.322.772 ke 522.207.800 lembar, sedangkan field terstrukturnya 602.207.800 ke 522.207.800.

### R17B — Harga laporan terhadap rentang harga hari transaksinya

Kami menolak kartu kalau harga yang ditulis laporan di luar rentang harga saham itu pada tanggal transaksinya sendiri.

Diperiksa 370 butir transaksi: 172 tidak bermasalah, 123 bertentangan, 75 datanya tidak cukup untuk memutuskan. 4 butir transaksi tidak masuk pemeriksaan ini. Aturannya jalan untuk 35 emiten dan dilewati untuk 282.

Alasan dilewati:
- Tidak ada butir transaksi bertanggal untuk diperiksa.
- Tidak ada data harga harian untuk membandingkan.

Contoh nyata:
- **ADHI** — Laporan 2025-08-08T23:21:44 menyebut transaksi 2025-07-31 pada harga Rp239,08, padahal harga saham hari itu hanya bergerak Rp240-Rp250.
- **ADHI** — Laporan 2025-08-08T23:22:14 menyebut transaksi 2025-07-31 pada harga Rp239,08, padahal harga saham hari itu hanya bergerak Rp240-Rp250.

### R6 — Subjek laporan dan rentang harga

Kami menolak kartu kalau laporannya ternyata bercerita tentang saham lain, atau harganya di luar rentang hari itu.

Diperiksa 0 pemeriksaan: 0 tidak bermasalah, 0 bertentangan, 0 datanya tidak cukup untuk memutuskan. 267 pemeriksaan tidak masuk pemeriksaan ini. Aturannya jalan untuk 0 emiten dan dilewati untuk 317.

Alasan dilewati:
- Pemeriksaan rentang harganya digantikan R17B, yang membandingkan tiap butir transaksi dengan rentang harga tanggalnya sendiri. Pemeriksaan simbolnya tidak berarti di gudang ini: pemuat mengelompokkan laporan menurut simbol di dalam barisnya sendiri, jadi ia selalu hijau tanpa memeriksa apa pun.

### R18a — Hari bervolume nol tanpa baris suspensi

Kami menandai hari yang volumenya nol tetapi tidak ada di daftar suspensi, dan tidak menyimpulkan apa pun darinya.

Diperiksa 850 baris harga bervolume nol: 61 tidak bermasalah, 0 ditandai, 789 datanya tidak cukup untuk memutuskan. 6.673 baris harga bervolume nol tidak masuk pemeriksaan ini. Aturannya jalan untuk 56 emiten dan dilewati untuk 261.

Alasan dilewati:
- Tidak ada data harga harian untuk diperiksa.

### R10 — Hari tanpa volume

Kami menandai hari yang tidak mencatat satu lembar pun berpindah tangan.

Diperiksa 0 baris harga: 0 tidak bermasalah, 0 ditandai, 0 datanya tidak cukup untuk memutuskan. 267 baris harga tidak masuk pemeriksaan ini. Aturannya jalan untuk 0 emiten dan dilewati untuk 317.

Alasan dilewati:
- Digantikan R18a, yang memeriksa hal yang sama tetapi menjawab TIDAK_LENGKAP alih-alih KONFLIK: daftar suspensi hanya mencatat hari mulai berhenti, bukan tiap harinya.

### R19a — Harga datar pada hari tanpa transaksi

Kami menandai hari yang harganya hanya satu angka dan volumenya nol, karena angka itu bukan harga yang disepakati siapa pun.

Diperiksa 1.229 hari datar: 385 tidak bermasalah, 844 ditandai, 0 datanya tidak cukup untuk memutuskan. 6.294 hari datar tidak masuk pemeriksaan ini. Aturannya jalan untuk 40 emiten dan dilewati untuk 277.

Alasan dilewati:
- Tidak ada hari yang harga buka, tertinggi, terendah, dan tutupnya sama.

Contoh nyata:
- **AGAR** — 19 hari bursa AGAR antara 2026-07-20 dan 2026-09-02 mencatat satu harga saja untuk buka, tertinggi, terendah, dan tutup, sementara volumenya nol. Angka itu bukan harga yang disepakati siapa pun hari itu.
- **AHAP** — 7 hari bursa AHAP antara 2026-01-07 dan 2026-01-20 mencatat satu harga saja untuk buka, tertinggi, terendah, dan tutup, sementara volumenya nol. Angka itu bukan harga yang disepakati siapa pun hari itu.

### R19b — Runtun hari datar

Kami menandai runtun hari bursa yang tiap harinya hanya mencatat satu angka untuk buka, tertinggi, terendah, dan tutup — entah harganya diam, entah berganti tiap hari.

Diperiksa 7.523 hari bursa: 6.049 tidak bermasalah, 1.474 ditandai, 0 datanya tidak cukup untuk memutuskan. 0 hari bursa tidak masuk pemeriksaan ini. Aturannya jalan untuk 56 emiten dan dilewati untuk 261.

Alasan dilewati:
- Hari bursa kurang dari tiga, tidak ada runtun yang bisa terbentuk.

Contoh nyata:
- **AGAR** — Selama 9 dari 10 hari bursa antara 2026-07-14 dan 2026-07-27, harga AGAR tiap harinya hanya mencatat satu angka — buka, tertinggi, terendah, dan tutup sama — walau harganya berganti dari hari ke hari (Rp260 di awal, Rp630 di akhir).
- **AGAR** — Selama 20 hari bursa berturut-turut, dari 2026-07-15 sampai 2026-08-11, harga AGAR tiap harinya hanya mencatat satu angka — buka, tertinggi, terendah, dan tutup sama — walau harganya berganti dari hari ke hari (Rp324 di awal, Rp1.210 di akhir).

### R28 — Label deret harga di sekitar aksi korporasi

Kami memberi label pada deret harga di sekitar aksi korporasi, dan melarang kartu harga melintasi tanggal stock split.

Diperiksa 39 aksi korporasi: 8 tidak bermasalah, 0 ditandai, 31 datanya tidak cukup untuk memutuskan. 0 aksi korporasi tidak masuk pemeriksaan ini. Aturannya jalan untuk 23 emiten dan dilewati untuk 294.

Alasan dilewati:
- Tidak ada aksi korporasi tercatat untuk emiten ini.

### R35 — Harga ekstrem ringkasan terjangkau deret harian

Kami menolak kartu kalau harga tertinggi atau terendah yang disebut ringkasan tidak terjangkau deret harga hariannya sendiri.

Diperiksa 440 nilai harga ekstrem: 174 tidak bermasalah, 4 bertentangan, 262 datanya tidak cukup untuk memutuskan. 0 nilai harga ekstrem tidak masuk pemeriksaan ini. Aturannya jalan untuk 55 emiten dan dilewati untuk 262.

Alasan dilewati:
- Ringkasan emiten ini tidak memuat all_time_price.

Contoh nyata:
- **AHAP** — Ringkasan AHAP menyebut 90_d_low Rp76 pada 2026-09-22, padahal baris harga harian hari itu hanya bergerak Rp97-Rp106. Angka itu tidak terjangkau deret harganya sendiri.
- **COCO** — Ringkasan COCO menyebut 52_w_low Rp66 pada 2026-07-01, padahal baris harga harian hari itu hanya bergerak Rp116-Rp172. Angka itu tidak terjangkau deret harganya sendiri.

### R23 — Laba di keputusan RUPS versus laporan keuangan

Kami menolak kartu kalau laba yang disebut keputusan RUPS berbeda dari laba di laporan keuangan tahun buku yang sama.

Diperiksa 6 keputusan RUPS: 4 tidak bermasalah, 2 bertentangan, 0 datanya tidak cukup untuk memutuskan. 385 keputusan RUPS tidak masuk pemeriksaan ini. Aturannya jalan untuk 56 emiten dan dilewati untuk 261.

Alasan dilewati:
- Emiten ini tidak punya satu pun RUPS tercatat.

Contoh nyata:
- **AVIA** — Laba bersih tahun buku 2025 ditulis dua kali dengan angka yang berbeda. Keputusan RUPS AVIA pada 2026-04-09 menyebut Rp2; laporan keuangan menyebut Rp1.747.462.000.000. Selisihnya Rp1.747.461.999.998. Laba sebelum pajak dikurangi pajak di laporan yang sama, Rp1.744.020.000.000, juga tidak sama dengan angka RUPS. Mana yang benar tidak terbaca dari data ini — keputusan RUPS bisa menyebut laba induk saja sementara laporan keuangan menyebut laba seluruh kelompok usaha, dan keduanya sah. Angka laba yang dipakai di kartu harus menyebut dari mana ia diambil.
- **BSIM** — Laba bersih tahun buku 2025 ditulis dua kali dengan angka yang berbeda. Keputusan RUPS BSIM pada 2026-06-25 menyebut Rp285.747.406.391; laporan keuangan menyebut Rp285.748.000.000. Selisihnya Rp593.609. Laba sebelum pajak dikurangi pajak di laporan yang sama, Rp322.430.000.000, juga tidak sama dengan angka RUPS. Mana yang benar tidak terbaca dari data ini — keputusan RUPS bisa menyebut laba induk saja sementara laporan keuangan menyebut laba seluruh kelompok usaha, dan keduanya sah. Angka laba yang dipakai di kartu harus menyebut dari mana ia diambil.

### R31 — Dividen di keputusan RUPS versus medan dividend

Kami menolak kartu kalau dividen per lembar yang disebut keputusan RUPS tidak ada di medan dividen, atau baru cocok sesudah dikali rasio pemecahan saham.

Diperiksa 11 angka dividen di keputusan RUPS: 9 tidak bermasalah, 2 bertentangan, 0 datanya tidak cukup untuk memutuskan. 381 angka dividen di keputusan RUPS tidak masuk pemeriksaan ini. Aturannya jalan untuk 56 emiten dan dilewati untuk 261.

Alasan dilewati:
- Emiten ini tidak punya satu pun RUPS tercatat.

Contoh nyata:
- **MLPT** — Keputusan RUPS MLPT pada 2026-04-29 menyebut dividen Rp133,50 per lembar, tetapi medan dividen memberi Rp2,14 dengan tanggal ex 2025-11-07 ditambah Rp3,20 dengan tanggal ex 2026-05-11 — 25 kali lebih kecil. Angkanya baru cocok sesudah dikali 25, yaitu rasio pemecahan saham yang tercatat untuk emiten ini. Artinya medan dividen sudah dibagi rasio pemecahan saham sementara deret harganya belum, jadi dividen dan harga di data ini tidak memakai satuan yang sama. Kartu dividen yang melintasi tanggal pemecahan saham tidak boleh memakai medan itu apa adanya.
- **RAJA** — Keputusan RUPS RAJA pada 2026-06-23 menyebut dividen Rp28 per lembar, dan angka itu tidak ada di medan dividen. Yang ada di sana untuk rentang waktu yang sama: Rp12 (ex 2025-05-14), Rp5 (ex 2026-01-09), Rp40 (ex 2026-07-02). Tidak ada satu pun yang sama dengannya, tidak ada dua yang jumlahnya sama dengannya, dan tidak ada pula yang cocok sesudah dikali rasio pemecahan saham yang tercatat. Mana yang benar tidak terbaca dari data ini.

### R26 — Pembagian laba terhadap laba tahun buku

Kami menandai pembagian dividen yang tidak masuk akal dibandingkan laba tahun buku yang kami petakan untuknya.

Diperiksa 112 tahun buku berdividen: 84 tidak bermasalah, 10 ditandai, 18 datanya tidak cukup untuk memutuskan. 0 tahun buku berdividen tidak masuk pemeriksaan ini. Aturannya jalan untuk 25 emiten dan dilewati untuk 292.

Alasan dilewati:
- Emiten ini tidak punya satu pun dividen tercatat.

Contoh nyata:
- **ABMM** — ABMM membagikan Rp295 per lembar dengan tanggal ex 2024-05-28, yang menurut aturan pemetaan kami termasuk tahun buku 2023. Tahun buku itu untung Rp289.000.557, jadi pembagian itu setara 281.031,9% dari labanya — di luar selang 0% sampai 200% yang kami anggap masuk akal. Penyebabnya tidak diketahui; bisa juga aturan pemetaan tahun buku kami yang tidak berlaku untuk emiten ini. Pembagian laba tahun buku ini tidak boleh ditulis di kartu sebelum itu dijelaskan.
- **ADRO** — ADRO membagikan 2 pembagian yang jumlahnya Rp226,44 per lembar (Rp66,28 ex 2021-05-05 dan Rp160,16 ex 2021-12-30), yang menurut aturan pemetaan kami termasuk tahun buku 2020. Tahun buku itu untung Rp2.072.405.335.000, jadi pembagian itu setara 349,5% dari labanya — di luar selang 0% sampai 200% yang kami anggap masuk akal. Penyebabnya tidak diketahui; bisa juga aturan pemetaan tahun buku kami yang tidak berlaku untuk emiten ini. Pembagian laba tahun buku ini tidak boleh ditulis di kartu sebelum itu dijelaskan.

### R27 — Medan rasio siap pakai

Kami menandai medan rasio siap pakai yang tidak bisa dihitung ulang dari laporan keuangan tahun yang sama, atau yang tandanya menipu.

Diperiksa 4.344 medan rasio: 1.369 tidak bermasalah, 14 ditandai, 2.961 datanya tidak cukup untuk memutuskan. 0 medan rasio tidak masuk pemeriksaan ini. Aturannya jalan untuk 54 emiten dan dilewati untuk 263.

Alasan dilewati:
- Emiten ini tidak punya satu pun medan rasio siap pakai.

Contoh nyata:
- **AIMS** — Medan rasio siap pakai `roe` AIMS untuk tahun buku 2023 bernilai -7,5584, di luar selang -5 sampai 5 yang kami anggap mungkin. Penyebabnya tidak diketahui. Angka itu tidak boleh dipakai di kartu apa pun.
- **ALII** — Medan rasio siap pakai `roe` ALII untuk tahun buku 2020 bernilai -6,3225, di luar selang -5 sampai 5 yang kami anggap mungkin. Penyebabnya tidak diketahui. Angka itu tidak boleh dipakai di kartu apa pun.

### R29 — Gerakan harga di tanggal ex dividen

Kami menandai dividen yang gerakan harganya pada tanggal ex — hari pertama pembeli baru tidak lagi kebagian — tidak sejalan dengan besar dividen itu.

Diperiksa 129 dividen: 29 tidak bermasalah, 0 ditandai, 100 datanya tidak cukup untuk memutuskan. 2 dividen tidak masuk pemeriksaan ini. Aturannya jalan untuk 25 emiten dan dilewati untuk 292.

Alasan dilewati:
- Emiten ini tidak punya satu pun dividen tercatat.

### R36 — Laporan tentang saham emiten lain

Kami menolak kartu kalau laporannya ternyata tentang saham perusahaan lain: judulnya menyebut perusahaan lain, dan persennya tidak mungkin dihitung dari saham emiten ini.

Diperiksa 267 laporan: 216 tidak bermasalah, 1 bertentangan, 50 datanya tidak cukup untuk memutuskan. 0 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 36 emiten dan dilewati untuk 281.

Alasan dilewati:
- Tidak ada laporan untuk diperiksa.

Contoh nyata:
- **ADRO** — Laporan 2025-10-17T22:27:59 bersimbol ADRO menyebut saham "Alamtri Minerals Indonesia" di judulnya, bukan Alamtri Resources Indonesia Tbk. Persennya juga tidak mungkin dihitung dari saham ADRO: 34.525.541.100 lembar = 84.451% berarti saham beredar 40.882.335.437 lembar, padahal saham beredar ADRO yang berlaku 2025-10-17 29.389.689.400 lembar (meleset 39,1% atau lebih di tiap sisi laporan). Laporan ini tentang saham perusahaan lain; tidak satu pun angkanya boleh menjadi kartu ADRO.

### R37 — Bagian lebih besar dari keseluruhannya di laporan keuangan

Kami menolak kartu kalau satu tahun buku laporan keuangan memuat bagian yang lebih besar dari keseluruhannya — utang melebihi total liabilitas, atau kas melebihi aset lancar atau total aset — karena sedikitnya satu angka di tahun buku itu salah satuan atau salah isi.

Diperiksa 363 tahun buku: 343 tidak bermasalah, 3 bertentangan, 17 datanya tidak cukup untuk memutuskan. 0 tahun buku tidak masuk pemeriksaan ini. Aturannya jalan untuk 54 emiten dan dilewati untuk 263.

Alasan dilewati:
- Emiten ini tidak punya laporan keuangan tahunan di data.

Contoh nyata:
- **ABMM** — Laporan keuangan ABMM tahun buku 2023 memuat bagian yang lebih besar dari keseluruhannya: total_debt 16.059.284.798.232 lebih besar dari total_liabilities 1.397.760.928 (11.489,3 kali), padahal utang adalah bagian dari liabilitas; cash_and_equivalents 2.911.439.932.464 lebih besar dari total_assets 2.156.687.895 (1.350 kali), padahal kas dan setara kas adalah bagian dari aset; cash_and_equivalents 2.911.439.932.464 lebih besar dari current_assets 622.722.099 (4.675,3 kali), padahal kas dan setara kas digolongkan aset lancar. Sedikitnya satu angka di tahun buku ini salah satuan atau salah isi, dan mana yang benar tidak terbaca dari data ini; tidak satu pun angka keuangan tahun buku ini boleh menjadi kartu.
- **ARCI** — Laporan keuangan ARCI tahun buku 2023 memuat bagian yang lebih besar dari keseluruhannya: cash_and_equivalents 144.369.863.612 lebih besar dari current_assets 94.562.276 (1.526,7 kali), padahal kas dan setara kas digolongkan aset lancar. Sedikitnya satu angka di tahun buku ini salah satuan atau salah isi, dan mana yang benar tidak terbaca dari data ini; tidak satu pun angka keuangan tahun buku ini boleh menjadi kartu.

### R34 — Aksi korporasi dengan harga di kedua sisinya

Kami memberi tanda pada aksi korporasi yang tidak punya harga harian di kedua sisinya, karena tidak ada satu pun pemeriksaan harga yang bisa dijalankan atasnya.

Diperiksa 170 aksi korporasi: 39 tidak bermasalah, 0 ditandai, 131 datanya tidak cukup untuk memutuskan. 0 aksi korporasi tidak masuk pemeriksaan ini. Aturannya jalan untuk 39 emiten dan dilewati untuk 278.

Alasan dilewati:
- Emiten ini tidak punya satu pun aksi korporasi tercatat.

## Yang tidak bisa diperiksa dari data ini

- **Parameter permintaan tidak tersimpan.** Gudang menyimpan jawaban, bukan pertanyaannya. Karena itu tidak ada satu emiten pun yang daftar laporannya bisa dinyatakan habis, dan kalimat "emiten ini tidak punya laporan lain" tidak boleh dipakai sebagai kartu.
- **Respons kosong tidak memuat kode emitennya.** Dua respons kosong dari emiten berbeda identik byte per byte; satu-satunya yang membedakannya adalah nama berkas, dan nama berkas bukan data.
- **Tanda perjanjian beli kembali hanya ada di PDF.** Selama PDF laporan belum diurai, transaksi yang sebenarnya beli-kembali terbaca sebagai penjualan biasa.
- **Kenapa sebagian baris harga tidak punya harga pembukaan** (dan sebagian di antaranya juga tidak punya harga tertinggi maupun terendah) tidak terbaca dari data. Baris seperti itu dibuang sebelum dipakai sebagai rentang.
- **Apakah deret harga ditulis ulang sesudah stock split** tidak bisa ditentukan: dua medan dari endpoint yang sama saling bertentangan. Penyebabnya tidak diketahui.
- **Daftar suspensi mencatat hari mulai berhenti, bukan tiap harinya**, jadi hari bervolume nol tidak bisa dipastikan suspensi atau bukan.

Berkas ini tidak menilai satu saham pun. Ia hanya mengatakan angka mana yang cocok dengan angka lain di dalam data yang sama, dan angka mana yang tidak.
