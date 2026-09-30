Bayangkan kamu orang 20-an yang belum pernah beli saham, membaca di ponsel, dan tidak mau berhitung.
Di bawah ada beberapa soal latihan. Tiap soal: seorang teman mengirim pesan di grup obrolan tentang
sebuah saham, lalu ada beberapa kartu (potongan dokumen resmi), pertanyaan, dan empat pilihan.
Tiap soal berdiri sendiri. Untuk tiap soal: cocokkan omongan teman dengan kartunya, pilih satu huruf,
sebutkan nomor kartu yang menentukan jawabanmu, dan tulis kalimat (dari soal) yang membingungkanmu —
kosongkan kalau tidak ada. Jangan memakai alat apa pun dan jangan mencari informasi.
Satu pertanyaan tambahan untuk tiap soal: Adakah bagian pesan teman yang berupa penilaian (aman/bagus/pasti) yang tak bisa dicek dari kartu? Tulis bagian itu di "penilaian" — kosongkan kalau tidak ada.
Daftar periksa untuk tiap soal, dijawab dari kartu saja:
- "kunci_lain": menurut kartu, adakah pilihan LAIN selain pilihanmu yang juga benar? Tulis hurufnya; kosongkan kalau tidak ada.
- "tak_tercek": adakah bagian klaim teman yang tidak bisa dicek (dibenarkan atau dibantah) dari kartu? Kutip bagian itu; kosongkan kalau tidak ada.
- "kembar": adakah dua pilihan yang isinya sama walau kata-katanya berbeda? Tulis kedua hurufnya, misalnya "a,c"; kosongkan kalau tidak ada.
Balas HANYA dengan JSON berbentuk:
{"jawaban": [{"id": "Q1", "pilihan": "a", "kartu": [1], "bingung": "...", "penilaian": "...", "kunci_lain": "", "tak_tercek": "", "kembar": ""}, ...]}

### Q1
Pesan dari Rizky (20.15): "Gw yakin banget sahamnya disetop karena bursa ragu soal kelangsungan usahanya. Ga ada alasan lain deh."
Kartu:
- Kartu 1 — pengumuman penghentian sementara perdagangan oleh bursa, terbit 10 Desember 2025: Perdagangan saham dihentikan sementara oleh bursa pada 10 Desember 2025. Alasan resmi: Terjadinya peningkatan harga kumulatif yang signifikan pada saham Perusahaan T, dalam rangka cooling down sebagai bentuk perlindungan bagi investor. Kapan perdagangannya dibuka lagi tidak tercatat, jadi lama penghentiannya tidak bisa dipastikan.
- Kartu 2 — pengumuman penghentian sementara perdagangan oleh bursa, terbit 21 Januari 2025: Perdagangan saham dihentikan sementara oleh bursa pada 21 Januari 2025. Alasan resmi: Bursa menilai bahwa terdapat keraguan atas kelangsungan usaha perseroan. Kapan perdagangannya dibuka lagi tidak tercatat, jadi lama penghentiannya tidak bisa dipastikan.
- Kartu 3 — data harga harian bursa, terbit 9 Desember 2025: Volume perdagangan 9 Desember 2025 adalah 1.461.200 lembar.
Pertanyaan: Omongan Rizky cocok dengan dokumennya?
a) Betul, penghentiannya karena keraguan atas kelangsungan usaha perseroan.
b) Keliru, penghentiannya tercatat pada 21 Januari awal tahun.
c) Keliru, penghentiannya karena kenaikan harga kumulatif pada 10 Desember.
d) Betul, volume perdagangannya 1.461.200 lembar pada hari sebelumnya.
