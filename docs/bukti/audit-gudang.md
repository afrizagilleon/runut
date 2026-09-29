# Audit gudang: aturan verifikasi atas 42 emiten yang dipilih dengan aturan tetap

Berkas ini ditulis oleh `npm run audit:gudang` dari keluaran `npm run verifikasi:gudang` (`.cache/m2b/gudang.json`), rencana `docs/bukti/audit-rencana.json`, dan hasil uji ulang `eval/audit-gudang/hasil-penguji.json`. Jangan disunting tangan. Tidak membaca jaringan, jam dinding, maupun angka acak.

## Apa yang diaudit

Emiten dipilih **sebelum** datanya diambil, dengan aturan tetap (`docs/bukti/audit-rencana.md`): 28 emiten yang disuspensi pada 2025–2026 (urut simbol dari atas) dan 14 pembanding yang tidak ada di daftar suspensi (urut sha256 simbol). Gudang lama — 15 emiten yang dulu dipilih tangan — ditampilkan hanya sebagai acuan dan tidak dijumlahkan dengan keduanya.

`ATURAN_V2` memuat 37 aturan; 4 di antaranya digantikan aturan lain dan hanya tercatat sebagai dilewati (R1 oleh R15, R2 oleh R14, R6 oleh R17B, R10 oleh R18a), jadi **33 aturan aktif**. 2 di antaranya lahir di M4b dari salah nyata audit gudang (R36, R37); sebelum M4b ada 31 aturan aktif. Cakupan R6 lama "laporannya ternyata bercerita tentang saham lain" kini dipegang R36; alasan lewat R6 di bawah sengaja tidak diubah karena tercantum di jejak pemeriksaan kasus ULTJ yang sedang tayang. Kasus tayang menjalankan daftar aturan bekunya sendiri (`docs/bukti/aturan-beku-kasus.json`), bukan daftar ini.

Kredit Sectors yang dipakai audit: **303** (buku kas: 416 termasuk saldo pembuka 113; pagu 613).

| penyebut | kelompok suspensi | kelompok pembanding | gudang lama (acuan) |
|---|---:|---:|---:|
| emiten | 28 | 14 | 15 |
| laporan kepemilikan unik | 110 | 36 | 121 |
| hari harga (baris harga unik) | 3.432 | 1.663 | 2.428 |
| baris suspensi | 47 | 0 | 24 |
| aksi korporasi (dividen, pemecahan, right issue, bonus) | 27 | 73 | 67 |

### Keterbatasan sampel

- **Bukan sampel acak seluruh bursa.** Kelompok suspensi diambil dari atas menurut abjad (AGAR–BCIC, 28 dari 270 kandidat). Kelompok pembanding diambil dari 200 simbol pertama menurut abjad (AADI–CASH) dari 962 — satu panggilan daftar paling banyak 200 baris. Keduanya berasal dari awal abjad. Angka di bawah menggambarkan 42 emiten ini, bukan pasar.
- "Tidak pernah disuspensi" berarti tidak ada di daftar suspensi cache (2024-02-01 s.d. 2026-09-17); suspensi sebelum itu tidak terlihat.
- Harga harian hanya 1–4 jendela 90 hari per emiten, di sekitar tanggal penting; aturan yang butuh harga di luar jendela itu mencatat "tidak lengkap", bukan "hijau".
- 14 emiten pembanding terlalu sedikit untuk menyimpulkan beda antarkelompok: selisih satu-dua emiten sudah mengubah persentasenya jauh.

## Ringkasan: emiten dengan angka yang bertentangan

Emiten yang punya sedikitnya satu temuan **berkeparahan konflik** dari aturan **penolak** (dua angka di data yang sama saling bertentangan). Aturan penanda tidak dihitung di sini.

| kelompok | emiten berkonflik | penyebut | emiten |
|---|---:|---:|---|
| kelompok suspensi | 17 | 28 | AHAP (R35); AIMS (R7, R17B); ALII (R15, R7, R17B); ALKA (R11a, R7); AMMS (R11a, R7, R17B); ARCI (R7, R17B, R37); ARKO (R7, R17B); ARTA (R17B); ASHA (R15, R7); ASLI (R7, R17B); ATAP (R11a, R7, R17B); AYAM (R17B); AYLS (R17B); BAIK (R11a, R7); BAJA (R7, R17B); BAPA (R14, R17B); BCIC (R7, R14, R17B) |
| kelompok pembanding | 8 | 14 | ABMM (R37); ADHI (R17B); ADRO (R7, R13, R17B, R36); AVIA (R7, R17B, R23); BATA (R7, R14); BBMD (R7, R17B); BOLT (R17B); BSIM (R17B, R23) |
| gudang lama (acuan, dipilih tangan) | 10 | 15 | BIRD (R14); COCO (R11a, R7, R14, R17B, R35); DADA (R14, R3, R17B); FOLK (R17B); HITS (R37); KRYA (R11a, R7, R14, R9, R17B); MTLA (R14); RAJA (R31); RLCO (R7, R14, R13, R17B); ULTJ (R14) |


Tanpa aturan yang sampelnya masih dibantah penguji independen (R13, R19b, R23, R25, R26, R28): kelompok suspensi 17 dari 28, kelompok pembanding 8 dari 14, gudang lama 10 dari 15.

## Hasil per aturan

Sel = merah / diperiksa, dalam satuan aturan itu. "Emiten" = emiten merah / emiten yang benar-benar diperiksa aturan itu. Untuk aturan **penolak**, merah = bertentangan; untuk aturan **penanda**, merah = perlu dijelaskan sebelum dipakai, bukan salah.

| aturan | jenis | satuan | suspensi | emiten | pembanding | emiten | gudang lama | emiten |
|---|---|---|---:|---:|---:|---:|---:|---:|
| R25 | penolak | emiten | 0 / 28 | 0 / 28 | 0 / 14 | 0 / 14 | 0 / 12 | 0 / 12 |
| R12 | penanda | laporan | 7 / 91 | 3 / 13 | 0 / 23 | 0 / 5 | 0 / 57 | 0 / 10 |
| R22 | penanda | nama pemegang | 20 / 158 | 8 / 28 | 6 / 87 | 2 / 14 | 12 / 74 | 4 / 13 |
| R20 | penanda | emiten | 10 / 27 | 10 / 27 | 5 / 14 | 5 / 14 | 5 / 11 | 5 / 11 |
| R32 | penanda | pergantian tahun buku | 5 / 103 | 4 / 27 | 4 / 69 | 3 / 14 | 1 / 50 | 1 / 11 |
| R21 | penanda | pasang sumber | 5 / 11 | 5 / 11 | 1 / 3 | 1 / 3 | 1 / 7 | 1 / 7 |
| R33 | penanda | pasang hari | 4 / 3.404 | 2 / 28 | 2 / 1.649 | 1 / 14 | 19 / 2.414 | 2 / 14 |
| R15 | penolak | laporan | 2 / 110 | 2 / 16 | 0 / 36 | 0 / 8 | 0 / 121 | 0 / 12 |
| R1 | penolak | laporan | — | — | — | — | — | — |
| R11a | penolak | laporan | 4 / 110 | 4 / 16 | 0 / 36 | 0 / 8 | 12 / 121 | 2 / 12 |
| R11b | penanda | sisi laporan | 13 / 210 | 7 / 11 | 3 / 60 | 2 / 6 | 26 / 238 | 4 / 10 |
| R7 | penolak | sisi laporan | 38 / 220 | 12 / 16 | 14 / 72 | 4 / 8 | 29 / 242 | 3 / 12 |
| R14 | penolak | sambungan | 2 / 63 | 2 / 10 | 2 / 10 | 1 / 3 | 17 / 93 | 7 / 8 |
| R16 | penanda | sambungan | 0 / 63 | 0 / 10 | 0 / 10 | 0 / 3 | 5 / 93 | 4 / 8 |
| R2 | penolak | sambungan | — | — | — | — | — | — |
| R13 | penolak | medan kepemilikan | 0 / 330 | 0 / 16 | 2 / 108 | 1 / 8 | 2 / 363 | 1 / 12 |
| R3 | penolak | laporan | 0 / 105 | 0 / 11 | 0 / 35 | 0 / 7 | 6 / 119 | 1 / 10 |
| R4 | penolak | laporan | 0 / 110 | 0 / 16 | 0 / 36 | 0 / 8 | 0 / 121 | 0 / 12 |
| R5 | penolak | rantai | — | — | — | — | — | — |
| R8 | penolak | laporan | — | — | — | — | — | — |
| R9 | penolak | laporan | 0 / 110 | 0 / 16 | 0 / 36 | 0 / 8 | 1 / 121 | 1 / 12 |
| R17B | penolak | butir transaksi | 48 / 147 | 13 / 16 | 19 / 59 | 6 / 8 | 56 / 164 | 5 / 11 |
| R6 | penolak | pemeriksaan | — | — | — | — | — | — |
| R18a | penanda | baris harga bervolume nol | 0 / 537 | 0 / 28 | 0 / 112 | 0 / 3 | 0 / 201 | 0 / 8 |
| R10 | penanda | baris harga | — | — | — | — | — | — |
| R19a | penanda | hari datar | 537 / 685 | 28 / 28 | 112 / 175 | 3 / 4 | 195 / 369 | 7 / 8 |
| R19b | penanda | hari bursa | 833 / 3.432 | 24 / 28 | 155 / 1.663 | 3 / 14 | 486 / 2.428 | 7 / 14 |
| R28 | penanda | aksi korporasi | 0 / 15 | 0 / 7 | 0 / 9 | 0 / 6 | 0 / 12 | 0 / 7 |
| R35 | penolak | nilai harga ekstrem | 1 / 224 | 1 / 28 | 0 / 112 | 0 / 14 | 3 / 104 | 1 / 13 |
| R23 | penolak | keputusan RUPS | 0 / 1 | 0 / 1 | 2 / 3 | 2 / 3 | 0 / 2 | 0 / 2 |
| R31 | penolak | angka dividen di keputusan RUPS | 0 / 1 | 0 / 1 | 0 / 4 | 0 / 4 | 2 / 6 | 2 / 5 |
| R26 | penanda | tahun buku berdividen | 2 / 12 | 2 / 6 | 5 / 50 | 4 / 10 | 3 / 50 | 2 / 9 |
| R27 | penanda | medan rasio | 6 / 2.137 | 3 / 28 | 2 / 1.219 | 1 / 14 | 6 / 988 | 1 / 12 |
| R29 | penanda | dividen | 0 / 11 | 0 / 5 | 0 / 64 | 0 / 10 | 0 / 54 | 0 / 8 |
| R36 | penolak | laporan | 0 / 110 | 0 / 16 | 1 / 36 | 1 / 8 | 0 / 121 | 0 / 12 |
| R37 | penolak | tahun buku | 1 / 182 | 1 / 28 | 1 / 103 | 1 / 14 | 1 / 78 | 1 / 12 |
| R34 | penanda | aksi korporasi | 0 / 27 | 0 / 13 | 0 / 73 | 0 / 13 | 0 / 67 | 0 / 10 |

