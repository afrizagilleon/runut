# Bukti: aturan verifikasi dijalankan atas seluruh gudang data

Berkas ini ditulis oleh `npm run verifikasi:gudang`. Jangan disunting tangan: jalankan perintahnya lagi. Perintah itu tidak membaca jaringan, jam dinding, maupun angka acak, jadi dua kali jalan atas data yang sama memberi berkas yang sama.

## Apa yang dibaca

Dari `.cache/sectors/`: **111 berkas**, **303 emiten**, **121 laporan kepemilikan unik** (0 rangkap dibuang), **2.428 baris harga unik** (0 rangkap dibuang), dan 556 baris suspensi.

Tidak ada berkas yang jenisnya tidak bisa dikenali dari isinya.

3 berkas adalah respons berpaginasi yang kosong. Respons seperti itu tidak memuat kode emitennya sama sekali, jadi ia tidak bisa dialamatkan ke emiten mana pun dari isinya: `COCO-filings-sebelum.json`, `MERK-filings.json`, `dada-news-2025.json`.

## Hasil per aturan

| aturan | satuan | diperiksa | hijau | merah[^merah] | tidak lengkap | dilewati |
|---|---|---:|---:|---:|---:|---:|
| R25 | emiten | 12 | 0 | 0 | 12 | 0 |
| R12 | laporan | 57 | 57 | 0 | 0 | 64 |
| R22 | nama pemegang | 74 | 62 | 12 | 0 | 0 |
| R21 | pasang sumber | 7 | 6 | 1 | 0 | 1.069 |
| R20 | emiten | 11 | 6 | 5 | 0 | 0 |
| R32 | pergantian tahun buku | 50 | 49 | 1 | 0 | 0 |
| R33 | pasang hari | 2.414 | 2.374 | 19 | 21 | 0 |
| R15 | laporan | 121 | 121 | 0 | 0 | 0 |
| R1 | laporan | 0 | 0 | 0 | 0 | 121 |
| R11a | laporan | 121 | 103 | 12 | 6 | 0 |
| R7 | sisi laporan | 242 | 172 | 29 | 41 | 0 |
| R14 | sambungan | 93 | 76 | 17 | 0 | 0 |
| R16 | sambungan | 93 | 88 | 5 | 0 | 0 |
| R2 | sambungan | 0 | 0 | 0 | 0 | 121 |
| R13 | medan kepemilikan | 363 | 301 | 2 | 60 | 0 |
| R3 | laporan | 119 | 113 | 6 | 0 | 0 |
| R4 | laporan | 121 | 121 | 0 | 0 | 0 |
| R5 | rantai | 0 | 0 | 0 | 0 | 0 |
| R8 | laporan | 0 | 0 | 0 | 0 | 121 |
| R9 | laporan | 121 | 120 | 1 | 0 | 0 |
| R17B | butir transaksi | 164 | 76 | 56 | 32 | 4 |
| R6 | pemeriksaan | 0 | 0 | 0 | 0 | 121 |
| R18a | baris harga bervolume nol | 201 | 14 | 0 | 187 | 2.227 |
| R10 | baris harga | 0 | 0 | 0 | 0 | 121 |
| R19a | hari datar | 369 | 174 | 195 | 0 | 2.059 |
| R19b | hari bursa | 2.428 | 1.942 | 486 | 0 | 0 |
| R28 | aksi korporasi | 17 | 5 | 0 | 12 | 0 |
| R35 | nilai harga ekstrem | 104 | 46 | 3 | 55 | 0 |

[^merah]: Untuk aturan penolak, "merah" berarti dua angka di dalam data yang sama saling bertentangan. Untuk aturan penanda (R10, R12, R16, R18a, R19a, R19b, R20, R21, R22, R28, R32, R33), "merah" berarti hal itu perlu dijelaskan sebelum dipakai di kartu — bukan bahwa datanya salah.

