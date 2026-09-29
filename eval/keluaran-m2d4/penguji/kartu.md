Bayangkan kamu orang 20-an yang belum pernah beli saham, membaca di ponsel, dan tidak mau berhitung.
Di bawah ada beberapa soal latihan. Tiap soal: seorang teman mengirim pesan di grup obrolan tentang
sebuah saham, lalu ada beberapa kartu (potongan dokumen resmi), pertanyaan, dan empat pilihan.
Tiap soal berdiri sendiri. Untuk tiap soal: cocokkan omongan teman dengan kartunya, pilih satu huruf,
sebutkan nomor kartu yang menentukan jawabanmu, dan tulis kalimat (dari soal) yang membingungkanmu —
kosongkan kalau tidak ada. Jangan memakai alat apa pun dan jangan mencari informasi.
Balas HANYA dengan JSON berbentuk:
{"jawaban": [{"id": "Q1", "pilihan": "a", "kartu": [1], "bingung": "..."}, ...]}

### Q1
Pesan dari Wulan (19.42): "Dividen Perusahaan U tuh tiap tahun keluar terus, dari dulu ga pernah bolos. Aman lah."
Kartu:
- Kartu 1 — hitungan dari kartu lain, terbit 4 Mei 2026: Tahun yang tercatat punya pembagian dividen tunai, beruntun tanpa lompatan: 7 tahun.
- Kartu 2 — daftar aksi korporasi (dividen), terbit 4 Mei 2026: Daftar aksi korporasi mencatat 7 pembagian dividen tunai, dari tanggal ex 3 September 2020 sampai 4 Mei 2026. Daftar itu sendiri tidak bisa dibuktikan habis, jadi yang tercatat bukan tentu saja yang pernah terjadi.
- Kartu 3 — daftar aksi korporasi (dividen), terbit 1 September 2021: Dividen tunai Rp85 per lembar dengan tanggal ex 1 September 2021.
- Kartu 4 — daftar aksi korporasi (dividen), terbit 4 Agustus 2022: Dividen tunai Rp25 per lembar dengan tanggal ex 4 Agustus 2022.
Pertanyaan: Omongan Wulan cocok dengan dokumennya?
a) Betul, dividennya makin besar tiap tahun tanpa kecuali.
b) Keliru, ada tahun yang bolos tanpa pembagian dividen.
c) Betul, pembagiannya tercatat beruntun selama 7 tahun.
d) Keliru, yang tercatat cuma pembagian tahun ini saja.

### Q2
Pesan dari Nadia (21.30): "Gw udah baca semua laporannya dari awal, pemilik terbesar jualan di 3 laporan dan transaksinya semua di Agustus."
Kartu:
- Kartu 1 — hitungan dari kartu lain, terbit 1 September 2025: Laporan penjualan pemilik terbesar yang lolos seluruh pemeriksaan: 3 laporan.
- Kartu 2 — laporan kepemilikan saham yang diumumkan ke publik, terbit 25 Agustus 2025: Pemilik terbesar melaporkan penjualan 70.000.000 lembar atas transaksi 12 Agustus 2025, dilaporkan 25 Agustus 2025. Kepemilikan tercatat berubah dari 4.662.137.600 menjadi 4.592.137.600 lembar, yaitu dari 62,73 persen menjadi 61,788 persen saham.
- Kartu 3 — laporan kepemilikan saham yang diumumkan ke publik, terbit 25 Agustus 2025: Pemilik terbesar melaporkan penjualan 179.500.000 lembar atas transaksi 13 Agustus 2025, dilaporkan 25 Agustus 2025. Kepemilikan tercatat berubah dari 4.592.137.600 menjadi 4.412.637.600 lembar, yaitu dari 61,79 persen menjadi 59,375 persen saham.
- Kartu 4 — laporan kepemilikan saham yang diumumkan ke publik, terbit 1 September 2025: Pemilik terbesar melaporkan penjualan 50.000.000 lembar atas transaksi 14 Agustus 2025, dilaporkan 1 September 2025. Kepemilikan tercatat berubah dari 4.412.637.600 menjadi 4.362.637.600 lembar, yaitu dari 59,38 persen menjadi 58,7 persen saham.
Pertanyaan: Omongan Nadia cocok dengan dokumennya?
a) Betul, ketiga laporan itu terbit di hari yang sama.
b) Betul, ketiga transaksinya tercatat 12 Agustus sampai 14 Agustus.
c) Keliru, cuma dua laporan penjualan yang tercatat.
d) Keliru, transaksi terakhirnya jatuh 1 September.

