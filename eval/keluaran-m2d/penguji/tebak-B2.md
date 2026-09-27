Kamu ikut menguji soal latihan. Di bawah ada beberapa soal pilihan ganda. Tiap soal: seorang teman
mengirim pesan di grup obrolan tentang sebuah saham, lalu ada pertanyaan dan empat pilihan.
Kamu TIDAK diberi dokumen apa pun. Jawab dengan tebakan terbaikmu dari pesan dan pilihannya saja.
Tiap soal berdiri sendiri. Untuk tiap soal beri: huruf pilihanmu (a/b/c/d) dan seberapa yakin kamu
bahwa pilihanmu benar (0-100). Jangan memakai alat apa pun dan jangan mencari informasi.
Balas HANYA dengan JSON berbentuk:
{"jawaban": [{"id": "Q1", "pilihan": "a", "yakin": 50}, ...]}

### Q1
Pesan dari Iqbal (21.05): "Katanya dividen Perusahaan D gede banget, punya 10 lot dapat Rp140 ribu. Bener nggak sih kabarnya?"
Pertanyaan: Omongan Iqbal cocok dengan dokumennya?
a) Betul, dividen tunai memang dibagikan sebesar itu untuk pemegang 10 lot.
b) Keliru, soalnya 10 lot itu 100 lembar, bukan 1.000 lembar.
c) Betul, laporan korporasi memang mencatat pembayaran dividen sebesar itu.
d) Keliru, hitungannya 1.000 lembar × Rp0,14 = Rp140 sebelum pajak.

### Q2
Pesan dari Aji (16.20): "Eh, hari ini ex dividen tunai Perusahaan U. Katanya harga buka turun persis sebesar dividenya, Rp130 per lembar. Jadi pemegang saham gak rugi apa-apa dong."
Pertanyaan: Omongan Aji cocok dengan dokumennya?
a) Betul, ex dividen hari ini Rp130, wajar harga buka turun sebesar itu.
b) Keliru, harga buka turun Rp145 per lembar, lebih besar dari dividenya.
c) Betul, pembukaan hari ini Rp1.545, turun pas sebesar dividen tunai.
d) Keliru, dividen dibayar dari kas perusahaan, bukan dipotong dari harga saham di bursa.

### Q3
Pesan dari Gilang (20.15): "Suspend 21 Januari 2025 itu alasannya sama dong kayak yang sekarang, gara-gara harga naik juga kan?"
Pertanyaan: Omongan Gilang cocok dengan dokumennya?
a) Betul, alasan penghentian 21 Januari 2025 sama dengan yang sekarang
b) Keliru, penghentian 21 Januari 2025 karena keraguan kelangsungan usaha
c) Betul, yang 21 Januari 2025 itu juga karena harga naik kumulatif
d) Keliru, yang 21 Januari 2025 itu karena harganya turun tajam

### Q4
Pesan dari Sari (19.05): "Btw sepanjang Januari orang dalam Perusahaan U pada beli saham sendiri lho. Ada 8 laporan kepemilikan, semuanya pembelian, gak ada satu pun yang jual."
Pertanyaan: Omongan Sari cocok dengan dokumennya?
a) Betul, ada 8 laporan orang dalam sepanjang Januari dan semuanya pembelian.
b) Keliru, yang melapor hanya pemilik terbesar; orang dalam lain tidak melapor di Januari.
c) Betul, orang dalam memang membeli, tetapi setengah laporannya adalah penjualan.
d) Keliru, tidak ada laporan kepemilikan orang dalam yang terbit pada bulan Januari.

### Q5
Pesan dari Fajar (19.12): "Woi cek dong, saham Perusahaan D katanya dari Rp8 per lembar tanggal 1 Agustus 2025 tembus Rp178 per lembar tanggal 8 Oktober 2025? Serius itu?"
Pertanyaan: Omongan Fajar cocok dengan dokumennya?
a) Betul, harga penutupannya memang naik dari Rp8 jadi Rp178 sesuai data harga bursa.
b) Keliru, data harga bursa tidak menunjukkan kenaikan seperti itu pada periode ini.
c) Betul, tapi angka itu bukan data resmi karena bursa belum menerbitkan datanya.
d) Keliru, yang melonjak bukan harga melainkan volume perdagangan hari ini saja.

### Q6
Pesan dari Nadia (20.47): "Gila, katanya pemilik terbesar Perusahaan D udah buang 500 juta lembar sahamnya. Kata orang dalam beneran segitu, gimana ceknya?"
Pertanyaan: Omongan Nadia cocok dengan dokumennya?
a) Betul, laporan kepemilikan memang mencatat penjualan sebesar itu dari pemilik terbesar.
b) Keliru, laporan yang tercatat totalnya 299,5 juta lembar, bukan 500 juta lembar.
c) Betul, karena pemilik terbesar memang boleh menjual kapan saja tanpa laporan.
d) Keliru, pemilik terbesar tidak menjual satu lembar pun menurut laporan publik.

### Q7
Pesan dari Nadia (21.07): "Volume hari ini katanya 1.461.200 lembar, rame banget berarti banyak yang masuk. Cek dong."
Pertanyaan: Omongan Nadia cocok dengan dokumennya?
a) Betul, volume 1.461.200 lembar itu tercatat hari ini
b) Keliru, volume hari ini 0 lembar karena perdagangannya dihentikan
c) Betul, 1.461.200 lembar itu volume terakhir sebelum perdagangan dihentikan
d) Keliru, 1.461.200 lembar itu tercatat pada 10 Desember 2025

### Q8
Pesan dari Wulan (21.40): "Aneh, katanya Perusahaan U rajin bagi dividen. Tahun lalu cuma Rp25 per lembar, sekarang tiba-tiba Rp130. Kok bisa lompat segitu sih?"
Pertanyaan: Omongan Wulan cocok dengan dokumennya?
a) Betul, dividen naik dari Rp25 ke Rp130 dalam satu tahun terakhir.
b) Betul, tahun ini dividen Rp130 dan tahun lalu memang Rp25.
c) Keliru, ini pembagian dividen tunai pertama sejak perusahaan tercatat di bursa.
d) Keliru, dividen tahun lalu Rp45 per lembar, bukan Rp25.

### Q9
Pesan dari Sinta (19.42): "Eh, saham Perusahaan T katanya dihentikan sementara hari ini gara-gara harganya naik 9 hari bursa berturut-turut. Bener nggak sih?"
Pertanyaan: Omongan Sinta cocok dengan dokumennya?
a) Betul, bursa menghentikannya 10 Desember 2025 karena harga naik kumulatif
b) Keliru, penghentian itu karena keraguan atas kelangsungan usaha perseroan
c) Betul, penghentiannya ini menyusul rapat umum pemegang saham 25 September 2025
d) Keliru, harganya justru turun 58 rupiah dalam sembilan hari bursa