### R25 — Kelengkapan halaman laporan

Kami menolak bukti negatif kalau daftar laporannya belum terbukti habis.

Diperiksa 12 emiten: 0 tidak bermasalah, 0 bertentangan, 12 datanya tidak cukup untuk memutuskan. 0 emiten tidak masuk pemeriksaan ini. Aturannya jalan untuk 12 emiten dan dilewati untuk 291.

Alasan dilewati:
- Tidak ada berkas respons laporan yang bisa dialamatkan ke emiten ini.

### R12 — Tanggal di nama berkas laporan

Kami menandai laporan yang tanggal di nama berkasnya berbeda dari jam terbitnya, dan memakai tanggal nama berkas untuk mengurutkan rantai.

Diperiksa 57 laporan: 57 tidak bermasalah, 0 ditandai, 0 datanya tidak cukup untuk memutuskan. 64 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 12 emiten dan dilewati untuk 291.

Alasan dilewati:
- Tidak ada laporan untuk diperiksa.

### R22 — Ejaan nama pemegang saham

Kami menandai satu pemegang saham yang ditulis dengan lebih dari satu ejaan, supaya rantainya tidak terbaca sebagai dua orang.

Diperiksa 74 nama pemegang: 62 tidak bermasalah, 12 ditandai, 0 datanya tidak cukup untuk memutuskan. 0 nama pemegang tidak masuk pemeriksaan ini. Aturannya jalan untuk 13 emiten dan dilewati untuk 290.

Alasan dilewati:
- Tidak ada nama pemegang saham untuk dibandingkan.

Contoh nyata:
- **BIRD** — Satu pemegang saham ditulis dengan 2 ejaan berbeda: "Chandra Investama", "PT Chandra Investama". Tanpa disatukan, rantainya terbaca sebagai 2 pemegang yang berbeda.
- **BIRD** — Satu pemegang saham ditulis dengan 2 ejaan berbeda: "PT Pusaka Citra Djokosoetono", "Pusaka Citra Djokosoetono". Tanpa disatukan, rantainya terbaca sebagai 2 pemegang yang berbeda.

### R21 — Jumlah saham beda antar sumber

Kami menandai dua sumber yang menyebut jumlah saham berbeda untuk tanggal yang sama, dan tidak mengadu dua angka yang diukur pada waktu yang berbeda.

Diperiksa 7 pasang sumber: 6 tidak bermasalah, 1 ditandai, 0 datanya tidak cukup untuk memutuskan. 1.069 pasang sumber tidak masuk pemeriksaan ini. Aturannya jalan untuk 12 emiten dan dilewati untuk 291.

Alasan dilewati:
- Kurang dari dua sumber jumlah saham, jadi tidak ada yang bisa diadu.

Contoh nyata:
- **ARNA** — Dua sumber menyebut jumlah saham ARNA yang berbeda untuk tanggal yang sama, 2025-12-31: 7.160.306.042 lembar menurut jumlah saham yang diterbitkan menurut laporan keuangan tahun buku 2025; 7.341.430.976 lembar menurut nilai pasar dibagi harga tutup 2025-12-30, hari bursa terdekat dengan akhir tahun buku 2025. Selisihnya 2.53%. Karena keduanya berbicara tentang hari yang sama, setidaknya satu di antaranya tidak bisa benar; mana yang benar tidak terbaca dari data ini.

### R20 — Basis saham di laba per lembar

Kami menandai emiten yang laba per lembarnya tidak dihitung atas jumlah saham yang sama tiap tahun, karena dua angka seperti itu tidak bisa dibandingkan langsung.

Diperiksa 11 emiten: 6 tidak bermasalah, 5 ditandai, 0 datanya tidak cukup untuk memutuskan. 0 emiten tidak masuk pemeriksaan ini. Aturannya jalan untuk 11 emiten dan dilewati untuk 292.