### Q3
Pesan dari Tio (19.05): "Yang disetop hari ini pasti gara-gara naiknya udah kelewat batas, bukan karena usaha mereka bermasalah."
Kartu:
- Kartu 1 — pengumuman penghentian sementara perdagangan oleh bursa, terbit 10 Desember 2025: Perdagangan saham dihentikan sementara oleh bursa pada 10 Desember 2025. Alasan resmi: Terjadinya peningkatan harga kumulatif yang signifikan pada saham Perusahaan T, dalam rangka cooling down sebagai bentuk perlindungan bagi investor. Tanggal pencabutan penghentian ini tidak ada di data, jadi lamanya tidak bisa dipastikan dari sumber mana pun yang dipakai kasus ini.
- Kartu 2 — pengumuman penghentian sementara perdagangan oleh bursa, terbit 21 Januari 2025: Perdagangan saham dihentikan sementara oleh bursa pada 21 Januari 2025. Alasan resmi: Bursa menilai bahwa terdapat keraguan atas kelangsungan usaha perseroan. Tanggal pencabutan penghentian ini tidak ada di data, jadi lamanya tidak bisa dipastikan dari sumber mana pun yang dipakai kasus ini.
- Kartu 3 — hitungan dari kartu lain, terbit 9 Desember 2025: Harga penutupan 9 Desember 2025 (Rp106) adalah 2,21 kali harga penutupan 26 November 2025 (Rp48), dibulatkan dua angka di belakang koma.
- Kartu 4 — hitungan dari kartu lain, terbit 9 Desember 2025: Dari 26 November 2025 (Rp48) sampai 9 Desember 2025 (Rp106), harga penutupan naik 9 hari bursa berturut-turut, tiap hari lebih tinggi dari hari bursa sebelumnya.
Pertanyaan: Omongan Tio cocok dengan dokumennya?
a) Betul, hari ini disetop karena kenaikan harga kumulatif.
b) Keliru, hari ini disetop karena keraguan kelangsungan usaha.
c) Betul, hari ini disetop karena volume perdagangan nol.
d) Keliru, hari ini disetop karena harga turun tajam.

### Q4
Pesan dari Fitri (21.15): "Katanya orang dalam Perusahaan U pada beli saham terus bulan Januari, ga ada yang jual. Aku ikut-ikutan percaya aja sih."
Kartu:
- Kartu 1 — hitungan dari kartu lain, terbit 22 Januari 2026: Laporan kepemilikan orang dalam yang terbit Januari, seluruhnya pembelian: 8 laporan.
- Kartu 2 — hitungan dari kartu lain, terbit 22 Januari 2026: Orang dalam lain menerbitkan 6 laporan dalam rentang 6 Januari 2026–22 Januari 2026.
- Kartu 3 — hitungan dari kartu lain, terbit 7 Januari 2026: Pemilik terbesar menerbitkan 2 laporan dalam rentang 6 Januari 2026–7 Januari 2026.
Pertanyaan: Omongan Fitri cocok dengan dokumennya?
a) Betul, semuanya pembelian tanpa ada yang jual.
b) Keliru, ada juga laporan yang isinya penjualan.
c) Betul, yang beli cuma orang dalam lain.
d) Keliru, laporannya cuma dua laporan.

