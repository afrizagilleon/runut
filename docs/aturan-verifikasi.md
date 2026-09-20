# Aturan verifikasi R1–R10

Aturan ini lahir dari memverifikasi tujuh emiten dengan tangan pada 19–20 September 2026. Enam di antaranya punya setidaknya satu kesalahan data yang mengubah kesimpulan. Aturan akan bertambah setiap kali kasus baru mengajari kami sesuatu; nomor lama tidak dipakai ulang.

Semua aturan berjalan **tanpa LLM**. Keluarannya `Finding`: aturan, ringkasan, angka, dan fakta terkait.

## R1 — Aritmetika per laporan
Untuk tiap filing: `kepemilikan_sebelum − jumlah` (jual) atau `+ jumlah` (beli) harus sama dengan `kepemilikan_sesudah`.
**Contoh pelanggaran nyata (KRYA, laporan 29 Jan 2026):** 561.322.772 − 80.000.000 ≠ 522.207.800.

## R2 — Kontinuitas rantai
Untuk tiap pemegang saham, urut berdasarkan tanggal laporan: `sebelum[i]` harus sama dengan `sesudah[i−1]`. Selisih berarti ada transaksi yang tidak ada di data.
**Contoh nyata (DADA):** +79.272.900 lembar antara 19 Okt 01:10 dan 23:09; **−1.660.008.900 lembar** antara 19 Okt 23:10 dan 23:44. Yang kedua kemungkinan penjualan besar 10 Okt yang diberitakan media tetapi tidak ada di data.

## R3 — Laporan ganda
Urutan transaksi (tanggal transaksi, jenis, jumlah, harga) yang berulang persis menandakan pelaporan ganda.
**Contoh nyata (DADA):** enam transaksi 23 Okt 2025 dilaporkan dua kali, pukul 22:50–22:54 dan 22:55–23:01, dengan nomor surat berbeda (173–178 dan 179–184). Total set ulangan 586.000.000 lembar = 7,89%. Bukti bahwa set kedua adalah ulangan: filing 12 Jan 2026 menyatakan kepemilikan sebelum transaksi 2.200.000.000 lembar (29,6%), yang hanya mungkin kalau set kedua tidak pernah terjadi.

## R4 — Tanggal ketersediaan
Yang menentukan apa yang boleh dilihat pemain pada tanggal T adalah **tanggal laporan**, bukan tanggal transaksi. Kalau tanggal laporan tidak ada, fakta itu `tersedia_sejak: null` dan dikecualikan dari tampilan.
**Contoh nyata (DADA):** transaksi 10 Okt 2025 baru dilaporkan 19 Okt.

## R5 — Rekonsiliasi dengan potret kepemilikan
Saldo akhir rantai dibandingkan dengan sumber kedua: saldo "sebelum" di filing berikutnya, atau potret komposisi pemegang saham.
**Contoh nyata (KRYA):** filing menunjukkan 374.014.400 lembar, potret menunjukkan 362.207.800.

## R6 — Subjek laporan
Emiten yang dibicarakan di dalam laporan harus sama dengan emiten yang sedang diperiksa, dan harga transaksi harus berada dalam rentang harga harian saham itu pada tanggal transaksi.
**Contoh nyata (LPLI):** satu filing yang tercatat di LPLI ternyata melaporkan penjualan saham NOBU.

## R7 — Persen dihitung ulang
Persentase di laporan tidak dipercaya; hitung `jumlah lembar ÷ saham beredar`.
**Contoh nyata (COCO):** emiten menulis pengendali "tinggal 44,69%", padahal 456.716.151 ÷ 889.863.981 = **51,32%**, masih mayoritas. Penyebabnya emiten membagi dengan kepemilikannya sendiri, bukan total saham.

## R8 — Tanda repo
Kolom *repurchase agreement* hanya ada di PDF, tidak ada di API. Transaksi repo bukan jual lepas dan tidak boleh dibaca sebagai "pengendali keluar".
**Contoh nyata (KRYA 31 Des 2025; RLCO Jun–Sep 2026):** API mencatat "sell", PDF menulis repo.

## R9 — Field terstruktur vs teks
Nilai di field terstruktur harus cocok dengan angka yang disebut di teks laporan.
**Contoh nyata (KRYA):** field `holding_before` sudah disesuaikan rantai, sedangkan teks laporan masih memakai angka PDF yang berbeda.

## R10 — Hari tanpa volume
Hari dengan volume 0 dan harga datar harus cocok dengan daftar suspensi. Kalau tidak ada di daftar, cari pengumuman bursanya.
**Contoh nyata (RLCO):** suspensi 22–23 Des 2025 tidak ada di data suspensi, tetapi volume 0 dan PDF pengumuman bursa membuktikannya.

## Status fakta
- **TERVERIFIKASI** — lolos semua aturan yang berlaku untuknya.
- **KONFLIK** — melanggar aturan dan belum terselesaikan. Tidak boleh dipakai sebagai jawaban soal; boleh dipakai sebagai bahan soal verifikasi.
- **BELUM** — belum diperiksa atau tanggal ketersediaannya tidak diketahui. Tidak ditampilkan ke pemain.