Alasan dilewati:
- Kurang dari dua tahun buku yang punya laba sekaligus laba per lembar, jadi tidak ada dua basis yang bisa dibandingkan.

Contoh nyata:
- **COCO** — Laba per lembar COCO tidak dihitung atas jumlah saham yang sama tiap tahun. Laba dibagi laba per lembar — yaitu jumlah saham yang dipakai sebagai penyebutnya — memberi 560.000.000 lembar untuk tahun buku 2020 dan 3.559.455.924 lembar untuk tahun buku 2025, selisih 535.62%. Dua angka laba per lembar dari tahun yang berbeda karena itu tidak bisa dibandingkan langsung: sebagian perubahannya berasal dari jumlah sahamnya, bukan dari labanya.
- **KRYA** — Laba per lembar KRYA tidak dihitung atas jumlah saham yang sama tiap tahun. Laba dibagi laba per lembar — yaitu jumlah saham yang dipakai sebagai penyebutnya — memberi 1.625.490.196 lembar untuk tahun buku 2022 dan 1.663.943.474 lembar untuk tahun buku 2023, selisih 2.37%. Dua angka laba per lembar dari tahun yang berbeda karena itu tidak bisa dibandingkan langsung: sebagian perubahannya berasal dari jumlah sahamnya, bukan dari labanya.

### R32 — Perubahan jumlah saham dijelaskan aksi korporasi

Kami menandai perubahan jumlah saham dari satu tahun buku ke tahun berikutnya yang tidak ada satu pun aksi korporasi tercatat untuk menjelaskannya.

Diperiksa 50 pergantian tahun buku: 49 tidak bermasalah, 1 ditandai, 0 datanya tidak cukup untuk memutuskan. 0 pergantian tahun buku tidak masuk pemeriksaan ini. Aturannya jalan untuk 11 emiten dan dilewati untuk 292.

Alasan dilewati:
- Kurang dari dua tahun buku yang basis sahamnya bisa dihitung, jadi tidak ada pergantian tahun untuk diperiksa.

Contoh nyata:
- **ULTJ** — Jumlah saham ULTJ menjadi 0.9 kali lipat antara tahun buku 2024 dan 2025 — dari 11.553.528.000 lembar menjadi 10.398.175.200 lembar. Tidak ada aksi korporasi tercatat sepanjang tahun buku itu. Penyebabnya tidak diketahui.

### R33 — Kestabilan jumlah saham tersirat

Kami menandai hari yang jumlah saham tersiratnya melompat, karena penyebut persen tidak boleh diambil dari hari seperti itu.

Diperiksa 2.414 pasang hari: 2.374 tidak bermasalah, 19 ditandai, 21 datanya tidak cukup untuk memutuskan. 0 pasang hari tidak masuk pemeriksaan ini. Aturannya jalan untuk 14 emiten dan dilewati untuk 289.

Alasan dilewati:
- Kurang dari dua hari harga, tidak ada pasangan untuk dibandingkan.

Contoh nyata:
- **COCO** — Jumlah saham tersirat COCO berubah 2.27% dalam satu hari bursa: 889.863.981 lembar pada 2025-09-29 menjadi 869.639.800 lembar pada 2025-09-30. Dalam 21 hari di sekitarnya tercatat rights issue 2025-10-09.
- **COCO** — Jumlah saham tersirat COCO berubah 2.33% dalam satu hari bursa: 869.639.800 lembar pada 2025-09-30 menjadi 889.863.981 lembar pada 2025-10-01. Dalam 21 hari di sekitarnya tercatat rights issue 2025-10-09.

### R15 — Aritmetika per laporan, termasuk transaksi jenis lain

Kami menolak kartu kalau penjumlahan di dalam satu laporan tidak cocok, termasuk untuk laporan yang jenis transaksinya bukan beli maupun jual.

Diperiksa 121 laporan: 121 tidak bermasalah, 0 bertentangan, 0 datanya tidak cukup untuk memutuskan. 0 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 12 emiten dan dilewati untuk 291.