## Rincian per aturan (hanya yang punya temuan di 42 emiten audit)

### R25 — Kelengkapan halaman laporan (penolak)

Kami menolak bukti negatif kalau daftar laporannya belum terbukti habis.

- kelompok suspensi: 0 dari 28 emiten bertentangan, 28 tidak cukup data; 28 temuan di 0 dari 28 emiten yang diperiksa.
- kelompok pembanding: 0 dari 14 emiten bertentangan, 14 tidak cukup data; 14 temuan di 0 dari 14 emiten yang diperiksa.
- uji ulang penguji independen: 0 dari 2 sampel dijawab "ya" (U01 ARCI: tidak; U02 ADHI: tidak).

Contoh:
- **AGAR** (suspensi) — Respons laporan AGAR kosong (1 berkas), jadi tidak ada laporan yang terbaca. Halaman habis belum dibuktikan, jadi "tidak ada laporan" tidak boleh disimpulkan. Kelengkapannya tidak diketahui.
- **ABMM** (pembanding) — Respons laporan ABMM kosong (1 berkas), jadi tidak ada laporan yang terbaca. Halaman habis belum dibuktikan, jadi "tidak ada laporan" tidak boleh disimpulkan. Kelengkapannya tidak diketahui.

### R12 — Tanggal di nama berkas laporan (penanda)

Kami menandai laporan yang tanggal di nama berkasnya berbeda dari jam terbitnya, dan memakai tanggal nama berkas untuk mengurutkan rantai.

- kelompok suspensi: 7 dari 91 laporan ditandai, 0 tidak cukup data; 7 temuan di 3 dari 13 emiten yang diperiksa (ALII, ARCI, BCIC).
- kelompok pembanding: 0 dari 23 laporan ditandai, 0 tidak cukup data; 0 temuan di 0 dari 5 emiten yang diperiksa.
- uji ulang penguji independen: 1 dari 1 sampel dijawab "ya" (U03 ALII: ya).

Contoh:
- **ALII** (suspensi) — Nama berkas laporan menyebut tanggal 2026-02-20, sedangkan jam terbitnya 2026-02-27T05:57:00. Untuk mengurutkan rantai, yang dipakai adalah tanggal nama berkas.

### R22 — Ejaan nama pemegang saham (penanda)

Kami menandai satu pemegang saham yang ditulis dengan lebih dari satu ejaan, supaya rantainya tidak terbaca sebagai dua orang.

- kelompok suspensi: 20 dari 158 nama pemegang ditandai, 0 tidak cukup data; 10 temuan di 8 dari 28 emiten yang diperiksa (AIMS, ALKA, AMMS, ARCI, ARKO, ASLI, BAPA, BCIC).
- kelompok pembanding: 6 dari 87 nama pemegang ditandai, 0 tidak cukup data; 3 temuan di 2 dari 14 emiten yang diperiksa (BBMD, BOLT).
- uji ulang penguji independen: 1 dari 1 sampel dijawab "ya" (U04 BAPA: ya).

Contoh:
- **AIMS** (suspensi) — Satu pemegang saham ditulis dengan 2 ejaan berbeda: "Aims Indo Investama", "PT. Aims Indo Investama". Tanpa disatukan, rantainya terbaca sebagai 2 pemegang yang berbeda.
- **BBMD** (pembanding) — Satu pemegang saham ditulis dengan 2 ejaan berbeda: "Achmad S Kartasasmita", "Achmad S. Kartasasmita". Tanpa disatukan, rantainya terbaca sebagai 2 pemegang yang berbeda.

### R20 — Basis saham di laba per lembar (penanda)

Kami menandai emiten yang laba per lembarnya tidak dihitung atas jumlah saham yang sama tiap tahun, karena dua angka seperti itu tidak bisa dibandingkan langsung.

- kelompok suspensi: 10 dari 27 emiten ditandai, 0 tidak cukup data; 10 temuan di 10 dari 27 emiten yang diperiksa (AHAP, AIMS, AMMS, APEX, ARCI, ARGO, ASPI, AYLS, BBRM, BCIC).
- kelompok pembanding: 5 dari 14 emiten ditandai, 0 tidak cukup data; 5 temuan di 5 dari 14 emiten yang diperiksa (ADHI, ADRO, ASSA, BSIM, BSWD).
- uji ulang penguji independen: 1 dari 1 sampel dijawab "ya" (U05 BBRM: ya).

Contoh:
- **AHAP** (suspensi) — Laba per lembar AHAP tidak dihitung atas jumlah saham yang sama tiap tahun. Laba dibagi laba per lembar — yaitu jumlah saham yang dipakai sebagai penyebutnya — memberi 3.745.454.545 lembar untuk tahun buku 2020 dan 4.900.000.000 lembar untuk tahun buku 2023, selisih 30,83%. Dua angka laba per lembar dari tahun yang berbeda karena itu tidak bisa dibandingkan langsung: sebagian perubahannya berasal dari jumlah sahamnya, bukan dari labanya.
- **ADHI** (pembanding) — Laba per lembar ADHI tidak dihitung atas jumlah saham yang sama tiap tahun. Laba dibagi laba per lembar — yaitu jumlah saham yang dipakai sebagai penyebutnya — memberi 3.886.585.365 lembar untuk tahun buku 2021 dan 8.407.608.979 lembar untuk tahun buku 2023, selisih 116,32%. Dua angka laba per lembar dari tahun yang berbeda karena itu tidak bisa dibandingkan langsung: sebagian perubahannya berasal dari jumlah sahamnya, bukan dari labanya.

### R32 — Perubahan jumlah saham dijelaskan aksi korporasi (penanda)

Kami menandai perubahan jumlah saham dari satu tahun buku ke tahun berikutnya yang tidak ada satu pun aksi korporasi tercatat untuk menjelaskannya.

- kelompok suspensi: 5 dari 103 pergantian tahun buku ditandai, 0 tidak cukup data; 8 temuan di 4 dari 27 emiten yang diperiksa (AHAP, APEX, ARGO, BBRM).
- kelompok pembanding: 4 dari 69 pergantian tahun buku ditandai, 0 tidak cukup data; 4 temuan di 3 dari 14 emiten yang diperiksa (ADHI, BSIM, BSWD).
- uji ulang penguji independen: 1 dari 1 sampel dijawab "ya" (U06 BBRM: ya).

Contoh:
- **AHAP** (suspensi) — Jumlah saham AHAP menjadi 1,303 kali lipat antara tahun buku 2021 dan 2022 — dari 3.758.620.689 lembar menjadi 4.896.103.896 lembar. Aksi korporasi yang tercatat tahun itu — penerbitan saham baru 3 berbanding 2 pada 2022-08-08 — rasionya tidak sebesar itu. Penyebabnya tidak diketahui.
- **ADHI** (pembanding) — Jumlah saham ADHI menjadi 2,163 kali lipat antara tahun buku 2021 dan 2022 — dari 3.886.585.365 lembar menjadi 8.407.024.793 lembar. Aksi korporasi yang tercatat tahun itu — penerbitan saham baru 10000000 berbanding 19783200 pada 2022-10-25 — rasionya tidak sebesar itu. Penyebabnya tidak diketahui.

