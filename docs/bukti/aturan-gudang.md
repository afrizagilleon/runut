# Bukti: aturan verifikasi dijalankan atas seluruh gudang data

Berkas ini ditulis oleh `npm run verifikasi:gudang`. Jangan disunting tangan: jalankan perintahnya lagi. Perintah itu tidak membaca jaringan, jam dinding, maupun angka acak, jadi dua kali jalan atas data yang sama memberi berkas yang sama.

## Apa yang dibaca

Dari `.cache/sectors/`: **103 berkas**, **303 emiten**, **110 laporan kepemilikan unik** (0 rangkap dibuang), **2.190 baris harga unik** (0 rangkap dibuang), dan 556 baris suspensi.

Tidak ada berkas yang jenisnya tidak bisa dikenali dari isinya.

3 berkas adalah respons berpaginasi yang kosong. Respons seperti itu tidak memuat kode emitennya sama sekali, jadi ia tidak bisa dialamatkan ke emiten mana pun dari isinya: `COCO-filings-sebelum.json`, `MERK-filings.json`, `dada-news-2025.json`.

## Hasil per aturan

| aturan | satuan | diperiksa | hijau | merah[^merah] | tidak lengkap | dilewati |
|---|---|---:|---:|---:|---:|---:|
| R25 | emiten | 11 | 0 | 0 | 11 | 0 |
| R12 | laporan | 57 | 57 | 0 | 0 | 53 |
| R22 | nama pemegang | 71 | 59 | 12 | 0 | 0 |
| R33 | pasang hari | 2.177 | 2.154 | 2 | 21 | 0 |
| R15 | laporan | 110 | 110 | 0 | 0 | 0 |
| R1 | laporan | 0 | 0 | 0 | 0 | 110 |
| R11a | laporan | 110 | 102 | 2 | 6 | 0 |
| R7 | sisi laporan | 220 | 172 | 7 | 41 | 0 |
| R14 | sambungan | 83 | 68 | 15 | 0 | 0 |
| R16 | sambungan | 83 | 79 | 4 | 0 | 0 |
| R2 | sambungan | 0 | 0 | 0 | 0 | 110 |
| R13 | medan kepemilikan | 330 | 268 | 2 | 60 | 0 |
| R3 | laporan | 108 | 102 | 6 | 0 | 0 |
| R4 | laporan | 110 | 110 | 0 | 0 | 0 |
| R5 | rantai | 0 | 0 | 0 | 0 | 0 |
| R8 | laporan | 0 | 0 | 0 | 0 | 110 |
| R9 | laporan | 110 | 109 | 1 | 0 | 0 |
| R17B | butir transaksi | 153 | 66 | 55 | 32 | 4 |
| R6 | pemeriksaan | 0 | 0 | 0 | 0 | 110 |
| R18a | baris harga bervolume nol | 170 | 11 | 0 | 159 | 2.020 |
| R10 | baris harga | 0 | 0 | 0 | 0 | 110 |
| R19a | hari datar | 331 | 167 | 164 | 0 | 1.859 |
| R19b | hari bursa | 2.190 | 1.766 | 424 | 0 | 0 |
| R28 | aksi korporasi | 12 | 2 | 0 | 10 | 0 |
| R35 | nilai harga ekstrem | 104 | 44 | 0 | 60 | 0 |

[^merah]: Untuk aturan penolak, "merah" berarti dua angka di dalam data yang sama saling bertentangan. Untuk aturan penanda (R10, R12, R16, R18a, R19a, R19b, R22, R28, R33), "merah" berarti hal itu perlu dijelaskan sebelum dipakai di kartu — bukan bahwa datanya salah.

### R25 — Kelengkapan halaman laporan

Kami menolak bukti negatif kalau daftar laporannya belum terbukti habis.

Diperiksa 11 emiten: 0 tidak bermasalah, 0 bertentangan, 11 datanya tidak cukup untuk memutuskan. 0 emiten tidak masuk pemeriksaan ini. Aturannya jalan untuk 11 emiten dan dilewati untuk 292.

Alasan dilewati:
- Tidak ada berkas respons laporan yang bisa dialamatkan ke emiten ini.

### R12 — Tanggal di nama berkas laporan

Kami menandai laporan yang tanggal di nama berkasnya berbeda dari jam terbitnya, dan memakai tanggal nama berkas untuk mengurutkan rantai.