Alasan dilewati:
- Tidak ada laporan untuk diperiksa.

### R1 — Aritmetika per laporan

Kami menolak kartu kalau penjumlahan di dalam satu laporan tidak cocok dengan dirinya sendiri.

Diperiksa 0 laporan: 0 tidak bermasalah, 0 bertentangan, 0 datanya tidak cukup untuk memutuskan. 121 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 0 emiten dan dilewati untuk 303.

Alasan dilewati:
- Digantikan R15, yang memeriksa hal yang sama dan juga menangani transaction_type "others". Menjalankan keduanya akan melahirkan dua temuan untuk satu cacat data.

### R11a — Penyebut dua sisi satu laporan

Kami menolak kartu kalau dua persen di dalam satu laporan tidak mungkin berasal dari jumlah saham beredar yang sama.

Diperiksa 121 laporan: 103 tidak bermasalah, 12 bertentangan, 6 datanya tidak cukup untuk memutuskan. 0 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 12 emiten dan dilewati untuk 291.

Alasan dilewati:
- Tidak ada laporan untuk diperiksa.

Contoh nyata:
- **COCO** — Laporan 2025-09-30T19:55:29 menulis 61.12% sebelum dan 61.03% sesudah, tetapi tidak ada satu jumlah saham beredar pun yang menjelaskan keduanya: sisi sebelum menuntut 889.722.596-889.868.178 lembar, sisi sesudah menuntut 890.226.980-890.372.859 lembar.
- **COCO** — Laporan 2025-09-30T20:31:05 menulis 61.03% sebelum dan 60.87% sesudah, tetapi tidak ada satu jumlah saham beredar pun yang menjelaskan keduanya: sisi sebelum menuntut 890.226.980-890.372.859 lembar, sisi sesudah menuntut 891.150.287-891.296.701 lembar.

### R7 — Persen dihitung ulang terhadap saham beredar pada tanggal laporan

Kami menolak kartu kalau persen yang ditulis laporan tidak cocok dengan jumlah lembar dibagi saham beredar yang berlaku pada tanggal laporan itu.

Diperiksa 242 sisi laporan: 172 tidak bermasalah, 29 bertentangan, 41 datanya tidak cukup untuk memutuskan. 0 sisi laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 12 emiten dan dilewati untuk 291.

Alasan dilewati:
- Tidak ada laporan untuk diperiksa.

Contoh nyata:
- **COCO** — Laporan 2025-09-30T19:55:29 menulis kepemilikan sebelum transaksi 61.12%, padahal 543.842.937 lembar dibagi 869.639.800 saham beredar yang berlaku 2025-09-30 adalah 62.54%. Persen 61.12% baru mungkin kalau penyebutnya antara 889.722.596 dan 889.868.178 lembar.
- **COCO** — Laporan 2025-09-30T19:55:29 menulis kepemilikan sesudah transaksi 61.03%, padahal 543.350.037 lembar dibagi 869.639.800 saham beredar yang berlaku 2025-09-30 adalah 62.48%. Persen 61.03% baru mungkin kalau penyebutnya antara 890.226.980 dan 890.372.859 lembar.

### R14 — Rantai kepemilikan putus

Kami menolak kartu kalau ada lembar yang berpindah tangan tanpa laporan di antara dua laporan berurutan.

Diperiksa 93 sambungan: 76 tidak bermasalah, 17 bertentangan, 0 datanya tidak cukup untuk memutuskan. 0 sambungan tidak masuk pemeriksaan ini. Aturannya jalan untuk 10 emiten dan dilewati untuk 293.

Alasan dilewati:
- Rantai kurang dari dua laporan, tidak ada sambungan untuk diperiksa.