### Q5
Pesan dari Adit (20.15): "Gw baru cek, saham D naik 22 kali lipat. Serius, gw ga ngarang, angkanya segitu."
Kartu:
- Kartu 1 — data harga harian bursa, terbit 1 Agustus 2025: Harga penutupan 1 Agustus 2025 adalah Rp8 per lembar.
- Kartu 2 — data harga harian bursa, terbit 7 Oktober 2025: Harga penutupan 7 Oktober 2025 adalah Rp162 per lembar.
- Kartu 3 — data harga harian bursa, terbit 8 Oktober 2025: Harga penutupan 8 Oktober 2025 adalah Rp178 per lembar.
- Kartu 4 — hitungan dari kartu lain, terbit 8 Oktober 2025: Harga penutupan 8 Oktober 2025 (Rp178) adalah 22,25 kali harga penutupan 1 Agustus 2025 (Rp8), dibulatkan dua angka di belakang koma.
Pertanyaan: Omongan Adit cocok dengan dokumennya?
a) Betul, dari penutupan 1 Agustus ke penutupan 8 Oktober.
b) Betul, dari penutupan 1 Agustus ke penutupan 7 Oktober.
c) Keliru, angkanya cuma 2,25 kali dari patokan itu.
d) Keliru, patokan awalnya penutupan 7 Oktober.

### Q6
Pesan dari Sinta (20.15): "Aku masih ragu sih, yang disetop 21 Januari itu alasannya kelangsungan usaha ya?"
Kartu:
- Kartu 1 — pengumuman penghentian sementara perdagangan oleh bursa, terbit 21 Januari 2025: Perdagangan saham dihentikan sementara oleh bursa pada 21 Januari 2025. Alasan resmi: Bursa menilai bahwa terdapat keraguan atas kelangsungan usaha perseroan. Tanggal pencabutan penghentian ini tidak ada di data, jadi lamanya tidak bisa dipastikan dari sumber mana pun yang dipakai kasus ini.
- Kartu 2 — pengumuman penghentian sementara perdagangan oleh bursa, terbit 10 Desember 2025: Perdagangan saham dihentikan sementara oleh bursa pada 10 Desember 2025. Alasan resmi: Terjadinya peningkatan harga kumulatif yang signifikan pada saham Perusahaan T, dalam rangka cooling down sebagai bentuk perlindungan bagi investor. Tanggal pencabutan penghentian ini tidak ada di data, jadi lamanya tidak bisa dipastikan dari sumber mana pun yang dipakai kasus ini.
- Kartu 3 — hitungan dari kartu lain, terbit 9 Desember 2025: Dari 26 November 2025 (Rp48) sampai 9 Desember 2025 (Rp106), harga penutupan naik 9 hari bursa berturut-turut, tiap hari lebih tinggi dari hari bursa sebelumnya.
Pertanyaan: Omongan Sinta cocok dengan dokumennya?
a) Betul, Januari dihentikan karena keraguan kelangsungan usaha.
b) Keliru, Januari dihentikan karena kenaikan harga kumulatif.
c) Betul, Januari dihentikan karena volume perdagangan nol.
d) Keliru, Januari dihentikan karena harga turun tajam.

### Q7
Pesan dari Sinta (20.31): "Orang dalam lain itu beli terus sepanjang Januari, malah lebih banyak dari pemilik terbesarnya. Gw sih udah cek laporannya."
Kartu:
- Kartu 1 — hitungan dari kartu lain, terbit 22 Januari 2026: Orang dalam lain menambah 16.069.900 lembar lewat 6 laporan yang terbit 6 Januari 2026–22 Januari 2026.
- Kartu 2 — hitungan dari kartu lain, terbit 7 Januari 2026: Pemilik terbesar menambah 1.000.000 lembar lewat 2 laporan yang terbit 6 Januari 2026–7 Januari 2026.
- Kartu 3 — hitungan dari kartu lain, terbit 22 Januari 2026: Orang dalam lain menerbitkan 6 laporan dalam rentang 6 Januari 2026–22 Januari 2026.
- Kartu 4 — hitungan dari kartu lain, terbit 7 Januari 2026: Pemilik terbesar menerbitkan 2 laporan dalam rentang 6 Januari 2026–7 Januari 2026.
Pertanyaan: Omongan Sinta cocok dengan dokumennya?
a) Betul, dia nambah 16,07 juta lembar sepanjang Januari.
b) Keliru, yang nambah lebih banyak justru pemilik terbesarnya.
c) Betul, dia nambahnya cuma lewat 2 laporan.
d) Keliru, dia cuma menambah 1 juta lembar.