Diperiksa 57 laporan: 57 tidak bermasalah, 0 ditandai, 0 datanya tidak cukup untuk memutuskan. 53 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 11 emiten dan dilewati untuk 292.

Alasan dilewati:
- Tidak ada laporan untuk diperiksa.

### R22 — Ejaan nama pemegang saham

Kami menandai satu pemegang saham yang ditulis dengan lebih dari satu ejaan, supaya rantainya tidak terbaca sebagai dua orang.

Diperiksa 71 nama pemegang: 59 tidak bermasalah, 12 ditandai, 0 datanya tidak cukup untuk memutuskan. 0 nama pemegang tidak masuk pemeriksaan ini. Aturannya jalan untuk 12 emiten dan dilewati untuk 291.

Alasan dilewati:
- Tidak ada nama pemegang saham untuk dibandingkan.

Contoh nyata:
- **BIRD** — Satu pemegang saham ditulis dengan 2 ejaan berbeda: "Chandra Investama", "PT Chandra Investama". Tanpa disatukan, rantainya terbaca sebagai 2 pemegang yang berbeda.
- **BIRD** — Satu pemegang saham ditulis dengan 2 ejaan berbeda: "PT Pusaka Citra Djokosoetono", "Pusaka Citra Djokosoetono". Tanpa disatukan, rantainya terbaca sebagai 2 pemegang yang berbeda.

### R33 — Kestabilan jumlah saham tersirat

Kami menandai hari yang jumlah saham tersiratnya melompat, karena penyebut persen tidak boleh diambil dari hari seperti itu.

Diperiksa 2.177 pasang hari: 2.154 tidak bermasalah, 2 ditandai, 21 datanya tidak cukup untuk memutuskan. 0 pasang hari tidak masuk pemeriksaan ini. Aturannya jalan untuk 13 emiten dan dilewati untuk 290.

Alasan dilewati:
- Kurang dari dua hari harga, tidak ada pasangan untuk dibandingkan.

Contoh nyata:
- **MLPT** — Jumlah saham tersirat MLPT berubah 2.30% dalam satu hari bursa: 46.875.000.000 lembar pada 2025-09-15 menjadi 47.950.819.672 lembar pada 2025-09-16. Tidak ada aksi korporasi tercatat dalam 21 hari di sekitarnya; penyebabnya tidak diketahui.
- **MLPT** — Jumlah saham tersirat MLPT berubah 2.41% dalam satu hari bursa: 47.950.819.672 lembar pada 2025-09-16 menjadi 46.794.642.857 lembar pada 2025-09-17. Tidak ada aksi korporasi tercatat dalam 21 hari di sekitarnya; penyebabnya tidak diketahui.

### R15 — Aritmetika per laporan, termasuk transaksi jenis lain

Kami menolak kartu kalau penjumlahan di dalam satu laporan tidak cocok, termasuk untuk laporan yang jenis transaksinya bukan beli maupun jual.

Diperiksa 110 laporan: 110 tidak bermasalah, 0 bertentangan, 0 datanya tidak cukup untuk memutuskan. 0 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 11 emiten dan dilewati untuk 292.

Alasan dilewati:
- Tidak ada laporan untuk diperiksa.

### R1 — Aritmetika per laporan

Kami menolak kartu kalau penjumlahan di dalam satu laporan tidak cocok dengan dirinya sendiri.

Diperiksa 0 laporan: 0 tidak bermasalah, 0 bertentangan, 0 datanya tidak cukup untuk memutuskan. 110 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 0 emiten dan dilewati untuk 303.

Alasan dilewati:
- Digantikan R15, yang memeriksa hal yang sama dan juga menangani transaction_type "others". Menjalankan keduanya akan melahirkan dua temuan untuk satu cacat data.

### R11a — Penyebut dua sisi satu laporan

Kami menolak kartu kalau dua persen di dalam satu laporan tidak mungkin berasal dari jumlah saham beredar yang sama.

Diperiksa 110 laporan: 102 tidak bermasalah, 2 bertentangan, 6 datanya tidak cukup untuk memutuskan. 0 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 11 emiten dan dilewati untuk 292.

Alasan dilewati:
- Tidak ada laporan untuk diperiksa.

