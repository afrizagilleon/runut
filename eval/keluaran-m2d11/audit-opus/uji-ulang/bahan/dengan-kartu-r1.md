Kamu ikut menguji soal latihan. Di bawah ada beberapa soal pilihan ganda. Tiap soal: seorang teman
mengirim pesan di grup obrolan tentang sebuah saham; di bawahnya ada kartu (potongan dokumen resmi),
lalu pertanyaan dan empat pilihan. Jawab dari kartu saja. Tiap soal berdiri sendiri. Jangan memakai alat apa pun.
Untuk tiap soal: SALIN teks pilihanmu persis (tanpa huruf di depannya), tulis hurufnya, nomor kartu yang
menentukan, dan di "kunci_lain" huruf pilihan LAIN yang menurut kartu juga benar (kosongkan bila tidak ada).
Balas HANYA dengan JSON berbentuk:
{"jawaban": [{"id": "Q1", "teks": "<salinan persis>", "pilihan": "a", "kartu": [1], "kunci_lain": ""}, ...]}

### Q1
Pesan dari Rara (19.47): "Harganya udah Rp178 lho. Pemilik terbesarnya aja tenang-tenang, nggak kedengeran jual. Berarti dia yakin harganya masih bakal naik."
Kartu:
- Kartu 1 — api, terbit 25 Agustus 2025: Karya Permata Inovasi Indonesia melaporkan penjualan 70.000.000 lembar pada harga Rp13 atas transaksi 12 Agustus 2025, dilaporkan 25 Agustus 2025. Kepemilikan tercatat berubah dari 4.662.137.600 menjadi 4.592.137.600 lembar.
- Kartu 2 — api, terbit 25 Agustus 2025: Karya Permata Inovasi Indonesia melaporkan penjualan 179.500.000 lembar pada harga Rp14 atas transaksi 13 Agustus 2025, dilaporkan 25 Agustus 2025. Kepemilikan tercatat berubah dari 4.592.137.600 menjadi 4.412.637.600 lembar.
- Kartu 3 — api, terbit 1 September 2025: Karya Permata Inovasi Indonesia melaporkan penjualan 50.000.000 lembar pada harga Rp15 atas transaksi 14 Agustus 2025, dilaporkan 1 September 2025. Kepemilikan tercatat berubah dari 4.412.637.600 menjadi 4.362.637.600 lembar.
- Kartu 4 — hitungan dari kartu lain, terbit 1 September 2025: Penjumlahan 3 laporan pengendali yang lolos seluruh aturan verifikasi: 70.000.000 + 179.500.000 + 50.000.000 = 299.500.000 lembar. Laporan yang tersangkut temuan tidak ikut dijumlahkan.
Pertanyaan: Omongan Rara cocok dengan dokumennya?
a) Keliru, laporannya menunjukkan ia menjual banyak di harga ratusan rupiah.
b) Betul, laporannya menunjukkan ia membeli lagi di harga belasan rupiah.
c) Betul, laporannya menunjukkan ia membeli lagi di harga ratusan rupiah.
d) Keliru, laporannya menunjukkan ia menjual banyak di harga belasan rupiah.

### Q2
Pesan dari Nadia (17.58): "Saham U dibuka anjlok Rp145, padahal dividennya Rp45. Pasti ada kabar buruk!"
Kartu:
- Kartu 1 — api, terbit 4 Mei 2026: Dividen tunai Rp130 per lembar dengan tanggal ex 4 Mei 2026.
- Kartu 2 — hitungan dari kartu lain, terbit 4 Mei 2026: Jarak antara penutupan terakhir sebelum tanggal ex dan pembukaan hari ini: Rp1.690 dikurangi Rp1.545 sama dengan Rp145.
Pertanyaan: Omongan Nadia cocok dengan dokumennya?
a) Keliru, dividennya Rp160, bukan Rp45.
b) Betul, dividennya memang cuma Rp45 per lembar.
c) Keliru, dividennya Rp130, bukan Rp45.
d) Betul, turunnya lebih dari tiga kali dividennya.

