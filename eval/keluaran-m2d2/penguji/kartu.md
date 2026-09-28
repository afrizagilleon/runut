Bayangkan kamu orang 20-an yang belum pernah beli saham, membaca di ponsel, dan tidak mau berhitung.
Di bawah ada beberapa soal latihan. Tiap soal: seorang teman mengirim pesan di grup obrolan tentang
sebuah saham, lalu ada beberapa kartu (potongan dokumen resmi), pertanyaan, dan empat pilihan.
Tiap soal berdiri sendiri. Untuk tiap soal: cocokkan omongan teman dengan kartunya, pilih satu huruf,
sebutkan nomor kartu yang menentukan jawabanmu, dan tulis kalimat (dari soal) yang membingungkanmu —
kosongkan kalau tidak ada. Jangan memakai alat apa pun dan jangan mencari informasi.
Balas HANYA dengan JSON berbentuk:
{"jawaban": [{"id": "Q1", "pilihan": "a", "kartu": [1], "bingung": "..."}, ...]}

### Q1
Pesan dari Sinta (18.05): "Gue baca pemilik terbesar jual 70.000.000 lembar, terus 179.500.000 lembar, terus 50.000.000 lembar. Habis itu dia masih pegang 58,7 persen. Berarti dia masih mayoritas dong."
Kartu:
- Kartu 1 — laporan kepemilikan saham yang diumumkan ke publik, terbit 25 Agustus 2025: Pemilik terbesar melaporkan penjualan 70.000.000 lembar atas transaksi 12 Agustus 2025, dilaporkan 25 Agustus 2025. Kepemilikan tercatat berubah dari 4.662.137.600 menjadi 4.592.137.600 lembar, yaitu dari 62,73 persen menjadi 61,788 persen saham.
- Kartu 2 — laporan kepemilikan saham yang diumumkan ke publik, terbit 25 Agustus 2025: Pemilik terbesar melaporkan penjualan 179.500.000 lembar atas transaksi 13 Agustus 2025, dilaporkan 25 Agustus 2025. Kepemilikan tercatat berubah dari 4.592.137.600 menjadi 4.412.637.600 lembar, yaitu dari 61,79 persen menjadi 59,375 persen saham.
- Kartu 3 — laporan kepemilikan saham yang diumumkan ke publik, terbit 1 September 2025: Pemilik terbesar melaporkan penjualan 50.000.000 lembar atas transaksi 14 Agustus 2025, dilaporkan 1 September 2025. Kepemilikan tercatat berubah dari 4.412.637.600 menjadi 4.362.637.600 lembar, yaitu dari 59,38 persen menjadi 58,7 persen saham.
Pertanyaan: Omongan Sinta cocok dengan dokumennya?
a) Betul, setelah rangkaian penjualan, pemilik terbesar masih pegang 58,7 persen saham.
b) Keliru, penjualan 179.500.000 lembar bikin dia tak lagi mayoritas.
c) Betul, penjualan terakhir 50.000.000 lembar adalah yang terbesar dari tiga laporan.
d) Keliru, yang terakhir tercatat 59,375 persen, bukan angka yang disebut.

### Q2
Pesan dari Gilang (19.15): "Gue cek data harian, saham ini naiknya pelan banget, sehari cuma naik dikit-dikit. Nggak heran lama-lama disetop juga."
Kartu:
- Kartu 1 — data harga harian bursa, terbit 26 November 2025: Harga penutupan 26 November 2025 adalah Rp48 per lembar.
- Kartu 2 — data harga harian bursa, terbit 9 Desember 2025: Harga penutupan 9 Desember 2025 adalah Rp106 per lembar.
- Kartu 3 — hitungan dari kartu lain, terbit 9 Desember 2025: Dari 26 November 2025 (Rp48) sampai 9 Desember 2025 (Rp106), harga penutupan naik 9 hari bursa berturut-turut, tiap hari lebih tinggi dari hari bursa sebelumnya.
- Kartu 4 — pengumuman penghentian sementara perdagangan oleh bursa, terbit 10 Desember 2025: Perdagangan saham dihentikan sementara oleh bursa pada 10 Desember 2025. Alasan resmi: Terjadinya peningkatan harga kumulatif yang signifikan pada saham Perusahaan T, dalam rangka cooling down sebagai bentuk perlindungan bagi investor. Tanggal pencabutan penghentian ini tidak ada di data, jadi lamanya tidak bisa dipastikan dari sumber mana pun yang dipakai kasus ini.
Pertanyaan: Omongan Gilang cocok dengan dokumennya?
a) Betul, naiknya memang pelan tapi beruntun, dan itu yang bikin disetop.
b) Keliru, naiknya cuma sehari lalu langsung disetop bursa.
c) Betul, setopnya karena naiknya pelan tapi jalan terus tanpa henti.
d) Keliru, setopnya karena keraguan atas kelangsungan usaha perseroan.

### Q3
Pesan dari Sari (17.20): "Gue baca data harian. Harga cuma naik 2,21 persen dari 48 ke 106. Jadi setopnya kayak nggak masuk akal."
Kartu:
- Kartu 1 — hitungan dari kartu lain, terbit 9 Desember 2025: Harga penutupan 9 Desember 2025 (Rp106) adalah 2,21 kali harga penutupan 26 November 2025 (Rp48), dibulatkan dua angka di belakang koma.
- Kartu 2 — data harga harian bursa, terbit 26 November 2025: Harga penutupan 26 November 2025 adalah Rp48 per lembar.
- Kartu 3 — data harga harian bursa, terbit 9 Desember 2025: Harga penutupan 9 Desember 2025 adalah Rp106 per lembar.
- Kartu 4 — pengumuman penghentian sementara perdagangan oleh bursa, terbit 10 Desember 2025: Perdagangan saham dihentikan sementara oleh bursa pada 10 Desember 2025. Alasan resmi: Terjadinya peningkatan harga kumulatif yang signifikan pada saham Perusahaan T, dalam rangka cooling down sebagai bentuk perlindungan bagi investor. Tanggal pencabutan penghentian ini tidak ada di data, jadi lamanya tidak bisa dipastikan dari sumber mana pun yang dipakai kasus ini.
Pertanyaan: Omongan Sari cocok dengan dokumennya?
a) Betul, kenaikannya memang cuma 2,21 persen dari 48.
b) Keliru, sebab 106 itu 2,21 kali 48, bukan persen.
c) Betul, sebab setopnya memang cuma karena harga naik.
d) Keliru, sebab setopnya karena keraguan atas kelangsungan usaha.