Contoh nyata:
- **BIRD** — Rantai Sri Adriyani Lestari Dr putus: laporan 2026-07-09T11:04:02 berakhir di 10.000.000 lembar, tetapi laporan berikutnya 2026-07-17T19:59:26 mulai dari 62.560.000 lembar. Ada 52.560.000 lembar yang bertambah tanpa laporan. Selain itu laporan pukul 11:04 sudah memuat keadaan yang baru dihasilkan laporan pukul 19:59, jadi urutan terbitnya terbalik terhadap urutan kejadiannya.
- **COCO** — Rantai Mahogany Global Investment putus: laporan 2025-10-08T19:58:50 berakhir di 459.637.051 lembar, tetapi laporan berikutnya 2025-10-08T20:03:20 mulai dari 459.056.551 lembar. Ada 580.500 lembar yang berkurang tanpa laporan.

### R16 — Jam terbit laporan terhadap urutan rantai

Kami menandai laporan yang terbit lebih dulu tetapi sudah memuat keadaan yang baru dihasilkan laporan berikutnya.

Diperiksa 93 sambungan: 88 tidak bermasalah, 5 ditandai, 0 datanya tidak cukup untuk memutuskan. 0 sambungan tidak masuk pemeriksaan ini. Aturannya jalan untuk 10 emiten dan dilewati untuk 293.

Alasan dilewati:
- Rantai kurang dari dua laporan, tidak ada sambungan untuk diperiksa.

Contoh nyata:
- **BIRD** — 1 sambungan yang jam terbitnya tidak searah dengan rantai juga putus rantainya, dan sudah dilaporkan sebagai satu temuan R14. Satu cacat data tidak dihitung dua kali.
- **COCO** — 1 sambungan yang jam terbitnya tidak searah dengan rantai juga putus rantainya, dan sudah dilaporkan sebagai satu temuan R14. Satu cacat data tidak dihitung dua kali.

### R2 — Kontinuitas rantai

Kami menolak kartu kalau saldo akhir satu laporan tidak sama dengan saldo awal laporan berikutnya.

Diperiksa 0 sambungan: 0 tidak bermasalah, 0 bertentangan, 0 datanya tidak cukup untuk memutuskan. 121 sambungan tidak masuk pemeriksaan ini. Aturannya jalan untuk 0 emiten dan dilewati untuk 303.

Alasan dilewati:
- Digantikan R14, yang memeriksa hal yang sama tetapi mengurutkan rantai dengan tanggal nama berkas (R12) dan menyatukan ejaan nama pemegang (R22).

### R13 — Lembar dilaporkan melebihi saham beredar

Kami menolak kartu kalau satu pemegang dilaporkan memegang lebih banyak lembar daripada yang diterbitkan.

Diperiksa 363 medan kepemilikan: 301 tidak bermasalah, 2 bertentangan, 60 datanya tidak cukup untuk memutuskan. 0 medan kepemilikan tidak masuk pemeriksaan ini. Aturannya jalan untuk 12 emiten dan dilewati untuk 291.

Alasan dilewati:
- Tidak ada laporan untuk diperiksa.

Contoh nyata:
- **RLCO** — Laporan 2026-06-11T17:27:25 menulis kepemilikan sebelum 5.082.642.900 lembar, yaitu 162.6% dari 3.125.000.000 saham beredar yang berlaku 2026-06-11. Satu pemegang tidak bisa memegang lebih banyak lembar daripada yang diterbitkan.
- **RLCO** — Laporan 2026-06-11T17:27:25 menulis kepemilikan sesudah 6.832.215.100 lembar, yaitu 218.6% dari 3.125.000.000 saham beredar yang berlaku 2026-06-11. Satu pemegang tidak bisa memegang lebih banyak lembar daripada yang diterbitkan.

### R3 — Laporan ganda

Kami menolak kartu kalau satu rangkaian transaksi yang sama dilaporkan dua kali.

