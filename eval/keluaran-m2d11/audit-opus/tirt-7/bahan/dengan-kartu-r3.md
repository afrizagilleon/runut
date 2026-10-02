Kamu ikut menguji soal latihan. Di bawah ada beberapa soal pilihan ganda. Tiap soal: seorang teman
mengirim pesan di grup obrolan tentang sebuah saham; di bawahnya ada kartu (potongan dokumen resmi),
lalu pertanyaan dan empat pilihan. Jawab dari kartu saja. Tiap soal berdiri sendiri. Jangan memakai alat apa pun.
Untuk tiap soal: SALIN teks pilihanmu persis (tanpa huruf di depannya), tulis hurufnya, nomor kartu yang
menentukan, dan di "kunci_lain" huruf pilihan LAIN yang menurut kartu juga benar (kosongkan bila tidak ada).
Balas HANYA dengan JSON berbentuk:
{"jawaban": [{"id": "Q1", "teks": "<salinan persis>", "pilihan": "a", "kartu": [1], "kunci_lain": ""}, ...]}

### Q1
Pesan dari Andi (20.15): "Gw yakin banget harga penutupan Perusahaan T kemarin Rp97."
Kartu:
- Kartu 1 — data harga harian bursa, terbit 9 Desember 2025: Harga penutupan 9 Desember 2025 adalah Rp106 per lembar.
- Kartu 2 — data harga harian bursa, terbit 8 Desember 2025: Harga penutupan 8 Desember 2025 adalah Rp97 per lembar.
Pertanyaan: Omongan Andi cocok dengan dokumennya?
a) Betul, Rp97 itu penutupan tertinggi sebelum hari ini.
b) Keliru, yang tercatat untuk 9 Desember Rp106, bukan Rp97.
c) Betul, penutupan 9 Desember memang Rp97.
d) Keliru, yang tercatat untuk 9 Desember Rp89, bukan Rp97.

### Q2
Pesan dari Tio (20.15): "Harga penutupan 9 Desember masih puluhan rupiah per lembar, jadi harganya belum ke mana-mana. Gw mah santai aja wkwk."
Kartu:
- Kartu 1 — hitungan dari kartu lain, terbit 9 Desember 2025: Dari 26 November 2025 (Rp48) sampai 9 Desember 2025 (Rp106), harga penutupan naik 9 hari bursa berturut-turut, tiap hari lebih tinggi dari hari bursa sebelumnya.
- Kartu 2 — hitungan dari kartu lain, terbit 9 Desember 2025: Kenaikan harga penutupan dari 26 November sampai 9 Desember 2025: Rp106 dikurangi Rp48 sama dengan Rp58.
Pertanyaan: Omongan Tio cocok dengan dokumennya?
a) Keliru, harganya turun tapi 9 Desember masih ratusan rupiah.
b) Betul, harganya turun sampai puluhan rupiah pada 9 Desember.
c) Keliru, harganya naik sampai ratusan rupiah pada 9 Desember.
d) Betul, harganya naik tapi 9 Desember masih puluhan rupiah.

### Q3
Pesan dari Sari (20.15): "Sejak 26 November harga penutupan Perusahaan T udah lebih dari dua kali lipat, ya? Beneran ga sih?"
Kartu:
- Kartu 1 — hitungan dari kartu lain, terbit 9 Desember 2025: Harga penutupan 9 Desember 2025 (Rp106) adalah 2,21 kali harga penutupan 26 November 2025 (Rp48), dibulatkan dua angka di belakang koma.
- Kartu 2 — hitungan dari kartu lain, terbit 9 Desember 2025: Kenaikan harga penutupan dari 26 November sampai 9 Desember 2025: Rp106 dikurangi Rp48 sama dengan Rp58.
Pertanyaan: Omongan Sari cocok dengan dokumennya?
a) Betul, penutupan 9 Desember 2,02 kali penutupan 26 November.
b) Keliru, penutupan 9 Desember malah lebih rendah dari 26 November.
c) Betul, penutupan 9 Desember 2,21 kali penutupan 26 November.
d) Keliru, yang bertambah cuma selisih rupiahnya, bukan dua kali lipat.