### Q3
Pesan dari Nadia (19.47): "Gila gue panik, Perusahaan T udah naik 2,21 kali dari 26 November! Ini gara-gara ada yang ngeborong gede ya? Gue takut banget kejebak."
Kartu:
- Kartu 1 — data harga harian bursa, terbit 26 November 2025: Harga penutupan 26 November 2025 adalah Rp48 per lembar.
- Kartu 2 — data harga harian bursa, terbit 9 Desember 2025: Harga penutupan 9 Desember 2025 adalah Rp106 per lembar.
- Kartu 3 — hitungan dari kartu lain, terbit 9 Desember 2025: Harga penutupan 9 Desember 2025 (Rp106) adalah 2,21 kali harga penutupan 26 November 2025 (Rp48), dibulatkan dua angka di belakang koma.
- Kartu 4 — pengumuman penghentian sementara perdagangan oleh bursa, terbit 10 Desember 2025: Perdagangan saham dihentikan sementara oleh bursa pada 10 Desember 2025. Alasan resmi: Terjadinya peningkatan harga kumulatif yang signifikan pada saham Perusahaan T, dalam rangka cooling down sebagai bentuk perlindungan bagi investor. Tanggal pencabutan penghentian ini tidak ada di data, jadi lamanya tidak bisa dipastikan dari sumber mana pun yang dipakai kasus ini.
Pertanyaan: Omongan Nadia cocok dengan dokumennya?
a) Keliru, penutupan terakhir masih di bawah penutupan akhir November, jadi belum naik.
b) Betul, 2,21 kali itu dari penutupan dibanding penutupan, jadi naiknya nyata.
c) Betul, 2,21 kali itu dari harga pembukaan, jadi wajar panik.
d) Keliru, 2,21 kali itu jumlah lembar yang ditransaksikan, bukan harga.

### Q4
Pesan dari Fajar (19.50): "Gue denger katanya kalau lagi bagi dividen, harga jatuh sebanyak dividennya. Di Perusahaan U kayaknya pas banget deh, nggak ada selisihnya. Bener nggak sih? Gue ragu nih."
Kartu:
- Kartu 1 — hitungan dari kartu lain, terbit 4 Mei 2026: Jarak antara turunnya harga dan dividen per lembar: Rp145 dikurangi Rp130 sama dengan Rp15.
- Kartu 2 — hitungan dari kartu lain, terbit 4 Mei 2026: Jarak antara penutupan terakhir sebelum tanggal ex dan pembukaan hari ini: Rp1.690 dikurangi Rp1.545 sama dengan Rp145.
- Kartu 3 — daftar aksi korporasi (dividen), terbit 4 Mei 2026: Dividen tunai Rp130 per lembar dengan tanggal ex 4 Mei 2026.
- Kartu 4 — data harga harian bursa, terbit 30 April 2026: Harga penutupan 30 April 2026 adalah Rp1.690 per lembar.
Pertanyaan: Omongan Fajar cocok dengan dokumennya?
a) Keliru, harganya hari ini nggak jatuh sama sekali dari penutupan terakhir.
b) Betul, jatuhnya hari ini persis sebanyak dividen tunai yang dibagikan.
c) Keliru, jatuhnya hari ini lebih dalam dari dividen tunai yang dibagikan.
d) Betul, jatuhnya hari ini lebih dangkal dari dividen tunai yang dibagikan.

### Q5
Pesan dari Wulan (18.35): "Gila, orang dalam Perusahaan U ada 8 laporan sepanjang Januari, dan ada yang isinya jual. Ini pasti ada yang disembunyiin, gue panik nih."
Kartu:
- Kartu 1 — hitungan dari kartu lain, terbit 22 Januari 2026: Laporan kepemilikan orang dalam yang terbit Januari, seluruhnya pembelian: 8 laporan.
- Kartu 2 — hitungan dari kartu lain, terbit 7 Januari 2026: Pemilik terbesar menerbitkan 2 laporan dalam rentang 6 Januari 2026–7 Januari 2026.
- Kartu 3 — hitungan dari kartu lain, terbit 22 Januari 2026: Orang dalam lain menerbitkan 6 laporan dalam rentang 6 Januari 2026–22 Januari 2026.
Pertanyaan: Omongan Wulan cocok dengan dokumennya?
a) Keliru, laporan itu terbitnya bukan cuma dari pemilik terbesar.
b) Betul, ada juga laporan yang isinya pengurangan saham.
c) Keliru, semua laporan itu isinya penambahan saham.
d) Betul, laporan itu terbitnya cuma dari pemilik terbesar.