Contoh nyata:
- **KRYA** — Laporan 2026-01-29T15:28:54 menulis 36.2% sebelum dan 31.38% sesudah, tetapi tidak ada satu jumlah saham beredar pun yang menjelaskan keduanya: sisi sebelum menuntut 1.663.327.717-1.663.787.263 lembar, sisi sesudah menuntut 1.663.877.011-1.664.407.331 lembar.
- **KRYA** — Laporan 2026-07-09T22:33:19 menulis 21.77% sebelum dan 22.73% sesudah, tetapi tidak ada satu jumlah saham beredar pun yang menjelaskan keduanya: sisi sebelum menuntut 1.663.411.251-1.664.175.511 lembar, sisi sesudah menuntut 1.645.104.025-1.645.827.943 lembar.

### R7 — Persen dihitung ulang terhadap saham beredar pada tanggal laporan

Kami menolak kartu kalau persen yang ditulis laporan tidak cocok dengan jumlah lembar dibagi saham beredar yang berlaku pada tanggal laporan itu.

Diperiksa 220 sisi laporan: 172 tidak bermasalah, 7 bertentangan, 41 datanya tidak cukup untuk memutuskan. 0 sisi laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 11 emiten dan dilewati untuk 292.

Alasan dilewati:
- Tidak ada laporan untuk diperiksa.

Contoh nyata:
- **KRYA** — Laporan 2025-08-25T17:04:08 menulis kepemilikan sebelum transaksi 48.4%, padahal 811.955.000 lembar dibagi 1.663.943.474 saham beredar yang berlaku 2025-08-25 adalah 48.80%. Persen 48.4% baru mungkin kalau penyebutnya antara 1.677.419.688 dan 1.677.766.298 lembar.
- **KRYA** — Laporan 2025-08-25T17:04:08 menulis kepemilikan sesudah transaksi 16.862%, padahal 282.879.400 lembar dibagi 1.663.943.474 saham beredar yang berlaku 2025-08-25 adalah 17.00%. Persen 16.862% baru mungkin kalau penyebutnya antara 1.677.117.448 dan 1.678.112.357 lembar.

### R14 — Rantai kepemilikan putus

Kami menolak kartu kalau ada lembar yang berpindah tangan tanpa laporan di antara dua laporan berurutan.

Diperiksa 83 sambungan: 68 tidak bermasalah, 15 bertentangan, 0 datanya tidak cukup untuk memutuskan. 0 sambungan tidak masuk pemeriksaan ini. Aturannya jalan untuk 9 emiten dan dilewati untuk 294.

Alasan dilewati:
- Rantai kurang dari dua laporan, tidak ada sambungan untuk diperiksa.

Contoh nyata:
- **BIRD** — Rantai Sri Adriyani Lestari Dr putus: laporan 2026-07-09T11:04:02 berakhir di 10.000.000 lembar, tetapi laporan berikutnya 2026-07-17T19:59:26 mulai dari 62.560.000 lembar. Ada 52.560.000 lembar yang bertambah tanpa laporan. Selain itu laporan pukul 11:04 sudah memuat keadaan yang baru dihasilkan laporan pukul 19:59, jadi urutan terbitnya terbalik terhadap urutan kejadiannya.
- **DADA** — Rantai Karya Permata Inovasi Indonesia putus: laporan 2025-08-25T17:00:51 berakhir di 4.692.137.600 lembar, tetapi laporan berikutnya 2025-08-25T17:03:44 mulai dari 4.682.137.600 lembar. Ada 10.000.000 lembar yang berkurang tanpa laporan.

### R16 — Jam terbit laporan terhadap urutan rantai

Kami menandai laporan yang terbit lebih dulu tetapi sudah memuat keadaan yang baru dihasilkan laporan berikutnya.

Diperiksa 83 sambungan: 79 tidak bermasalah, 4 ditandai, 0 datanya tidak cukup untuk memutuskan. 0 sambungan tidak masuk pemeriksaan ini. Aturannya jalan untuk 9 emiten dan dilewati untuk 294.

Alasan dilewati:
- Rantai kurang dari dua laporan, tidak ada sambungan untuk diperiksa.

Contoh nyata:
- **BIRD** — 1 sambungan yang jam terbitnya tidak searah dengan rantai juga putus rantainya, dan sudah dilaporkan sebagai satu temuan R14. Satu cacat data tidak dihitung dua kali.
- **MTLA** — Laporan Yulie Sekuritas Indonesia pukul 10:27 pada 2026-07-10 sudah memuat saldo 553.900.961 lembar, yang baru dihasilkan laporan pukul 17:26. Urutan terbitnya terbalik terhadap urutan kejadiannya, jadi "apa yang sudah bisa dibaca hari itu" tidak punya satu jawaban.