Diperiksa 119 laporan: 113 tidak bermasalah, 6 bertentangan, 0 datanya tidak cukup untuk memutuskan. 0 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 10 emiten dan dilewati untuk 293.

Alasan dilewati:
- Rantai kurang dari dua laporan, tidak ada urutan yang bisa berulang.

Contoh nyata:
- **DADA** — 6 transaksi yang dilaporkan 2025-10-26T22:50:48–2025-10-26T22:54:38 dilaporkan ulang persis 2025-10-26T22:55:13–2025-10-26T23:01:13, dengan tanggal, jenis, jumlah, dan harga yang sama. Set ulangan berjumlah 586.000.000 lembar.

### R4 — Tanggal ketersediaan

Kami menolak kartu kalau laporannya memuat transaksi bertanggal sesudah laporan itu sendiri terbit.

Diperiksa 121 laporan: 121 tidak bermasalah, 0 bertentangan, 0 datanya tidak cukup untuk memutuskan. 0 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 12 emiten dan dilewati untuk 291.

Alasan dilewati:
- Tidak ada laporan untuk diperiksa.

### R5 — Rekonsiliasi dengan potret kepemilikan

Kami menolak kartu kalau saldo akhir rantai tidak cocok dengan sumber kedua.

Diperiksa 0 rantai: 0 tidak bermasalah, 0 bertentangan, 0 datanya tidak cukup untuk memutuskan. 0 rantai tidak masuk pemeriksaan ini. Aturannya jalan untuk 0 emiten dan dilewati untuk 303.

Alasan dilewati:
- Tidak ada sumber kedua (potret kepemilikan atau saldo awal laporan berikutnya) untuk dibandingkan.

### R8 — Tanda repo

Kami menolak kartu kalau dokumennya menandai transaksi sebagai perjanjian beli kembali, yang bukan jual lepas.

Diperiksa 0 laporan: 0 tidak bermasalah, 0 bertentangan, 0 datanya tidak cukup untuk memutuskan. 121 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 0 emiten dan dilewati untuk 303.

Alasan dilewati:
- Kolom repurchase agreement tidak ada di data API dan belum ada PDF laporan yang diurai, sehingga tanda repo tidak bisa diperiksa.

### R9 — Field terstruktur vs teks

Kami menolak kartu kalau angka di teks laporan berbeda dari angka di kolomnya sendiri.

Diperiksa 121 laporan: 120 tidak bermasalah, 1 bertentangan, 0 datanya tidak cukup untuk memutuskan. 0 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 12 emiten dan dilewati untuk 291.

Alasan dilewati:
- Laporan tidak memuat teks yang bisa diadu dengan field terstruktur.

Contoh nyata:
- **KRYA** — Laporan 2026-01-29T15:28:54: teks menyebut kepemilikan berubah dari 561.322.772 ke 522.207.800 lembar, sedangkan field terstrukturnya 602.207.800 ke 522.207.800.

### R17B — Harga laporan terhadap rentang harga hari transaksinya

Kami menolak kartu kalau harga yang ditulis laporan di luar rentang harga saham itu pada tanggal transaksinya sendiri.

Diperiksa 164 butir transaksi: 76 tidak bermasalah, 56 bertentangan, 32 datanya tidak cukup untuk memutuskan. 4 butir transaksi tidak masuk pemeriksaan ini. Aturannya jalan untuk 11 emiten dan dilewati untuk 292.

Alasan dilewati:
- Tidak ada butir transaksi bertanggal untuk diperiksa.
- Tidak ada data harga harian untuk membandingkan.

Contoh nyata:
- **COCO** — Laporan 2025-10-08T19:58:50 menyebut transaksi 2025-10-06 pada harga Rp400, padahal harga saham hari itu hanya bergerak Rp440-Rp460.
- **DADA** — Laporan 2025-09-29T16:45:08 menyebut transaksi 2025-09-26 pada harga Rp165, padahal harga saham hari itu hanya bergerak Rp135-Rp163.