### R21 — Jumlah saham beda antar sumber (penanda)

Kami menandai dua sumber yang menyebut jumlah saham berbeda untuk tanggal yang sama, dan tidak mengadu dua angka yang diukur pada waktu yang berbeda.

- kelompok suspensi: 5 dari 11 pasang sumber ditandai, 0 tidak cukup data; 5 temuan di 5 dari 11 emiten yang diperiksa (ALII, AMMS, ARCI, ATAP, BBSS).
- kelompok pembanding: 1 dari 3 pasang sumber ditandai, 0 tidak cukup data; 1 temuan di 1 dari 3 emiten yang diperiksa (AVIA).
- uji ulang penguji independen: 1 dari 1 sampel dijawab "ya" (U07 BBSS: ya).

Contoh:
- **ALII** (suspensi) — Dua sumber menyebut jumlah saham ALII yang berbeda untuk tanggal yang sama, 2024-12-31: 15.493.763.257 lembar menurut laporan keuangan tahun buku 2024, yang menyebut jumlah saham yang diterbitkan; 15.825.800.000 lembar menurut nilai pasar dibagi harga tutup pada 2025-01-02, hari bursa terakhir tahun buku 2024. Selisihnya 2,14%. Karena keduanya berbicara tentang hari yang sama, setidaknya satu di antaranya tidak bisa benar; mana yang benar tidak terbaca dari data ini.
- **AVIA** (pembanding) — Dua sumber menyebut jumlah saham AVIA yang berbeda untuk tanggal yang sama, 2025-12-31: 60.029.611.817 lembar menurut laporan keuangan tahun buku 2025, yang menyebut jumlah saham yang diterbitkan; 61.953.555.600 lembar menurut nilai pasar dibagi harga tutup pada 2025-12-30, hari bursa terakhir tahun buku 2025. Selisihnya 3,2%. Karena keduanya berbicara tentang hari yang sama, setidaknya satu di antaranya tidak bisa benar; mana yang benar tidak terbaca dari data ini.

### R33 — Kestabilan jumlah saham tersirat (penanda)

Kami menandai hari yang jumlah saham tersiratnya melompat, karena penyebut persen tidak boleh diambil dari hari seperti itu.

- kelompok suspensi: 4 dari 3.404 pasang hari ditandai, 0 tidak cukup data; 4 temuan di 2 dari 28 emiten yang diperiksa (AIMS, AMMS).
- kelompok pembanding: 2 dari 1.649 pasang hari ditandai, 0 tidak cukup data; 2 temuan di 1 dari 14 emiten yang diperiksa (ADRO).
- uji ulang penguji independen: 1 dari 1 sampel dijawab "ya" (U08 ADRO: ya).

Contoh:
- **AIMS** (suspensi) — Jumlah saham tersirat AIMS berubah 4.85% dalam satu hari bursa: 220.000.000 lembar pada 2025-09-15 menjadi 230.666.667 lembar pada 2025-09-16. Tidak ada aksi korporasi tercatat dalam 21 hari di sekitarnya; penyebabnya tidak diketahui.
- **ADRO** (pembanding) — Jumlah saham tersirat ADRO berubah 4.45% dalam satu hari bursa: 30.758.665.900 lembar pada 2025-08-25 menjadi 29.389.689.400 lembar pada 2025-08-26. Tidak ada aksi korporasi tercatat dalam 21 hari di sekitarnya; penyebabnya tidak diketahui.

### R15 — Aritmetika per laporan, termasuk transaksi jenis lain (penolak)

Kami menolak kartu kalau penjumlahan di dalam satu laporan tidak cocok, termasuk untuk laporan yang jenis transaksinya bukan beli maupun jual.

- kelompok suspensi: 2 dari 110 laporan bertentangan, 0 tidak cukup data; 2 temuan di 2 dari 16 emiten yang diperiksa (ALII, ASHA).
- kelompok pembanding: 0 dari 36 laporan bertentangan, 0 tidak cukup data; 0 temuan di 0 dari 8 emiten yang diperiksa.
- uji ulang penguji independen: 1 dari 1 sampel dijawab "ya" (U09 ASHA: ya).

Contoh:
- **ALII** (suspensi) — Laporan 2026-02-27T06:06:00 (jenis "sell") tidak konsisten sendiri: 335.829.650 - 7.450.300 = 328.379.350, tetapi laporan menulis 308.612.450 lembar sesudah transaksi.

### R11a — Penyebut dua sisi satu laporan (penolak)

Kami menolak kartu kalau dua persen di dalam satu laporan tidak mungkin berasal dari jumlah saham beredar yang sama.

- kelompok suspensi: 4 dari 110 laporan bertentangan, 32 tidak cukup data; 4 temuan di 4 dari 16 emiten yang diperiksa (ALKA, AMMS, ATAP, BAIK).
- kelompok pembanding: 0 dari 36 laporan bertentangan, 16 tidak cukup data; 0 temuan di 0 dari 8 emiten yang diperiksa.
- uji ulang penguji independen: 2 dari 2 sampel dijawab "ya" (U10 AMMS: ya; U11 BAIK: ya).

Contoh:
- **ALKA** (suspensi) — Laporan 2025-01-07T11:24:00 menulis 69% sebelum dan 84% sesudah, tetapi tidak ada satu jumlah saham beredar pun yang menjelaskan keduanya: sisi sebelum menuntut 510.265.640-510.339.597 lembar, sisi sesudah menuntut 506.390.757-506.451.045 lembar.

### R11b — Satu penyebut untuk seluruh rantai (penanda)

Kami menandai rantai laporan satu emiten yang persennya tidak bisa berasal dari satu jumlah saham beredar yang sama.

- kelompok suspensi: 13 dari 210 sisi laporan ditandai, 41 tidak cukup data; 7 temuan di 7 dari 11 emiten yang diperiksa (ALII, ALKA, AMMS, ARKO, ASLI, ATAP, BAIK).
- kelompok pembanding: 3 dari 60 sisi laporan ditandai, 18 tidak cukup data; 2 temuan di 2 dari 6 emiten yang diperiksa (ADRO, BATA).
- uji ulang penguji independen: 1 dari 1 sampel dijawab "ya" (U12 ALII: ya).

Contoh:
- **ALII** (suspensi) — Rantai laporan ALII tidak bisa dijelaskan satu jumlah saham beredar. Angka yang paling banyak cocok adalah 15.828.926.741 lembar. Angka ini masuk ke dalam selang 20 dari 24 sisi laporan, lebih banyak daripada angka lain mana pun. Sisanya, 4 sisi laporan, menyiratkan jumlah saham yang lain: 2026-02-27T05:57:00 sebelum transaksi menulis 0,097%, yang baru mungkin kalau sahamnya 18.196.391.753 lembar; 2026-02-27T05:57:00 sesudah transaksi menulis 0,07%, yang baru mungkin kalau sahamnya 17.428.857.143 lembar. Yang paling jauh meleset 14,96% dari angka pilihan. Perusahaan boleh menerbitkan saham di tengah rantai, jadi ini belum tentu kesalahan — tetapi dua persen dari rantai ini tidak boleh dibandingkan langsung sebelum diketahui keduanya memakai pembagi yang sama.
- **ADRO** (pembanding) — Tidak ada satu jumlah saham beredar pun yang menjelaskan sebagian besar rantai laporan ADRO. Angka yang paling banyak cocok, 29.462.855.527 lembar, hanya menjelaskan 2 dari 4 sisi laporan. Sisanya, 2 sisi laporan, menyiratkan jumlah saham yang lain: 2025-10-17T22:27:59 sebelum transaksi menulis 84,451%, yang baru mungkin kalau sahamnya 40.882.335.437 lembar; 2025-10-17T22:27:59 sesudah transaksi menulis 85,016%, yang baru mungkin kalau sahamnya 40.882.352.851 lembar. Yang paling jauh meleset 38,76% dari angka pilihan. Perusahaan boleh menerbitkan saham di tengah rantai, jadi ini belum tentu kesalahan — tetapi dua persen dari rantai ini tidak boleh dibandingkan langsung sebelum diketahui keduanya memakai pembagi yang sama.

### R7 — Persen dihitung ulang terhadap saham beredar pada tanggal laporan (penolak)

Kami menolak kartu kalau persen yang ditulis laporan tidak cocok dengan jumlah lembar dibagi saham beredar yang berlaku pada tanggal laporan itu.

- kelompok suspensi: 38 dari 220 sisi laporan bertentangan, 47 tidak cukup data; 38 temuan di 12 dari 16 emiten yang diperiksa (AIMS, ALII, ALKA, AMMS, ARCI, ARKO, ASHA, ASLI, ATAP, BAIK, BAJA, BCIC).
- kelompok pembanding: 14 dari 72 sisi laporan bertentangan, 21 tidak cukup data; 14 temuan di 4 dari 8 emiten yang diperiksa (ADRO, AVIA, BATA, BBMD).
- uji ulang penguji independen: 1 dari 2 sampel dijawab "ya" (U13 BCIC: ya; U14 BAJA: ragu).

