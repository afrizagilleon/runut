Bayangkan kamu orang 20-an yang belum pernah beli saham, membaca di ponsel, dan tidak mau berhitung.
Di bawah ada beberapa soal latihan. Tiap soal: seorang teman mengirim pesan di grup obrolan tentang
sebuah saham, lalu ada beberapa kartu (potongan dokumen resmi), pertanyaan, dan empat pilihan.
Tiap soal berdiri sendiri. Untuk tiap soal: cocokkan omongan teman dengan kartunya, pilih satu huruf,
sebutkan nomor kartu yang menentukan jawabanmu, dan tulis kalimat (dari soal) yang membingungkanmu —
kosongkan kalau tidak ada. Jangan memakai alat apa pun dan jangan mencari informasi.
Balas HANYA dengan JSON berbentuk:
{"jawaban": [{"id": "Q1", "pilihan": "a", "kartu": [1], "bingung": "..."}, ...]}

### Q1
Pesan dari Wawan (20.15): "Gue panik nih, pemilik terbesar katanya udah lepas 299,5 juta lembar saham. Tapi laporannya nggak lolos pemeriksaan, jadi angkanya belum tentu bener."
Kartu:
- Kartu 1 — hitungan dari kartu lain, terbit 1 September 2025: Laporan penjualan pemilik terbesar yang lolos seluruh pemeriksaan: 3 laporan.
- Kartu 2 — laporan kepemilikan saham yang diumumkan ke publik, terbit 25 Agustus 2025: Pemilik terbesar melaporkan penjualan 70.000.000 lembar atas transaksi 12 Agustus 2025, dilaporkan 25 Agustus 2025. Kepemilikan tercatat berubah dari 4.662.137.600 menjadi 4.592.137.600 lembar, yaitu dari 62,73 persen menjadi 61,788 persen saham.
- Kartu 3 — laporan kepemilikan saham yang diumumkan ke publik, terbit 25 Agustus 2025: Pemilik terbesar melaporkan penjualan 179.500.000 lembar atas transaksi 13 Agustus 2025, dilaporkan 25 Agustus 2025. Kepemilikan tercatat berubah dari 4.592.137.600 menjadi 4.412.637.600 lembar, yaitu dari 61,79 persen menjadi 59,375 persen saham.
- Kartu 4 — laporan kepemilikan saham yang diumumkan ke publik, terbit 1 September 2025: Pemilik terbesar melaporkan penjualan 50.000.000 lembar atas transaksi 14 Agustus 2025, dilaporkan 1 September 2025. Kepemilikan tercatat berubah dari 4.412.637.600 menjadi 4.362.637.600 lembar, yaitu dari 59,38 persen menjadi 58,7 persen saham.
Pertanyaan: Omongan Wawan cocok dengan dokumennya?
a) Betul, laporannya nggak lolos pemeriksaan, jadi angkanya nggak bisa dipercaya.
b) Keliru, laporannya lolos pemeriksaan, jumlahnya 3 laporan.
c) Betul, laporannya nggak lolos pemeriksaan, cuma kabar di grup doang.
d) Keliru, laporannya lolos pemeriksaan, tapi cuma satu laporan.

### Q2
Pesan dari Rizky (20.15): "Gue udah liat Perusahaan T naik terus dari 26 November sampai 9 Desember, nggak ada putusnya. Kalian telat nyadar aja, gue dari dulu pantau."
Kartu:
- Kartu 1 — hitungan dari kartu lain, terbit 9 Desember 2025: Dari 26 November 2025 (Rp48) sampai 9 Desember 2025 (Rp106), harga penutupan naik 9 hari bursa berturut-turut, tiap hari lebih tinggi dari hari bursa sebelumnya.
- Kartu 2 — data harga harian bursa, terbit 26 November 2025: Harga penutupan 26 November 2025 adalah Rp48 per lembar.
- Kartu 3 — data harga harian bursa, terbit 9 Desember 2025: Harga penutupan 9 Desember 2025 adalah Rp106 per lembar.
Pertanyaan: Omongan Rizky cocok dengan dokumennya?
a) Betul, naiknya nggak putus karena tiap hari jumlah lembar yang ditransaksikan nambah.
b) Betul, tiap hari bursa penutupannya lebih tinggi dari hari sebelumnya, nggak putus.
c) Keliru, di rentang itu ada hari bursa yang penutupannya lebih rendah dari hari sebelumnya.
d) Keliru, yang naik beruntun cuma harga tertinggi harian, penutupannya diam aja.