### R6 — Subjek laporan dan rentang harga

Kami menolak kartu kalau laporannya ternyata bercerita tentang saham lain, atau harganya di luar rentang hari itu.

Diperiksa 0 pemeriksaan: 0 tidak bermasalah, 0 bertentangan, 0 datanya tidak cukup untuk memutuskan. 121 pemeriksaan tidak masuk pemeriksaan ini. Aturannya jalan untuk 0 emiten dan dilewati untuk 303.

Alasan dilewati:
- Pemeriksaan rentang harganya digantikan R17B, yang membandingkan tiap butir transaksi dengan rentang harga tanggalnya sendiri. Pemeriksaan simbolnya tidak berarti di gudang ini: pemuat mengelompokkan laporan menurut simbol di dalam barisnya sendiri, jadi ia selalu hijau tanpa memeriksa apa pun.

### R18a — Hari bervolume nol tanpa baris suspensi

Kami menandai hari yang volumenya nol tetapi tidak ada di daftar suspensi, dan tidak menyimpulkan apa pun darinya.

Diperiksa 201 baris harga bervolume nol: 14 tidak bermasalah, 0 ditandai, 187 datanya tidak cukup untuk memutuskan. 2.227 baris harga bervolume nol tidak masuk pemeriksaan ini. Aturannya jalan untuk 14 emiten dan dilewati untuk 289.

Alasan dilewati:
- Tidak ada data harga harian untuk diperiksa.

### R10 — Hari tanpa volume

Kami menandai hari yang tidak mencatat satu lembar pun berpindah tangan.

Diperiksa 0 baris harga: 0 tidak bermasalah, 0 ditandai, 0 datanya tidak cukup untuk memutuskan. 121 baris harga tidak masuk pemeriksaan ini. Aturannya jalan untuk 0 emiten dan dilewati untuk 303.

Alasan dilewati:
- Digantikan R18a, yang memeriksa hal yang sama tetapi menjawab TIDAK_LENGKAP alih-alih KONFLIK: daftar suspensi hanya mencatat hari mulai berhenti, bukan tiap harinya.

### R19a — Harga datar pada hari tanpa transaksi

Kami menandai hari yang harganya hanya satu angka dan volumenya nol, karena angka itu bukan harga yang disepakati siapa pun.

Diperiksa 369 hari datar: 174 tidak bermasalah, 195 ditandai, 0 datanya tidak cukup untuk memutuskan. 2.059 hari datar tidak masuk pemeriksaan ini. Aturannya jalan untuk 8 emiten dan dilewati untuk 295.

Alasan dilewati:
- Tidak ada hari yang harga buka, tertinggi, terendah, dan tutupnya sama.

Contoh nyata:
- **COCO** — 31 hari bursa COCO antara 2025-05-21 dan 2025-08-21 mencatat satu harga saja untuk buka, tertinggi, terendah, dan tutup, sementara volumenya nol. Angka itu bukan harga yang disepakati siapa pun hari itu.
- **DADA** — 1 hari bursa DADA antara 2025-10-09 dan 2025-10-09 mencatat satu harga saja untuk buka, tertinggi, terendah, dan tutup, sementara volumenya nol. Angka itu bukan harga yang disepakati siapa pun hari itu.

### R19b — Runtun hari datar

Kami menandai runtun hari bursa yang tiap harinya hanya mencatat satu angka untuk buka, tertinggi, terendah, dan tutup — entah harganya diam, entah berganti tiap hari.

Diperiksa 2.428 hari bursa: 1.942 tidak bermasalah, 486 ditandai, 0 datanya tidak cukup untuk memutuskan. 0 hari bursa tidak masuk pemeriksaan ini. Aturannya jalan untuk 14 emiten dan dilewati untuk 289.

Alasan dilewati:
- Hari bursa kurang dari tiga, tidak ada runtun yang bisa terbentuk.