Contoh:
- **AIMS** (suspensi) — Laporan 2025-08-12T09:55:20 menulis kepemilikan sebelum transaksi 38.5%, padahal 84.687.991 lembar dibagi 220.000.000 saham beredar yang berlaku 2025-08-12 adalah 38.49%. Persen 38.5% baru mungkin kalau penyebutnya antara 219.940.244 dan 219.997.379 lembar.
- **ADRO** (pembanding) — Laporan 2025-10-17T22:27:59 menulis kepemilikan sebelum transaksi 84.451%, padahal 34.525.541.100 lembar dibagi 29.389.689.400 saham beredar yang berlaku 2025-10-17 adalah 117.48%. Persen 84.451% baru mungkin kalau penyebutnya antara 40.879.915.104 dan 40.884.756.057 lembar.

### R14 — Rantai kepemilikan putus (penolak)

Kami menolak kartu kalau ada lembar yang berpindah tangan tanpa laporan di antara dua laporan berurutan.

- kelompok suspensi: 2 dari 63 sambungan bertentangan, 0 tidak cukup data; 2 temuan di 2 dari 10 emiten yang diperiksa (BAPA, BCIC).
- kelompok pembanding: 2 dari 10 sambungan bertentangan, 0 tidak cukup data; 2 temuan di 1 dari 3 emiten yang diperiksa (BATA).
- uji ulang penguji independen: 0 dari 2 sampel dijawab "ya" (U15 BCIC: tidak → hilang; U16 BCIC: tidak → hilang).

Contoh:
- **BAPA** (suspensi) — Rantai Belvin Tannadi putus: laporan 2026-06-18T04:19:00 berakhir di 76.384.700 lembar, tetapi laporan berikutnya 2026-06-26T07:21:58 mulai dari 0 lembar. Ada 76.384.700 lembar yang berkurang tanpa laporan.
- **BATA** (pembanding) — Rantai Liem Tjen Hung putus: laporan 2026-04-01T15:40:35 berakhir di 68.554.100 lembar, tetapi laporan berikutnya 2026-06-04T17:08:47 mulai dari 71.239.700 lembar. Ada 2.685.600 lembar yang bertambah tanpa laporan.

### R13 — Lembar dilaporkan melebihi saham beredar (penolak)

Kami menolak kartu kalau satu pemegang dilaporkan memegang lebih banyak lembar daripada yang diterbitkan.

- kelompok suspensi: 0 dari 330 medan kepemilikan bertentangan, 42 tidak cukup data; 0 temuan di 0 dari 16 emiten yang diperiksa.
- kelompok pembanding: 2 dari 108 medan kepemilikan bertentangan, 0 tidak cukup data; 2 temuan di 1 dari 8 emiten yang diperiksa (ADRO).
- uji ulang penguji independen: 0 dari 1 sampel dijawab "ya" (U18 ADRO: tidak).

Contoh:
- **ADRO** (pembanding) — Laporan 2025-10-17T22:27:59 menulis kepemilikan sebelum 34.525.541.100 lembar, yaitu 117.5% dari 29.389.689.400 saham beredar yang berlaku 2025-10-17. Satu pemegang tidak bisa memegang lebih banyak lembar daripada yang diterbitkan.

### R17B — Harga laporan terhadap rentang harga hari transaksinya (penolak)

Kami menolak kartu kalau harga yang ditulis laporan di luar rentang harga saham itu pada tanggal transaksinya sendiri.

- kelompok suspensi: 48 dari 147 butir transaksi bertentangan, 37 tidak cukup data; 49 temuan di 13 dari 16 emiten yang diperiksa (AIMS, ALII, AMMS, ARCI, ARKO, ARTA, ASLI, ATAP, AYAM, AYLS, BAJA, BAPA, BCIC).
- kelompok pembanding: 19 dari 59 butir transaksi bertentangan, 6 tidak cukup data; 19 temuan di 6 dari 8 emiten yang diperiksa (ADHI, ADRO, AVIA, BBMD, BOLT, BSIM).
- uji ulang penguji independen: 1 dari 2 sampel dijawab "ya" (U19 ADHI: ya; U20 BBMD: tidak → hilang).

Contoh:
- **AIMS** (suspensi) — Laporan 2025-08-12T09:55:20 menyebut transaksi 2025-08-08 pada harga Rp410, padahal harga saham hari itu hanya bergerak Rp320-Rp350.
- **ADHI** (pembanding) — Laporan 2025-08-08T23:21:44 menyebut transaksi 2025-07-31 pada harga Rp239,08, padahal harga saham hari itu hanya bergerak Rp240-Rp250.

### R18a — Hari bervolume nol tanpa baris suspensi (penanda)

Kami menandai hari yang volumenya nol tetapi tidak ada di daftar suspensi, dan tidak menyimpulkan apa pun darinya.

- kelompok suspensi: 0 dari 537 baris harga bervolume nol ditandai, 490 tidak cukup data; 22 temuan di 0 dari 28 emiten yang diperiksa.
- kelompok pembanding: 0 dari 112 baris harga bervolume nol ditandai, 112 tidak cukup data; 3 temuan di 0 dari 3 emiten yang diperiksa.
- uji ulang penguji independen: 1 dari 1 sampel dijawab "ya" (U21 BBRM: ya).

Contoh:
- **AGAR** (suspensi) — 17 hari bursa AGAR antara 2026-07-20 dan 2026-09-02 tidak mencatat satu lembar pun berpindah tangan, dan tanggal-tanggal itu tidak ada di daftar suspensi. Daftar suspensi hanya mencatat hari mulai berhenti, bukan tiap harinya, jadi tidak bisa ditentukan apakah hari-hari itu memang suspensi.
- **BATA** (pembanding) — 41 hari bursa BATA antara 2026-07-01 dan 2026-08-28 tidak mencatat satu lembar pun berpindah tangan, dan tanggal-tanggal itu tidak ada di daftar suspensi. Daftar suspensi hanya mencatat hari mulai berhenti, bukan tiap harinya, jadi tidak bisa ditentukan apakah hari-hari itu memang suspensi.

### R19a — Harga datar pada hari tanpa transaksi (penanda)

Kami menandai hari yang harganya hanya satu angka dan volumenya nol, karena angka itu bukan harga yang disepakati siapa pun.

- kelompok suspensi: 537 dari 685 hari datar ditandai, 0 tidak cukup data; 28 temuan di 28 dari 28 emiten yang diperiksa (AGAR, AHAP, AIMS, AKKU, ALII, ALKA, ALTO, AMMS, APEX, ARCI, AREA, ARGO, ARKO, ARTA, ASHA, ASLC, ASLI, ASPI, ASPR, ATAP, AYAM, AYLS, BAIK, BAJA, BAPA, BBRM, BBSS, BCIC).
- kelompok pembanding: 112 dari 175 hari datar ditandai, 0 tidak cukup data; 3 temuan di 3 dari 4 emiten yang diperiksa (BATA, BBMD, BSWD).
- uji ulang penguji independen: 1 dari 1 sampel dijawab "ya" (U22 BCIC: ya).

Contoh:
- **AGAR** (suspensi) — 19 hari bursa AGAR antara 2026-07-20 dan 2026-09-02 mencatat satu harga saja untuk buka, tertinggi, terendah, dan tutup, sementara volumenya nol. Angka itu bukan harga yang disepakati siapa pun hari itu.
- **BATA** (pembanding) — 41 hari bursa BATA antara 2026-07-01 dan 2026-08-28 mencatat satu harga saja untuk buka, tertinggi, terendah, dan tutup, sementara volumenya nol. Angka itu bukan harga yang disepakati siapa pun hari itu.

### R19b — Runtun hari datar (penanda)

Kami menandai runtun hari bursa yang tiap harinya hanya mencatat satu angka untuk buka, tertinggi, terendah, dan tutup — entah harganya diam, entah berganti tiap hari.

- kelompok suspensi: 833 dari 3.432 hari bursa ditandai, 0 tidak cukup data; 64 temuan di 24 dari 28 emiten yang diperiksa (AGAR, AHAP, AIMS, AKKU, ALII, ALKA, ALTO, AMMS, ARCI, AREA, ARGO, ARKO, ASHA, ASLI, ASPI, ASPR, ATAP, AYAM, AYLS, BAIK, BAJA, BAPA, BBRM, BCIC).
- kelompok pembanding: 155 dari 1.663 hari bursa ditandai, 0 tidak cukup data; 10 temuan di 3 dari 14 emiten yang diperiksa (BATA, BBMD, BSWD).
- uji ulang penguji independen: 0 dari 1 sampel dijawab "ya" (U23 BATA: tidak).

