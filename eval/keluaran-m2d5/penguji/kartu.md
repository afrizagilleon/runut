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
Pesan dari Sari (19.32): "Gw udah hafal polanya, dari 26 November sampe 9 Desember harganya naik 58 rupiah. Itu angka pastinya."
Kartu:
- Kartu 1 — hitungan dari kartu lain, terbit 9 Desember 2025: Kenaikan harga penutupan dari 26 November sampai 9 Desember 2025: Rp106 dikurangi Rp48 sama dengan Rp58.
- Kartu 2 — data harga harian bursa, terbit 26 November 2025: Harga penutupan 26 November 2025 adalah Rp48 per lembar.
- Kartu 3 — data harga harian bursa, terbit 9 Desember 2025: Harga penutupan 9 Desember 2025 adalah Rp106 per lembar.
- Kartu 4 — hitungan dari kartu lain, terbit 9 Desember 2025: Dari 26 November 2025 (Rp48) sampai 9 Desember 2025 (Rp106), harga penutupan naik 9 hari bursa berturut-turut, tiap hari lebih tinggi dari hari bursa sebelumnya.
Pertanyaan: Omongan Sari cocok dengan dokumennya?
a) Keliru, kenaikan periode itu tidak pernah dihitung.
b) Betul, angka itu kenaikan sejak awal tahun, bukan periode itu.
c) Keliru, harga dua tanggal itu tidak tercatat di mana pun.
d) Betul, kenaikan periode itu memang Rp58.

### Q2
Pesan dari Nia (22.14): "Kayaknya hasil putusan rapat pemegang saham 25 September 2025 ada di catatan resmi ya?"
Kartu:
- Kartu 1 — daftar aksi korporasi (rapat umum pemegang saham), terbit 25 September 2025: Rapat umum pemegang saham dijadwalkan 25 September 2025. Isi keputusan rapatnya tidak tercatat di sini.
- Kartu 2 — pengumuman penghentian sementara perdagangan oleh bursa, terbit 10 Desember 2025: Perdagangan saham dihentikan sementara oleh bursa pada 10 Desember 2025. Alasan resmi: Terjadinya peningkatan harga kumulatif yang signifikan pada saham Perusahaan T, dalam rangka cooling down sebagai bentuk perlindungan bagi investor. Kapan perdagangannya dibuka lagi tidak tercatat, jadi lama penghentiannya tidak bisa dipastikan.
Pertanyaan: Omongan Nia cocok dengan dokumennya?
a) Betul, hasil putusannya tercatat di dokumen.
b) Betul, hasil putusannya ada di catatan resmi.
c) Keliru, rapat itu tidak dijadwalkan.
d) Keliru, hasil putusannya tidak tercatat di dokumen.

### Q3
Pesan dari Rian (20.11): "Gw yakin Januari 2025 saham ini udah pernah disetop juga, dan alasannya beda dari yang sekarang."
Kartu:
- Kartu 1 — pengumuman penghentian sementara perdagangan oleh bursa, terbit 10 Desember 2025: Perdagangan saham dihentikan sementara oleh bursa pada 10 Desember 2025. Alasan resmi: Terjadinya peningkatan harga kumulatif yang signifikan pada saham Perusahaan T, dalam rangka cooling down sebagai bentuk perlindungan bagi investor. Kapan perdagangannya dibuka lagi tidak tercatat, jadi lama penghentiannya tidak bisa dipastikan.
- Kartu 2 — pengumuman penghentian sementara perdagangan oleh bursa, terbit 21 Januari 2025: Perdagangan saham dihentikan sementara oleh bursa pada 21 Januari 2025. Alasan resmi: Bursa menilai bahwa terdapat keraguan atas kelangsungan usaha perseroan. Kapan perdagangannya dibuka lagi tidak tercatat, jadi lama penghentiannya tidak bisa dipastikan.
Pertanyaan: Omongan Rian cocok dengan dokumennya?
a) Keliru, tidak ada penghentian saham di awal tahun itu.
b) Betul, penghentian Januari 2025 beralasan kenaikan harga kumulatif.
c) Betul, penghentian Januari 2025 beralasan keraguan kelangsungan usaha.
d) Keliru, penghentian Januari 2025 tidak mencatat alasan resmi apa pun.