### Q3
Pesan dari Santi (21.08): "Perusahaan T disetop lagi hari ini, terus yang 21 Januari dulu juga. Itu dulu gara-gara harganya naik juga kan? Gue ragu sih, kayaknya gitu."
Kartu:
- Kartu 1 — pengumuman penghentian sementara perdagangan oleh bursa, terbit 21 Januari 2025: Perdagangan saham dihentikan sementara oleh bursa pada 21 Januari 2025. Alasan resmi: Bursa menilai bahwa terdapat keraguan atas kelangsungan usaha perseroan. Tanggal pencabutan penghentian ini tidak ada di data, jadi lamanya tidak bisa dipastikan dari sumber mana pun yang dipakai kasus ini.
- Kartu 2 — pengumuman penghentian sementara perdagangan oleh bursa, terbit 10 Desember 2025: Perdagangan saham dihentikan sementara oleh bursa pada 10 Desember 2025. Alasan resmi: Terjadinya peningkatan harga kumulatif yang signifikan pada saham Perusahaan T, dalam rangka cooling down sebagai bentuk perlindungan bagi investor. Tanggal pencabutan penghentian ini tidak ada di data, jadi lamanya tidak bisa dipastikan dari sumber mana pun yang dipakai kasus ini.
- Kartu 3 — hitungan dari kartu lain, terbit 9 Desember 2025: Dari 26 November 2025 (Rp48) sampai 9 Desember 2025 (Rp106), harga penutupan naik 9 hari bursa berturut-turut, tiap hari lebih tinggi dari hari bursa sebelumnya.
Pertanyaan: Omongan Santi cocok dengan dokumennya?
a) Betul, setop awal tahun juga karena kenaikan harga kumulatif, sama seperti setop hari ini.
b) Betul, setop awal tahun karena harganya naik beruntun, jadi sama saja dengan yang sekarang.
c) Keliru, setop awal tahun karena bursa ragu usaha bakal lanjut, bukan soal harga.
d) Keliru, setop awal tahun karena sahamnya nggak ada yang beli, bukan soal harga.

### Q4
Pesan dari Nadia (19.47): "Gila gue panik, Perusahaan T udah naik 2,21 kali dari 26 November! Ini gara-gara ada yang ngeborong gede ya? Gue takut banget kejebak."
Kartu:
- Kartu 1 — data harga harian bursa, terbit 26 November 2025: Harga penutupan 26 November 2025 adalah Rp48 per lembar.
- Kartu 2 — data harga harian bursa, terbit 9 Desember 2025: Harga penutupan 9 Desember 2025 adalah Rp106 per lembar.
- Kartu 3 — hitungan dari kartu lain, terbit 9 Desember 2025: Harga penutupan 9 Desember 2025 (Rp106) adalah 2,21 kali harga penutupan 26 November 2025 (Rp48), dibulatkan dua angka di belakang koma.
- Kartu 4 — pengumuman penghentian sementara perdagangan oleh bursa, terbit 10 Desember 2025: Perdagangan saham dihentikan sementara oleh bursa pada 10 Desember 2025. Alasan resmi: Terjadinya peningkatan harga kumulatif yang signifikan pada saham Perusahaan T, dalam rangka cooling down sebagai bentuk perlindungan bagi investor. Tanggal pencabutan penghentian ini tidak ada di data, jadi lamanya tidak bisa dipastikan dari sumber mana pun yang dipakai kasus ini.
Pertanyaan: Omongan Nadia cocok dengan dokumennya?
a) Betul, 2,21 kali itu dari penutupan dibanding penutupan, jadi naiknya nyata.
b) Betul, 2,21 kali itu dari harga pembukaan, jadi wajar panik.
c) Keliru, 2,21 kali itu jumlah lembar yang ditransaksikan, bukan harga.
d) Keliru, penutupan terakhir masih di bawah penutupan akhir November, jadi belum naik.

### Q5
Pesan dari Ika (21.05): "Gue ragu nih, saham ini kan disetop bursa 30 Juni gara-gara laporan keuangan auditan tahunan belum diserahkan. Katanya cuma sampai 5 Juli doang, terus udah dibuka lagi, bener nggak sih?"
Kartu:
- Kartu 1 — pengumuman penghentian sementara perdagangan oleh bursa, terbit 30 Juni 2025: Perdagangan saham dihentikan sementara oleh bursa pada 30 Juni 2025. Alasan resmi: Belum menyampaikan laporan keuangan auditan tahunan. Tanggal pencabutan penghentian ini tidak ada di data, jadi lamanya tidak bisa dipastikan dari sumber mana pun yang dipakai kasus ini.
- Kartu 2 — data harga harian bursa, terbit 8 Oktober 2025: Harga penutupan 8 Oktober 2025 adalah Rp178 per lembar.
- Kartu 3 — data harga harian bursa, terbit 7 Oktober 2025: Harga penutupan 7 Oktober 2025 adalah Rp162 per lembar.
Pertanyaan: Omongan Ika cocok dengan dokumennya?
a) Betul, penghentiannya sudah dicabut dan sahamnya diperdagangkan lagi.
b) Keliru, tanggal pencabutan penghentiannya nggak ada di catatan.
c) Betul, penghentiannya dicabut begitu laporan keuangannya masuk.
d) Keliru, penghentiannya masih jalan sampai 8 Oktober 2025.