Contoh:
- **AGAR** (suspensi) — Selama 9 dari 10 hari bursa antara 2026-07-14 dan 2026-07-27, harga AGAR tiap harinya hanya mencatat satu angka — buka, tertinggi, terendah, dan tutup sama — walau harganya berganti dari hari ke hari (Rp260 di awal, Rp630 di akhir).
- **BATA** (pembanding) — Selama 9 dari 10 hari bursa antara 2026-06-26 dan 2026-07-09, harga BATA tiap harinya hanya mencatat satu angka — buka, tertinggi, terendah, dan tutup sama — walau harganya berganti dari hari ke hari (Rp60 di awal, Rp59 di akhir).

### R28 — Label deret harga di sekitar aksi korporasi (penanda)

Kami memberi label pada deret harga di sekitar aksi korporasi, dan melarang kartu harga melintasi tanggal stock split.

- kelompok suspensi: 0 dari 15 aksi korporasi ditandai, 12 tidak cukup data; 3 temuan di 0 dari 7 emiten yang diperiksa.
- kelompok pembanding: 0 dari 9 aksi korporasi ditandai, 9 tidak cukup data; 0 temuan di 0 dari 6 emiten yang diperiksa.
- uji ulang penguji independen: 0 dari 1 sampel dijawab "ya" (U24 BAJA: tidak).

Contoh:
- **AHAP** (suspensi) — Deret harga AHAP di sekitar rights issue 2026-09-23 diberi label "disesuaikan": jumlah saham tersirat tidak berubah melintasi aksi ini (4.900.000.000 lembar pada 2026-09-22 menjadi 4.900.000.000 lembar pada 2026-09-23). Label ini tidak menyatakan ada yang salah; ia menentukan kartu harga mana yang boleh dibuat. Penyebabnya tidak diketahui.

### R35 — Harga ekstrem ringkasan terjangkau deret harian (penolak)

Kami menolak kartu kalau harga tertinggi atau terendah yang disebut ringkasan tidak terjangkau deret harga hariannya sendiri.

- kelompok suspensi: 1 dari 224 nilai harga ekstrem bertentangan, 138 tidak cukup data; 1 temuan di 1 dari 28 emiten yang diperiksa (AHAP).
- kelompok pembanding: 0 dari 112 nilai harga ekstrem bertentangan, 69 tidak cukup data; 0 temuan di 0 dari 14 emiten yang diperiksa.
- uji ulang penguji independen: 1 dari 1 sampel dijawab "ya" (U25 AHAP: ya).

Contoh:
- **AHAP** (suspensi) — Ringkasan AHAP menyebut 90_d_low Rp76 pada 2026-09-22, padahal baris harga harian hari itu hanya bergerak Rp97-Rp106. Angka itu tidak terjangkau deret harganya sendiri.

### R23 — Laba di keputusan RUPS versus laporan keuangan (penolak)

Kami menolak kartu kalau laba yang disebut keputusan RUPS berbeda dari laba di laporan keuangan tahun buku yang sama.

- kelompok suspensi: 0 dari 1 keputusan RUPS bertentangan, 0 tidak cukup data; 0 temuan di 0 dari 1 emiten yang diperiksa.
- kelompok pembanding: 2 dari 3 keputusan RUPS bertentangan, 0 tidak cukup data; 2 temuan di 2 dari 3 emiten yang diperiksa (AVIA, BSIM).
- uji ulang penguji independen: 0 dari 1 sampel dijawab "ya" (U26 ASLC: tidak → hilang).
- uji ulang M4b: 0 dari 2 sampel dijawab "ya" (B05 AVIA: tidak; B06 BSIM: tidak).

Contoh:
- **AVIA** (pembanding) — Laba bersih tahun buku 2025 ditulis dua kali dengan angka yang berbeda. Keputusan RUPS AVIA pada 2026-04-09 menyebut Rp2; laporan keuangan menyebut Rp1.747.462.000.000. Selisihnya Rp1.747.461.999.998. Laba sebelum pajak dikurangi pajak di laporan yang sama, Rp1.744.020.000.000, juga tidak sama dengan angka RUPS. Mana yang benar tidak terbaca dari data ini — keputusan RUPS bisa menyebut laba induk saja sementara laporan keuangan menyebut laba seluruh kelompok usaha, dan keduanya sah. Angka laba yang dipakai di kartu harus menyebut dari mana ia diambil.

### R26 — Pembagian laba terhadap laba tahun buku (penanda)

Kami menandai pembagian dividen yang tidak masuk akal dibandingkan laba tahun buku yang kami petakan untuknya.

- kelompok suspensi: 2 dari 12 tahun buku berdividen ditandai, 0 tidak cukup data; 2 temuan di 2 dari 6 emiten yang diperiksa (ARCI, ARTA).
- kelompok pembanding: 5 dari 50 tahun buku berdividen ditandai, 5 tidak cukup data; 5 temuan di 4 dari 10 emiten yang diperiksa (ABMM, ADRO, AMAG, CAMP).
- uji ulang penguji independen: 0 dari 1 sampel dijawab "ya" (U28 ABMM: tidak).

Contoh:
- **ARCI** (suspensi) — ARCI membagikan Rp19,81 per lembar dengan tanggal ex 2025-12-11, yang menurut aturan pemetaan kami termasuk tahun buku 2024. Tahun buku itu untung Rp168.964.299.521, jadi pembagian itu setara 291,2% dari labanya — di luar selang 0% sampai 200% yang kami anggap masuk akal. Penyebabnya tidak diketahui; bisa juga aturan pemetaan tahun buku kami yang tidak berlaku untuk emiten ini. Pembagian laba tahun buku ini tidak boleh ditulis di kartu sebelum itu dijelaskan.
- **ABMM** (pembanding) — ABMM membagikan Rp295 per lembar dengan tanggal ex 2024-05-28, yang menurut aturan pemetaan kami termasuk tahun buku 2023. Tahun buku itu untung Rp289.000.557, jadi pembagian itu setara 281.031,9% dari labanya — di luar selang 0% sampai 200% yang kami anggap masuk akal. Penyebabnya tidak diketahui; bisa juga aturan pemetaan tahun buku kami yang tidak berlaku untuk emiten ini. Pembagian laba tahun buku ini tidak boleh ditulis di kartu sebelum itu dijelaskan.

### R27 — Medan rasio siap pakai (penanda)

Kami menandai medan rasio siap pakai yang tidak bisa dihitung ulang dari laporan keuangan tahun yang sama, atau yang tandanya menipu.

- kelompok suspensi: 6 dari 2.137 medan rasio ditandai, 1.438 tidak cukup data; 6 temuan di 3 dari 28 emiten yang diperiksa (AIMS, ALII, ARGO).
- kelompok pembanding: 2 dari 1.219 medan rasio ditandai, 847 tidak cukup data; 2 temuan di 1 dari 14 emiten yang diperiksa (BATA).
- uji ulang penguji independen: 1 dari 1 sampel dijawab "ya" (U29 ARGO: ya).

Contoh:
- **AIMS** (suspensi) — Medan rasio siap pakai `roe` AIMS untuk tahun buku 2023 bernilai -7,5584, di luar selang -5 sampai 5 yang kami anggap mungkin. Penyebabnya tidak diketahui. Angka itu tidak boleh dipakai di kartu apa pun.
- **BATA** (pembanding) — Medan rasio siap pakai `roe` BATA untuk tahun buku 2024 bernilai 9,2903, di luar selang -5 sampai 5 yang kami anggap mungkin. Penyebabnya tidak diketahui. Angka itu tidak boleh dipakai di kartu apa pun.

### R36 — Laporan tentang saham emiten lain (penolak)

Kami menolak kartu kalau laporannya ternyata tentang saham perusahaan lain: judulnya menyebut perusahaan lain, dan persennya tidak mungkin dihitung dari saham emiten ini.

- kelompok suspensi: 0 dari 110 laporan bertentangan, 0 tidak cukup data; 0 temuan di 0 dari 16 emiten yang diperiksa.
- kelompok pembanding: 1 dari 36 laporan bertentangan, 0 tidak cukup data; 1 temuan di 1 dari 8 emiten yang diperiksa (ADRO).
- uji ulang M4b: 1 dari 1 sampel dijawab "ya" (B01 ADRO: ya).

Contoh:
- **ADRO** (pembanding) — Laporan 2025-10-17T22:27:59 bersimbol ADRO menyebut saham "Alamtri Minerals Indonesia" di judulnya, bukan Alamtri Resources Indonesia Tbk. Persennya juga tidak mungkin dihitung dari saham ADRO: 34.525.541.100 lembar = 84.451% berarti saham beredar 40.882.335.437 lembar, padahal saham beredar ADRO yang berlaku 2025-10-17 29.389.689.400 lembar (meleset 39,1% atau lebih di tiap sisi laporan). Laporan ini tentang saham perusahaan lain; tidak satu pun angkanya boleh menjadi kartu ADRO.

### R37 — Bagian lebih besar dari keseluruhannya di laporan keuangan (penolak)