### R2 — Kontinuitas rantai

Kami menolak kartu kalau saldo akhir satu laporan tidak sama dengan saldo awal laporan berikutnya.

Diperiksa 0 sambungan: 0 tidak bermasalah, 0 bertentangan, 0 datanya tidak cukup untuk memutuskan. 110 sambungan tidak masuk pemeriksaan ini. Aturannya jalan untuk 0 emiten dan dilewati untuk 303.

Alasan dilewati:
- Digantikan R14, yang memeriksa hal yang sama tetapi mengurutkan rantai dengan tanggal nama berkas (R12) dan menyatukan ejaan nama pemegang (R22).

### R13 — Lembar dilaporkan melebihi saham beredar

Kami menolak kartu kalau satu pemegang dilaporkan memegang lebih banyak lembar daripada yang diterbitkan.

Diperiksa 330 medan kepemilikan: 268 tidak bermasalah, 2 bertentangan, 60 datanya tidak cukup untuk memutuskan. 0 medan kepemilikan tidak masuk pemeriksaan ini. Aturannya jalan untuk 11 emiten dan dilewati untuk 292.

Alasan dilewati:
- Tidak ada laporan untuk diperiksa.

Contoh nyata:
- **RLCO** — Laporan 2026-06-11T17:27:25 menulis kepemilikan sebelum 5.082.642.900 lembar, yaitu 162.6% dari 3.125.000.000 saham beredar yang berlaku 2026-06-11. Satu pemegang tidak bisa memegang lebih banyak lembar daripada yang diterbitkan.
- **RLCO** — Laporan 2026-06-11T17:27:25 menulis kepemilikan sesudah 6.832.215.100 lembar, yaitu 218.6% dari 3.125.000.000 saham beredar yang berlaku 2026-06-11. Satu pemegang tidak bisa memegang lebih banyak lembar daripada yang diterbitkan.

### R3 — Laporan ganda

Kami menolak kartu kalau satu rangkaian transaksi yang sama dilaporkan dua kali.

Diperiksa 108 laporan: 102 tidak bermasalah, 6 bertentangan, 0 datanya tidak cukup untuk memutuskan. 0 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 9 emiten dan dilewati untuk 294.

Alasan dilewati:
- Rantai kurang dari dua laporan, tidak ada urutan yang bisa berulang.

Contoh nyata:
- **DADA** — 6 transaksi yang dilaporkan 2025-10-26T22:50:48–2025-10-26T22:54:38 dilaporkan ulang persis 2025-10-26T22:55:13–2025-10-26T23:01:13, dengan tanggal, jenis, jumlah, dan harga yang sama. Set ulangan berjumlah 586.000.000 lembar.

### R4 — Tanggal ketersediaan

Kami menolak kartu kalau laporannya memuat transaksi bertanggal sesudah laporan itu sendiri terbit.

Diperiksa 110 laporan: 110 tidak bermasalah, 0 bertentangan, 0 datanya tidak cukup untuk memutuskan. 0 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 11 emiten dan dilewati untuk 292.

Alasan dilewati:
- Tidak ada laporan untuk diperiksa.

### R5 — Rekonsiliasi dengan potret kepemilikan

Kami menolak kartu kalau saldo akhir rantai tidak cocok dengan sumber kedua.

Diperiksa 0 rantai: 0 tidak bermasalah, 0 bertentangan, 0 datanya tidak cukup untuk memutuskan. 0 rantai tidak masuk pemeriksaan ini. Aturannya jalan untuk 0 emiten dan dilewati untuk 303.

Alasan dilewati:
- Tidak ada sumber kedua (potret kepemilikan atau saldo awal laporan berikutnya) untuk dibandingkan.

### R8 — Tanda repo

Kami menolak kartu kalau dokumennya menandai transaksi sebagai perjanjian beli kembali, yang bukan jual lepas.

Diperiksa 0 laporan: 0 tidak bermasalah, 0 bertentangan, 0 datanya tidak cukup untuk memutuskan. 110 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 0 emiten dan dilewati untuk 303.

Alasan dilewati:
- Kolom repurchase agreement tidak ada di data API dan belum ada PDF laporan yang diurai, sehingga tanda repo tidak bisa diperiksa.

### R9 — Field terstruktur vs teks

Kami menolak kartu kalau angka di teks laporan berbeda dari angka di kolomnya sendiri.