Contoh nyata:
- **COCO** — Selama 9 dari 10 hari bursa antara 2025-05-21 dan 2025-06-05, harga COCO tiap harinya hanya mencatat satu angka — buka, tertinggi, terendah, dan tutup sama — walau harganya berganti dari hari ke hari (Rp175 di awal, Rp236 di akhir).
- **COCO** — Selama 19 hari bursa berturut-turut, dari 2025-05-23 sampai 2025-06-24, harga COCO tiap harinya hanya mencatat satu angka — buka, tertinggi, terendah, dan tutup sama — walau harganya berganti dari hari ke hari (Rp236 di awal, Rp174 di akhir).

### R28 — Label deret harga di sekitar aksi korporasi

Kami memberi label pada deret harga di sekitar aksi korporasi, dan melarang kartu harga melintasi tanggal stock split.

Diperiksa 17 aksi korporasi: 5 tidak bermasalah, 0 ditandai, 12 datanya tidak cukup untuk memutuskan. 0 aksi korporasi tidak masuk pemeriksaan ini. Aturannya jalan untuk 12 emiten dan dilewati untuk 291.

Alasan dilewati:
- Tidak ada aksi korporasi tercatat untuk emiten ini.

### R35 — Harga ekstrem ringkasan terjangkau deret harian

Kami menolak kartu kalau harga tertinggi atau terendah yang disebut ringkasan tidak terjangkau deret harga hariannya sendiri.

Diperiksa 104 nilai harga ekstrem: 46 tidak bermasalah, 3 bertentangan, 55 datanya tidak cukup untuk memutuskan. 0 nilai harga ekstrem tidak masuk pemeriksaan ini. Aturannya jalan untuk 13 emiten dan dilewati untuk 290.

Alasan dilewati:
- Ringkasan emiten ini tidak memuat all_time_price.

Contoh nyata:
- **COCO** — Ringkasan COCO menyebut 52_w_low Rp66 pada 2026-07-01, padahal baris harga harian hari itu hanya bergerak Rp116-Rp172. Angka itu tidak terjangkau deret harganya sendiri.
- **COCO** — Ringkasan COCO menyebut 90_d_low Rp66 pada 2026-07-01, padahal baris harga harian hari itu hanya bergerak Rp116-Rp172. Angka itu tidak terjangkau deret harganya sendiri.

## Yang tidak bisa diperiksa dari data ini

- **Parameter permintaan tidak tersimpan.** Gudang menyimpan jawaban, bukan pertanyaannya. Karena itu tidak ada satu emiten pun yang daftar laporannya bisa dinyatakan habis, dan kalimat "emiten ini tidak punya laporan lain" tidak boleh dipakai sebagai kartu.
- **Respons kosong tidak memuat kode emitennya.** Dua respons kosong dari emiten berbeda identik byte per byte; satu-satunya yang membedakannya adalah nama berkas, dan nama berkas bukan data.
- **Tanda perjanjian beli kembali hanya ada di PDF.** Selama PDF laporan belum diurai, transaksi yang sebenarnya beli-kembali terbaca sebagai penjualan biasa.
- **Kenapa sebagian baris harga tidak punya harga pembukaan** (dan sebagian di antaranya juga tidak punya harga tertinggi maupun terendah) tidak terbaca dari data. Baris seperti itu dibuang sebelum dipakai sebagai rentang.
- **Apakah deret harga ditulis ulang sesudah stock split** tidak bisa ditentukan: dua medan dari endpoint yang sama saling bertentangan. Penyebabnya tidak diketahui.
- **Daftar suspensi mencatat hari mulai berhenti, bukan tiap harinya**, jadi hari bervolume nol tidak bisa dipastikan suspensi atau bukan.

Berkas ini tidak menilai satu saham pun. Ia hanya mengatakan angka mana yang cocok dengan angka lain di dalam data yang sama, dan angka mana yang tidak.