Kami menolak kartu kalau satu tahun buku laporan keuangan memuat bagian yang lebih besar dari keseluruhannya — utang melebihi total liabilitas, atau kas melebihi aset lancar atau total aset — karena sedikitnya satu angka di tahun buku itu salah satuan atau salah isi.

- kelompok suspensi: 1 dari 182 tahun buku bertentangan, 6 tidak cukup data; 1 temuan di 1 dari 28 emiten yang diperiksa (ARCI).
- kelompok pembanding: 1 dari 103 tahun buku bertentangan, 11 tidak cukup data; 1 temuan di 1 dari 14 emiten yang diperiksa (ABMM).
- uji ulang M4b: 3 dari 3 sampel dijawab "ya" (B02 ARCI: ya; B03 ABMM: ya; B04 HITS: ya).

Contoh:
- **ARCI** (suspensi) — Laporan keuangan ARCI tahun buku 2023 memuat bagian yang lebih besar dari keseluruhannya: cash_and_equivalents 144.369.863.612 lebih besar dari current_assets 94.562.276 (1.526,7 kali), padahal kas dan setara kas digolongkan aset lancar. Sedikitnya satu angka di tahun buku ini salah satuan atau salah isi, dan mana yang benar tidak terbaca dari data ini; tidak satu pun angka keuangan tahun buku ini boleh menjadi kartu.
- **ABMM** (pembanding) — Laporan keuangan ABMM tahun buku 2023 memuat bagian yang lebih besar dari keseluruhannya: total_debt 16.059.284.798.232 lebih besar dari total_liabilities 1.397.760.928 (11.489,3 kali), padahal utang adalah bagian dari liabilitas; cash_and_equivalents 2.911.439.932.464 lebih besar dari total_assets 2.156.687.895 (1.350 kali), padahal kas dan setara kas adalah bagian dari aset; cash_and_equivalents 2.911.439.932.464 lebih besar dari current_assets 622.722.099 (4.675,3 kali), padahal kas dan setara kas digolongkan aset lancar. Sedikitnya satu angka di tahun buku ini salah satuan atau salah isi, dan mana yang benar tidak terbaca dari data ini; tidak satu pun angka keuangan tahun buku ini boleh menjadi kartu.

### R34 — Aksi korporasi dengan harga di kedua sisinya (penanda)

Kami memberi tanda pada aksi korporasi yang tidak punya harga harian di kedua sisinya, karena tidak ada satu pun pemeriksaan harga yang bisa dijalankan atasnya.

- kelompok suspensi: 0 dari 27 aksi korporasi ditandai, 18 tidak cukup data; 9 temuan di 0 dari 13 emiten yang diperiksa.
- kelompok pembanding: 0 dari 73 aksi korporasi ditandai, 54 tidak cukup data; 13 temuan di 0 dari 13 emiten yang diperiksa.
- uji ulang penguji independen: 1 dari 1 sampel dijawab "ya" (U30 BOLT: ya).

Contoh:
- **AHAP** (suspensi) — 3 dari 4 aksi korporasi AHAP tidak punya harga harian di kedua sisinya, jadi tidak ada satu pun pemeriksaan harga yang bisa dijalankan atasnya: penerbitan saham baru 2015-06-23 (25 berbanding 17), penerbitan saham baru 2018-07-06 (2 berbanding 5), penerbitan saham baru 2022-08-08 (3 berbanding 2). Ini daftar pekerjaan penarikan data, bukan tanda bahwa ada yang salah.
- **ABMM** (pembanding) — 4 dari 6 aksi korporasi ABMM tidak punya harga harian di kedua sisinya, jadi tidak ada satu pun pemeriksaan harga yang bisa dijalankan atasnya, antara lain: dividen tunai 2020-06-29 (Rp13,17 per lembar), dividen tunai 2022-05-23 (Rp267 per lembar), dividen tunai 2023-05-22 (Rp400 per lembar). Ini daftar pekerjaan penarikan data, bukan tanda bahwa ada yang salah.

## Temuan tentang aturannya sendiri

### R25 menghitung respons kosong milik emiten lain (salah cakupan aturan) — diperbaiki di M3.13

Sampai M3.13 setiap temuan R25 menyebut "respons kosong yang tidak bisa dialamatkan ke emiten mana pun" untuk **seluruh gudang**, bukan untuk emiten yang diperiksa (audit M4a: 21 berkas untuk setiap emiten, termasuk kasus tayang ULTJ). Sejak M3.13 (D-3 dan Amandemen A-1.2) R25 hanya menghitung respons kosong yang endpoint asalnya di `docs/bukti/gudang-manifest.json` (`path_endpoint`) menyebut simbol emiten itu; respons kosong yang asalnya tidak tercatat tidak dihitung untuk emiten mana pun. Jalur `build:case` dan `verifikasi:gudang` memakai aturan cakupan yang sama.

Di gudang sekarang: 21 respons kosong; 18 di antaranya teralamatkan ke emitennya, di 18 emiten (ABMM 1, AGAR 1, AHAP 1, AKKU 1, ALTO 1, AMAG 1, APEX 1, AREA 1, ARGO 1, ASLC 1, ASPI 1, ASPR 1, ASSA 1, BBRM 1, BBSS 1, BEST 1, BNII 1, BSWD 1). Kasus tayang ULTJ: 0 (ketiga respons kosong gudang beku tidak tercatat asalnya).

**Usulan perbaikan yang belum diterapkan:** membaca parameter permintaan dari manifest untuk menyatakan halaman laporan habis (`has_next: false` + parameter tercatat); R25 masih menjawab "tidak lengkap".

### Bug aturan yang dibuktikan uji ulang (D-5)

- **Diperbaiki di M4a** (tes merah dulu di `factory/verifikasi/audit-m4a.test.ts`, kasus tayang tetap byte-identik): R14/R16 mengurutkan dua laporan bercap waktu dan PDF sama menurut urutan baris respons API, bukan sambungan saldonya (BCIC, BAJA); R17B mengadu butir pengalihan berharga Rp0 dengan rentang harga pasar (BBMD); R31 menolak angka RUPS yang ditulis dua desimal (Rp7.61) padahal medan dividennya 7,61106 (BNII).
- **Diperbaiki di M4b — R23 (U26):** laba di keputusan RUPS ASLC sama persis dengan `earnings_before_tax − tax` di laporan keuangan yang sama, tetapi R23 hanya mengadunya dengan `earnings` (laba yang diatribusikan ke induk). Sekarang R23 hijau bila angka RUPS sama dengan salah satu dari keduanya, dan temuan merahnya menyebut keduanya (M4b T-04, tes merah dulu di `factory/verifikasi/aturan-audit.test.ts`; kasus tayang tetap byte-identik).
- **Terbukti, belum diperbaiki — R23 sisa:** 2 temuan R23 yang masih keluar sesudah perbaikan diuji ulang di M4b dan semuanya dibantah: B05 AVIA (tidak), B06 BSIM (tidak). Sebabnya dua bug lain di R23: kata skala di teks RUPS ("Rp1.74 trillion") tidak dibaca, dan angka RUPS sampai rupiah dibandingkan persis dengan medan keuangan yang ditulis dalam satuan juta. Usulan: baca kata skala, lalu bandingkan pada presisi yang lebih kasar dari kedua angka (cara R31 di M4a). Sampai itu, R23 tidak dikutip.
- **Kalimat awam R19b kurang tepat:** aturannya sengaja memakai jendela lunak (9 dari 10 hari datar) dan temuannya menyebutnya, tetapi kalimat awamnya berbunyi "tiap harinya".

## Aturan baru M4b: dua jenis salah nyata yang dulu tidak ditangkap

Uji ulang M4a menemukan dua jenis salah nyata yang tidak ditangkap aturan mana pun. Di M4a keduanya ditahan, karena mendaftarkan satu aturan saja di `ATURAN_V2` mengubah berkas kasus ULTJ yang sedang tayang. M4b membekukan daftar aturan tiap kasus tayang (`docs/bukti/aturan-beku-kasus.json`): kasus tayang hanya menjalankan aturan yang dipakai saat ia dibekukan, jadi aturan baru bisa ditambah tanpa menggeser DADA maupun ULTJ. Kedua jenis itu sekarang aturan:

### R36 — Laporan tentang saham emiten lain (penolak)

Kami menolak kartu kalau laporannya ternyata tentang saham perusahaan lain: judulnya menyebut perusahaan lain, dan persennya tidak mungkin dihitung dari saham emiten ini.

Asal: dari U18: laporan bersimbol ADRO.JK berjudul "Alamtri Resources Indonesia Buy Transaction of Alamtri Minerals Indonesia". Ini cakupan R6 lama ("laporannya ternyata bercerita tentang saham lain") yang hilang ketika R6 digantikan R17B, yang hanya memeriksa harga. Penolak karena dua syarat: judulnya menyebut perusahaan lain DAN penyebut tersirat persennya meleset lebih dari 10% dari saham beredar emiten di semua sisi laporan. Nama beda dengan angka milik emiten (nama lama, ejaan) tetap hijau; judul yang menyebut pemegangnya sendiri (FOLK) tidak lengkap, bukan merah.