Diperiksa 110 laporan: 109 tidak bermasalah, 1 bertentangan, 0 datanya tidak cukup untuk memutuskan. 0 laporan tidak masuk pemeriksaan ini. Aturannya jalan untuk 11 emiten dan dilewati untuk 292.

Alasan dilewati:
- Laporan tidak memuat teks yang bisa diadu dengan field terstruktur.

Contoh nyata:
- **KRYA** — Laporan 2026-01-29T15:28:54: teks menyebut kepemilikan berubah dari 561.322.772 ke 522.207.800 lembar, sedangkan field terstrukturnya 602.207.800 ke 522.207.800.

### R17B — Harga laporan terhadap rentang harga hari transaksinya

Kami menolak kartu kalau harga yang ditulis laporan di luar rentang harga saham itu pada tanggal transaksinya sendiri.

Diperiksa 153 butir transaksi: 66 tidak bermasalah, 55 bertentangan, 32 datanya tidak cukup untuk memutuskan. 4 butir transaksi tidak masuk pemeriksaan ini. Aturannya jalan untuk 10 emiten dan dilewati untuk 293.

Alasan dilewati:
- Tidak ada butir transaksi bertanggal untuk diperiksa.
- Tidak ada data harga harian untuk membandingkan.

Contoh nyata:
- **DADA** — Laporan 2025-09-29T16:45:08 menyebut transaksi 2025-09-26 pada harga Rp165, padahal harga saham hari itu hanya bergerak Rp135-Rp163.
- **DADA** — Laporan 2025-10-19T01:09:01 menyebut transaksi 2025-10-14 pada harga Rp152, padahal harga saham hari itu hanya bergerak Rp111-Rp111.

### R6 — Subjek laporan dan rentang harga

Kami menolak kartu kalau laporannya ternyata bercerita tentang saham lain, atau harganya di luar rentang hari itu.

Diperiksa 0 pemeriksaan: 0 tidak bermasalah, 0 bertentangan, 0 datanya tidak cukup untuk memutuskan. 110 pemeriksaan tidak masuk pemeriksaan ini. Aturannya jalan untuk 0 emiten dan dilewati untuk 303.

Alasan dilewati:
- Pemeriksaan rentang harganya digantikan R17B, yang membandingkan tiap butir transaksi dengan rentang harga tanggalnya sendiri. Pemeriksaan simbolnya tidak berarti di gudang ini: pemuat mengelompokkan laporan menurut simbol di dalam barisnya sendiri, jadi ia selalu hijau tanpa memeriksa apa pun.

### R18a — Hari bervolume nol tanpa baris suspensi

Kami menandai hari yang volumenya nol tetapi tidak ada di daftar suspensi, dan tidak menyimpulkan apa pun darinya.

Diperiksa 170 baris harga bervolume nol: 11 tidak bermasalah, 0 ditandai, 159 datanya tidak cukup untuk memutuskan. 2.020 baris harga bervolume nol tidak masuk pemeriksaan ini. Aturannya jalan untuk 13 emiten dan dilewati untuk 290.

Alasan dilewati:
- Tidak ada data harga harian untuk diperiksa.

### R10 — Hari tanpa volume

Kami menandai hari yang tidak mencatat satu lembar pun berpindah tangan.

Diperiksa 0 baris harga: 0 tidak bermasalah, 0 ditandai, 0 datanya tidak cukup untuk memutuskan. 110 baris harga tidak masuk pemeriksaan ini. Aturannya jalan untuk 0 emiten dan dilewati untuk 303.

Alasan dilewati:
- Digantikan R18a, yang memeriksa hal yang sama tetapi menjawab TIDAK_LENGKAP alih-alih KONFLIK: daftar suspensi hanya mencatat hari mulai berhenti, bukan tiap harinya.

### R19a — Harga datar pada hari tanpa transaksi

Kami menandai hari yang harganya hanya satu angka dan volumenya nol, karena angka itu bukan harga yang disepakati siapa pun.

Diperiksa 331 hari datar: 167 tidak bermasalah, 164 ditandai, 0 datanya tidak cukup untuk memutuskan. 1.859 hari datar tidak masuk pemeriksaan ini. Aturannya jalan untuk 7 emiten dan dilewati untuk 296.

Alasan dilewati:
- Tidak ada hari yang harga buka, tertinggi, terendah, dan tutupnya sama.