### Q6
Pesan dari Sinta (21.40): "Katanya kalau lagi bagi dividen harga turun sebanyak dividennya, tapi di Perusahaan U hari ini kok jatuhnya nggak sama ya? Gue ragu nih, takut salah baca."
Kartu:
- Kartu 1 — hitungan dari kartu lain, terbit 4 Mei 2026: Jarak antara penutupan terakhir sebelum tanggal ex dan pembukaan hari ini: Rp1.690 dikurangi Rp1.545 sama dengan Rp145.
- Kartu 2 — daftar aksi korporasi (dividen), terbit 4 Mei 2026: Dividen tunai Rp130 per lembar dengan tanggal ex 4 Mei 2026.
- Kartu 3 — data harga harian bursa, terbit 30 April 2026: Harga penutupan 30 April 2026 adalah Rp1.690 per lembar.
- Kartu 4 — data harga harian bursa, terbit 4 Mei 2026: Harga pembukaan 4 Mei 2026 adalah Rp1.545 per lembar.
Pertanyaan: Omongan Sinta cocok dengan dokumennya?
a) Betul, turunnya hari ini lebih besar dari dividen tunai yang dibagikan.
b) Betul, turunnya hari ini lebih kecil dari dividen tunai yang dibagikan.
c) Keliru, turunnya hari ini persis sama dengan dividen tunai yang dibagikan.
d) Keliru, harga bukanya tidak jatuh dari penutupan terakhir.

### Q7
Pesan dari Fajar (19.50): "Gue denger katanya kalau lagi bagi dividen, harga jatuh sebanyak dividennya. Di Perusahaan U kayaknya pas banget deh, nggak ada selisihnya. Bener nggak sih? Gue ragu nih."
Kartu:
- Kartu 1 — hitungan dari kartu lain, terbit 4 Mei 2026: Jarak antara turunnya harga dan dividen per lembar: Rp145 dikurangi Rp130 sama dengan Rp15.
- Kartu 2 — hitungan dari kartu lain, terbit 4 Mei 2026: Jarak antara penutupan terakhir sebelum tanggal ex dan pembukaan hari ini: Rp1.690 dikurangi Rp1.545 sama dengan Rp145.
- Kartu 3 — daftar aksi korporasi (dividen), terbit 4 Mei 2026: Dividen tunai Rp130 per lembar dengan tanggal ex 4 Mei 2026.
- Kartu 4 — data harga harian bursa, terbit 30 April 2026: Harga penutupan 30 April 2026 adalah Rp1.690 per lembar.
Pertanyaan: Omongan Fajar cocok dengan dokumennya?
a) Betul, jatuhnya hari ini persis sebanyak dividen tunai yang dibagikan.
b) Keliru, jatuhnya hari ini lebih dalam dari dividen tunai yang dibagikan.
c) Betul, jatuhnya hari ini lebih dangkal dari dividen tunai yang dibagikan.
d) Keliru, harganya hari ini nggak jatuh sama sekali dari penutupan terakhir.

### Q8
Pesan dari Wulan (18.35): "Gila, orang dalam Perusahaan U ada 8 laporan sepanjang Januari, dan ada yang isinya jual. Ini pasti ada yang disembunyiin, gue panik nih."
Kartu:
- Kartu 1 — hitungan dari kartu lain, terbit 22 Januari 2026: Laporan kepemilikan orang dalam yang terbit Januari, seluruhnya pembelian: 8 laporan.
- Kartu 2 — hitungan dari kartu lain, terbit 7 Januari 2026: Pemilik terbesar menerbitkan 2 laporan dalam rentang 6 Januari 2026–7 Januari 2026.
- Kartu 3 — hitungan dari kartu lain, terbit 22 Januari 2026: Orang dalam lain menerbitkan 6 laporan dalam rentang 6 Januari 2026–22 Januari 2026.
Pertanyaan: Omongan Wulan cocok dengan dokumennya?
a) Betul, ada juga laporan yang isinya pengurangan saham.
b) Keliru, semua laporan itu isinya penambahan saham.
c) Betul, laporan itu terbitnya cuma dari pemilik terbesar.
d) Keliru, laporan itu terbitnya bukan cuma dari pemilik terbesar.