- kelompok suspensi: 0 dari 110 laporan bertentangan, 0 tidak cukup data; 0 dari 16 emiten yang diperiksa.
- kelompok pembanding: 1 dari 36 laporan bertentangan, 0 tidak cukup data; 1 dari 8 emiten yang diperiksa (ADRO).
- gudang lama (acuan, dipilih tangan): 0 dari 121 laporan bertentangan, 50 tidak cukup data; 0 dari 12 emiten yang diperiksa.
- uji ulang penguji independen M4b: 1 dari 1 temuan dijawab "ya" (B01 ADRO: ya).

### R37 — Bagian lebih besar dari keseluruhannya di laporan keuangan (penolak)

Kami menolak kartu kalau satu tahun buku laporan keuangan memuat bagian yang lebih besar dari keseluruhannya — utang melebihi total liabilitas, atau kas melebihi aset lancar atau total aset — karena sedikitnya satu angka di tahun buku itu salah satuan atau salah isi.

Asal: dari U28: ABMM tahun buku 2023 menulis total_debt 16 triliun padahal total_liabilities 1,4 miliar. Penolak, karena dua angka di baris yang sama bertentangan menurut definisinya. Hanya tiga hubungan yang terbukti dilanggar di gudang dan berlaku menurut definisi (PSAK 201/IAS 1 par. 54, 66, 69; PSAK 207/IAS 7 par. 6–7): total_debt ≤ total_liabilities, cash_and_equivalents ≤ total_assets, cash_and_equivalents ≤ current_assets.

- kelompok suspensi: 1 dari 182 tahun buku bertentangan, 6 tidak cukup data; 1 dari 28 emiten yang diperiksa (ARCI).
- kelompok pembanding: 1 dari 103 tahun buku bertentangan, 11 tidak cukup data; 1 dari 14 emiten yang diperiksa (ABMM).
- gudang lama (acuan, dipilih tangan): 1 dari 78 tahun buku bertentangan, 0 tidak cukup data; 1 dari 12 emiten yang diperiksa (HITS).
- uji ulang penguji independen M4b: 3 dari 3 temuan dijawab "ya" (B02 ARCI: ya; B03 ABMM: ya; B04 HITS: ya).

## Uji ulang oleh penguji independen (D-5)

Tiap temuan terpilih diberikan ke subagent Claude Opus baru yang hanya menerima potongan respons mentah Sectors dan kalimat awam aturannya — bukan kode, bukan ringkasan temuan kami. Pertanyaannya: apakah data ini benar-benar tidak konsisten seperti kata kalimat itu? Jawaban mentahnya ada di `eval/audit-gudang/penguji/`.

| tahap | diuji | ya | tidak | ragu | temuan hilang karena aturan diperbaiki |
|---|---:|---:|---:|---:|---:|
| sebelum perbaikan | 30 | 17 | 12 | 1 | — |
| sesudah perbaikan (M4a dan M4b) | 24 | 17 | 6 | 1 | 6 |

| uji | aturan | emiten | kelompok | sebelum | sesudah |
|---|---|---|---|---|---|
| U01 | R25 | ARCI | suspensi | tidak | tidak |
| U02 | R25 | ADHI | pembanding | tidak | tidak |
| U03 | R12 | ALII | suspensi | ya | ya |
| U04 | R22 | BAPA | suspensi | ya | ya |
| U05 | R20 | BBRM | suspensi | ya | ya |
| U06 | R32 | BBRM | suspensi | ya | ya |
| U07 | R21 | BBSS | suspensi | ya | ya |
| U08 | R33 | ADRO | pembanding | ya | ya |
| U09 | R15 | ASHA | suspensi | ya | ya |
| U10 | R11a | AMMS | suspensi | ya | ya |
| U11 | R11a | BAIK | suspensi | ya | ya |
| U12 | R11b | ALII | suspensi | ya | ya |
| U13 | R7 | BCIC | suspensi | ya | ya |
| U14 | R7 | BAJA | suspensi | ragu | ragu |
| U15 | R14 | BCIC | suspensi | tidak | hilang |
| U16 | R14 | BCIC | suspensi | tidak | hilang |
| U17 | R16 | BAJA | suspensi | tidak | hilang |
| U18 | R13 | ADRO | pembanding | tidak | tidak |
| U19 | R17B | ADHI | pembanding | ya | ya |
| U20 | R17B | BBMD | pembanding | tidak | hilang |
| U21 | R18a | BBRM | suspensi | ya | ya |
| U22 | R19a | BCIC | suspensi | ya | ya |
| U23 | R19b | BATA | pembanding | tidak | tidak |
| U24 | R28 | BAJA | suspensi | tidak | tidak |
| U25 | R35 | AHAP | suspensi | ya | ya |
| U26 | R23 | ASLC | suspensi | tidak | hilang |
| U27 | R31 | BNII | pembanding | tidak | hilang |
| U28 | R26 | ABMM | pembanding | tidak | tidak |
| U29 | R27 | ARGO | suspensi | ya | ya |
| U30 | R34 | BOLT | pembanding | ya | ya |

Penyelidikan tiap jawaban yang bukan "ya":

- **U01 R25 ARCI** (tidak → tidak) — Bukan salah deteksi: R25 mencatat "tidak lengkap", bukan "bertentangan", jadi pertanyaan "tidak konsisten" tidak cocok untuknya. Tetapi dua klaim di temuannya memang keliru untuk data M4a: respons kosong dihitung lintas-emiten (21 berkas milik emiten lain), dan parameter permintaan sebenarnya tersimpan di buku kas dan manifest. Bug cakupan R25; tidak diperbaiki di M4a karena mengubah kasus ULTJ (lihat usulan di laporan).
- **U02 R25 ADHI** (tidak → tidak) — Bukan salah deteksi: R25 mencatat "tidak lengkap", bukan "bertentangan", jadi pertanyaan "tidak konsisten" tidak cocok untuknya. Tetapi dua klaim di temuannya memang keliru untuk data M4a: respons kosong dihitung lintas-emiten (21 berkas milik emiten lain), dan parameter permintaan sebenarnya tersimpan di buku kas dan manifest. Bug cakupan R25; tidak diperbaiki di M4a karena mengubah kasus ULTJ (lihat usulan di laporan).
- **U14 R7 BAJA** (ragu → ragu) — Selisih penyebut 0,03% (1,7995 lawan 1,8 miliar lembar) yang baru terlihat di desimal ketiga; bisa saham treasuri atau jumlah saham pada tanggal transaksi April. Tidak diubah: R7 membandingkan pada presisi yang tertulis di laporan.
- **U15 R14 BCIC** (tidak → hilang) — Bug aturan terbukti: dua laporan satu pemegang dengan cap waktu dan PDF yang sama diurutkan menurut urutan baris respons API, bukan menurut sambungan saldonya. Diperbaiki (urutCapWaktuKembar, tes merah dulu di factory/verifikasi/audit-m4a.test.ts); temuan ini tidak keluar lagi.
- **U16 R14 BCIC** (tidak → hilang) — Bug aturan terbukti: dua laporan satu pemegang dengan cap waktu dan PDF yang sama diurutkan menurut urutan baris respons API, bukan menurut sambungan saldonya. Diperbaiki (urutCapWaktuKembar, tes merah dulu di factory/verifikasi/audit-m4a.test.ts); temuan ini tidak keluar lagi.
- **U17 R16 BAJA** (tidak → hilang) — Bug aturan terbukti: dua laporan satu pemegang dengan cap waktu dan PDF yang sama diurutkan menurut urutan baris respons API, bukan menurut sambungan saldonya. Diperbaiki (urutCapWaktuKembar, tes merah dulu di factory/verifikasi/audit-m4a.test.ts); temuan ini tidak keluar lagi.
- **U18 R13 ADRO** (tidak → tidak) — Penolakan kartunya benar — lembar yang ditulis mustahil untuk saham beredar ADRO — tetapi sebabnya salah label: laporan tentang saham Alamtri Minerals Indonesia ditandai simbol ADRO.JK (penguji menunjukkan penyebut tersiratnya 40,88 miliar dan harga 1.435 di luar rentang ADRO). Jenis "laporan untuk saham lain" tidak ditangkap aturan mana pun (R6 digantikan). Calon aturan baru D-6; ditahan karena D-7. M4b: jenis ini kini ditangkap R36 (laporan tentang saham emiten lain), dan penguji independen membenarkan temuan R36 atas laporan yang sama (eval/audit-gudang/penguji-m4b/B01). Temuan R13 ADRO tetap keluar dengan alasan yang keliru.
- **U20 R17B BBMD** (tidak → hilang) — Bug aturan terbukti: butir pengalihan (transfer) berharga Rp0 diadu dengan rentang harga pasar. Diperbaiki (harga nol dicatat tidak lengkap, tes merah dulu); temuan ini tidak keluar lagi.
- **U23 R19b BATA** (tidak → tidak) — Bukan salah deteksi: R19b sengaja memakai jendela lunak (9 dari 10 hari) dan temuannya sendiri menulis "9 dari 10 hari bursa"; kalimat awamnya ("tiap harinya") tidak menyebut jendela lunak. Tidak diubah; kalimat awam R19b kurang tepat.
- **U24 R28 BAJA** (tidak → tidak) — Bukan salah deteksi: R28 memberi label deret, tidak mengklaim ketidakkonsistenan; saham tersirat BAJA memang tidak berubah melintasi right issue (label "disesuaikan" sesuai definisinya). Pertanyaan "tidak konsisten" tidak cocok untuk aturan pelabelan.
- **U26 R23 ASLC** (tidak → hilang) — Bug aturan terbukti: laba di keputusan RUPS = earnings_before_tax − tax di laporan keuangan yang sama, tepat sampai rupiah; R23 hanya mengadu dengan medan earnings (laba atribusi induk). Tidak diperbaiki di M4a (pemuat di luar batas D-5). Diperbaiki di M4b T-04: R23 juga mengadu dengan laba sebelum pajak − pajak (labaSesudahPajak, tes merah dulu di factory/verifikasi/aturan-audit.test.ts); temuan ini tidak keluar lagi. Dua temuan R23 yang masih keluar (AVIA, BSIM) diuji ulang di M4b dan dibantah (eval/audit-gudang/penguji-m4b/B05, B06).
- **U27 R31 BNII** (tidak → hilang) — Bug aturan terbukti: angka RUPS Rp7.61 adalah 7,61106 yang dibulatkan dua desimal. Diperbaiki (angka RUPS berdesimal dibandingkan pada desimal yang tertulis; angka bulat tetap harus sama persis; tes merah dulu); temuan ini tidak keluar lagi.
- **U28 R26 ABMM** (tidak → tidak) — Penanda tepat atas angka yang tertulis, tetapi sebab sebenarnya bukan pembagian dividen yang tak masuk akal: baris keuangan ABMM 2023 bercampur satuan (total_debt 16 triliun > total_liabilities 1,4 miliar; kas > total aset). Jenis "komponen neraca melebihi totalnya" tidak ditangkap aturan mana pun. Calon aturan baru D-6; ditahan karena D-7. M4b: jenis ini kini ditangkap R37 (bagian lebih besar dari keseluruhannya di satu tahun buku), dan penguji independen membenarkan temuan R37 ABMM 2023 (eval/audit-gudang/penguji-m4b/B03). Penanda R26 ABMM tetap keluar.

