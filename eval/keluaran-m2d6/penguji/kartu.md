Bayangkan kamu orang 20-an yang belum pernah beli saham, membaca di ponsel, dan tidak mau berhitung.
Di bawah ada beberapa soal latihan. Tiap soal: seorang teman mengirim pesan di grup obrolan tentang
sebuah saham, lalu ada beberapa kartu (potongan dokumen resmi), pertanyaan, dan empat pilihan.
Tiap soal berdiri sendiri. Untuk tiap soal: cocokkan omongan teman dengan kartunya, pilih satu huruf,
sebutkan nomor kartu yang menentukan jawabanmu, dan tulis kalimat (dari soal) yang membingungkanmu —
kosongkan kalau tidak ada. Jangan memakai alat apa pun dan jangan mencari informasi.
Satu pertanyaan tambahan untuk tiap soal: Adakah bagian pesan teman yang berupa penilaian (aman/bagus/pasti) yang tak bisa dicek dari kartu? Tulis bagian itu di "penilaian" — kosongkan kalau tidak ada.
Balas HANYA dengan JSON berbentuk:
{"jawaban": [{"id": "Q1", "pilihan": "a", "kartu": [1], "bingung": "...", "penilaian": "..."}, ...]}

### Q1
Pesan dari Sari (19.20): "Aku panik, sahamnya kena setop bursa hari ini! Awal tahun juga kena setop, katanya karena harga naik terus."
Kartu:
- Kartu 1 — pengumuman penghentian sementara perdagangan oleh bursa, terbit 10 Desember 2025: Perdagangan saham dihentikan sementara oleh bursa pada 10 Desember 2025. Alasan resmi: Terjadinya peningkatan harga kumulatif yang signifikan pada saham Perusahaan T, dalam rangka cooling down sebagai bentuk perlindungan bagi investor. Kapan perdagangannya dibuka lagi tidak tercatat, jadi lama penghentiannya tidak bisa dipastikan.
- Kartu 2 — pengumuman penghentian sementara perdagangan oleh bursa, terbit 21 Januari 2025: Perdagangan saham dihentikan sementara oleh bursa pada 21 Januari 2025. Alasan resmi: Bursa menilai bahwa terdapat keraguan atas kelangsungan usaha perseroan. Kapan perdagangannya dibuka lagi tidak tercatat, jadi lama penghentiannya tidak bisa dipastikan.
- Kartu 3 — data harga harian bursa, terbit 9 Desember 2025: Harga penutupan 9 Desember 2025 adalah Rp106 per lembar.
Pertanyaan: Omongan Sari cocok dengan dokumennya?
a) Betul, alasan setop awal tahun kenaikan harga.
b) Betul, setop awal tahun tidak dicatat bursa.
c) Keliru, setop awal tahun karena keraguan usaha.
d) Keliru, setop hari ini karena keraguan usaha.

### Q2
Pesan dari Andi (20.45): "Angka 58 rupiah itu bukan harga penutupan, gw yakin itu beda dua penutupan. Gw hafal polanya."
Kartu:
- Kartu 1 — hitungan dari kartu lain, terbit 9 Desember 2025: Kenaikan harga penutupan dari 26 November sampai 9 Desember 2025: Rp106 dikurangi Rp48 sama dengan Rp58.
- Kartu 2 — data harga harian bursa, terbit 26 November 2025: Harga penutupan 26 November 2025 adalah Rp48 per lembar.
- Kartu 3 — data harga harian bursa, terbit 9 Desember 2025: Harga penutupan 9 Desember 2025 adalah Rp106 per lembar.
- Kartu 4 — data harga harian bursa, terbit 1 Desember 2025: Harga penutupan 1 Desember 2025 adalah Rp62 per lembar.
Pertanyaan: Omongan Andi cocok dengan dokumennya?
a) Betul, itu selisih penutupan 1 Desember dan 9 Desember.
b) Keliru, itu harga penutupan 9 Desember.
c) Keliru, itu harga penutupan 1 Desember.
d) Betul, itu selisih penutupan 26 November dan 9 Desember.