Contoh nyata:
- **DADA** — 1 hari bursa DADA antara 2025-10-09 dan 2025-10-09 mencatat satu harga saja untuk buka, tertinggi, terendah, dan tutup, sementara volumenya nol. Angka itu bukan harga yang disepakati siapa pun hari itu.
- **FOLK** — 16 hari bursa FOLK antara 2025-10-08 dan 2025-12-24 mencatat satu harga saja untuk buka, tertinggi, terendah, dan tutup, sementara volumenya nol. Angka itu bukan harga yang disepakati siapa pun hari itu.

### R19b — Runtun hari datar

Kami menandai runtun hari bursa yang tiap harinya hanya mencatat satu angka untuk buka, tertinggi, terendah, dan tutup — entah harganya diam, entah berganti tiap hari.

Diperiksa 2.190 hari bursa: 1.766 tidak bermasalah, 424 ditandai, 0 datanya tidak cukup untuk memutuskan. 0 hari bursa tidak masuk pemeriksaan ini. Aturannya jalan untuk 13 emiten dan dilewati untuk 290.

Alasan dilewati:
- Hari bursa kurang dari tiga, tidak ada runtun yang bisa terbentuk.

Contoh nyata:
- **DADA** — Selama 4 hari bursa berturut-turut, dari 2025-08-05 sampai 2025-08-08, harga DADA tiap harinya hanya mencatat satu angka — buka, tertinggi, terendah, dan tutup sama — walau harganya berganti dari hari ke hari (Rp10 di awal, Rp11 di akhir).
- **DADA** — Selama 9 dari 10 hari bursa antara 2025-08-05 dan 2025-08-19, harga DADA tiap harinya hanya mencatat satu angka — buka, tertinggi, terendah, dan tutup sama — walau harganya berganti dari hari ke hari (Rp10 di awal, Rp17 di akhir).

### R28 — Label deret harga di sekitar aksi korporasi

Kami memberi label pada deret harga di sekitar aksi korporasi, dan melarang kartu harga melintasi tanggal stock split.

Diperiksa 12 aksi korporasi: 2 tidak bermasalah, 0 ditandai, 10 datanya tidak cukup untuk memutuskan. 0 aksi korporasi tidak masuk pemeriksaan ini. Aturannya jalan untuk 10 emiten dan dilewati untuk 293.

Alasan dilewati:
- Tidak ada aksi korporasi tercatat untuk emiten ini.

### R35 — Harga ekstrem ringkasan terjangkau deret harian

Kami menolak kartu kalau harga tertinggi atau terendah yang disebut ringkasan tidak terjangkau deret harga hariannya sendiri.

Diperiksa 104 nilai harga ekstrem: 44 tidak bermasalah, 0 bertentangan, 60 datanya tidak cukup untuk memutuskan. 0 nilai harga ekstrem tidak masuk pemeriksaan ini. Aturannya jalan untuk 13 emiten dan dilewati untuk 290.

Alasan dilewati:
- Ringkasan emiten ini tidak memuat all_time_price.

## Yang tidak bisa diperiksa dari data ini

- **Parameter permintaan tidak tersimpan.** Gudang menyimpan jawaban, bukan pertanyaannya. Karena itu tidak ada satu emiten pun yang daftar laporannya bisa dinyatakan habis, dan kalimat "emiten ini tidak punya laporan lain" tidak boleh dipakai sebagai kartu.
- **Respons kosong tidak memuat kode emitennya.** Dua respons kosong dari emiten berbeda identik byte per byte; satu-satunya yang membedakannya adalah nama berkas, dan nama berkas bukan data.
- **Tanda perjanjian beli kembali hanya ada di PDF.** Selama PDF laporan belum diurai, transaksi yang sebenarnya beli-kembali terbaca sebagai penjualan biasa.
- **Kenapa sebagian baris harga tidak punya harga pembukaan** (dan sebagian di antaranya juga tidak punya harga tertinggi maupun terendah) tidak terbaca dari data. Baris seperti itu dibuang sebelum dipakai sebagai rentang.
- **Apakah deret harga ditulis ulang sesudah stock split** tidak bisa ditentukan: dua medan dari endpoint yang sama saling bertentangan. Penyebabnya tidak diketahui.
- **Daftar suspensi mencatat hari mulai berhenti, bukan tiap harinya**, jadi hari bervolume nol tidak bisa dipastikan suspensi atau bukan.

Berkas ini tidak menilai satu saham pun. Ia hanya mengatakan angka mana yang cocok dengan angka lain di dalam data yang sama, dan angka mana yang tidak.