### Uji ulang M4b

Cara yang sama, subagent Claude Opus baru per temuan, bahan ditempel langsung di prompt (penguji tidak membuka berkas). Yang diuji: semua temuan aturan baru R36 dan R37 di gudang audit (paling banyak 3 per aturan), dan temuan R23 yang masih keluar sesudah perbaikannya. Jawaban mentah di `eval/audit-gudang/penguji-m4b/`.

| uji | aturan | emiten | tahap | jawaban |
|---|---|---|---|---|
| B01 | R36 | ADRO | aturan baru M4b | ya |
| B02 | R37 | ARCI | aturan baru M4b | ya |
| B03 | R37 | ABMM | aturan baru M4b | ya |
| B04 | R37 | HITS | aturan baru M4b | ya |
| B05 | R23 | AVIA | R23 sesudah perbaikan M4b T-04 (temuan yang masih keluar) | tidak |
| B06 | R23 | BSIM | R23 sesudah perbaikan M4b T-04 (temuan yang masih keluar) | tidak |

Kesepakatan atas aturan baru: 4 dari 4 "ya".

- **B05 R23 AVIA** (tidak) — Bug R23 terbukti, di luar D-4 dan tidak diperbaiki di M4b: bacaAngkaRupiah membaca "Rp1.74 trillion" sebagai Rp2 (kata skala trillion/billion diabaikan), dan angka RUPS berpresisi dua desimal triliun dibandingkan sampai rupiah. Laba laporan keuangan 1.747.462.000.000 cocok dengan Rp1,74 triliun pada presisi yang tertulis. Perbaikan yang diusulkan: baca kata skala, lalu bandingkan pada presisi angka RUPS (cara R31 M4a). R23 tetap tidak boleh dikutip.
- **B06 R23 BSIM** (tidak) — Bug R23 terbukti, di luar D-4 dan tidak diperbaiki di M4b: medan keuangan BSIM ditulis dalam satuan juta rupiah (285.748.000.000), angka RUPS sampai rupiah (285.747.406.391); R23 membandingkan persis sampai rupiah. Selisih Rp593.609 lebih kecil dari satu satuan presisi laporan keuangan. Perbaikan yang diusulkan: bandingkan pada presisi medan keuangan (kelipatan satu juta bila semua medan baris itu berakhiran 000000). R23 tetap tidak boleh dikutip.

## Kalimat yang boleh dipakai di video/README

Hanya aturan **penolak** yang punya temuan di 42 emiten audit dan tidak satu pun sampelnya masih dibantah penguji. Angkanya langsung dari tabel di atas, dengan penyebutnya. Ini kalimat tentang 42 emiten ini, bukan tentang pasar.

- "Dari 28 emiten yang pernah disuspensi, 17 punya sedikitnya satu angka yang bertentangan dengan angka lain di data resmi yang sama; dari 14 emiten pembanding yang tidak pernah disuspensi, 8."
- R15: "Dari 146 laporan di 24 emiten yang bisa diperiksa, 2 bertentangan (kelompok suspensi 2 / 110, pembanding 0 / 36)." — Kami menolak kartu kalau penjumlahan di dalam satu laporan tidak cocok, termasuk untuk laporan yang jenis transaksinya bukan beli maupun jual.
- R11a: "Dari 146 laporan di 24 emiten yang bisa diperiksa, 4 bertentangan (kelompok suspensi 4 / 110, pembanding 0 / 36)." — Kami menolak kartu kalau dua persen di dalam satu laporan tidak mungkin berasal dari jumlah saham beredar yang sama.
- R7: "Dari 292 sisi laporan di 24 emiten yang bisa diperiksa, 52 bertentangan (kelompok suspensi 38 / 220, pembanding 14 / 72)." — Kami menolak kartu kalau persen yang ditulis laporan tidak cocok dengan jumlah lembar dibagi saham beredar yang berlaku pada tanggal laporan itu. (1 dari 2 sampel uji ulang dijawab "ragu")
- R14: "Dari 73 sambungan di 13 emiten yang bisa diperiksa, 4 bertentangan (kelompok suspensi 2 / 63, pembanding 2 / 10)." — Kami menolak kartu kalau ada lembar yang berpindah tangan tanpa laporan di antara dua laporan berurutan. (belum ada sampel tersisa yang diuji ulang: sampelnya hilang sesudah aturannya diperbaiki, atau tidak terpilih)
- R17B: "Dari 206 butir transaksi di 24 emiten yang bisa diperiksa, 67 bertentangan (kelompok suspensi 48 / 147, pembanding 19 / 59)." — Kami menolak kartu kalau harga yang ditulis laporan di luar rentang harga saham itu pada tanggal transaksinya sendiri. (catatan reviewer M4a: transaksi pasar negosiasi bisa sah di luar rentang pasar reguler — jangan dikutip sebagai "bertentangan" sebelum dicek pakar)
- R35: "Dari 336 nilai harga ekstrem di 42 emiten yang bisa diperiksa, 1 bertentangan (kelompok suspensi 1 / 224, pembanding 0 / 112)." — Kami menolak kartu kalau harga tertinggi atau terendah yang disebut ringkasan tidak terjangkau deret harga hariannya sendiri.
- R36: "Dari 146 laporan di 24 emiten yang bisa diperiksa, 1 bertentangan (kelompok suspensi 0 / 110, pembanding 1 / 36)." — Kami menolak kartu kalau laporannya ternyata tentang saham perusahaan lain: judulnya menyebut perusahaan lain, dan persennya tidak mungkin dihitung dari saham emiten ini.
- R37: "Dari 285 tahun buku di 42 emiten yang bisa diperiksa, 2 bertentangan (kelompok suspensi 1 / 182, pembanding 1 / 103)." — Kami menolak kartu kalau satu tahun buku laporan keuangan memuat bagian yang lebih besar dari keseluruhannya — utang melebihi total liabilitas, atau kas melebihi aset lancar atau total aset — karena sedikitnya satu angka di tahun buku itu salah satuan atau salah isi.

Tidak boleh dikutip karena sampelnya masih dibantah penguji: R13, R19b, R23, R25, R26, R28.

## Yang tidak boleh disimpulkan

- Bahwa saham yang disuspensi punya data lebih buruk: sampelnya kecil dan tidak acak (lihat keterbatasan).
- Bahwa angka yang bertentangan berarti ada yang berbohong: data ini tidak mengatakan angka mana yang benar.
- Apa pun tentang harga atau kualitas saham: berkas ini tidak menilai satu saham pun.
