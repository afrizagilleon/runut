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
Pesan dari Tio (20.15): "Waduh, sejak 26 November harga penutupannya udah lebih dari dua kali lipat. Gw panik nih, ini gila banget!"
Kartu:
- Kartu 1 — hitungan dari kartu lain, terbit 9 Desember 2025: Harga penutupan 9 Desember 2025 (Rp106) adalah 2,21 kali harga penutupan 26 November 2025 (Rp48), dibulatkan dua angka di belakang koma.
- Kartu 2 — hitungan dari kartu lain, terbit 9 Desember 2025: Kenaikan harga penutupan dari 26 November sampai 9 Desember 2025: Rp106 dikurangi Rp48 sama dengan Rp58.
Pertanyaan: Omongan Tio cocok dengan dokumennya?
a) Betul, penutupan 9 Desember 3,51 kali penutupan 26 November.
b) Keliru, naiknya cuma Rp58, bukan dua kali lipat.
c) Betul, penutupan 9 Desember 2,21 kali penutupan 26 November.
d) Keliru, penutupan 9 Desember malah lebih rendah dari 26 November.

### Q2
Pesan dari Dita (20.15): "Gw yakin bursa stop dagang saham Perusahaan T hari ini, soalnya mereka ragu usaha Perusahaan T bisa lanjut."
Kartu:
- Kartu 1 — pengumuman penghentian sementara perdagangan oleh bursa, terbit 10 Desember 2025: Perdagangan saham dihentikan sementara oleh bursa pada 10 Desember 2025. Alasan resmi: Terjadinya peningkatan harga kumulatif yang signifikan pada saham Perusahaan T, dalam rangka cooling down sebagai bentuk perlindungan bagi investor. Kapan perdagangannya dibuka lagi tidak tercatat, jadi lama penghentiannya tidak bisa dipastikan.
- Kartu 2 — pengumuman penghentian sementara perdagangan oleh bursa, terbit 21 Januari 2025: Perdagangan saham dihentikan sementara oleh bursa pada 21 Januari 2025. Alasan resmi: Bursa menilai bahwa terdapat keraguan atas kelangsungan usaha perseroan. Kapan perdagangannya dibuka lagi tidak tercatat, jadi lama penghentiannya tidak bisa dipastikan.
Pertanyaan: Omongan Dita cocok dengan dokumennya?
a) Betul, bursa menghentikannya hari ini karena usahanya diragukan bisa terus berjalan.
b) Betul, pengumuman hari ini juga menyebut rencana pengambilalihan belum diumumkan.
c) Keliru, alasan resmi hari ini: kenaikan harganya terlalu tajam.
d) Keliru, alasan resmi hari ini: laporan keuangannya terlambat diserahkan.

### Q3
Pesan dari Dita (20.15): "Gw yakin banget bursa stop dagang saham Perusahaan T hari ini, soalnya bursa ragu usaha Perusahaan T bisa terus jalan."
Kartu:
- Kartu 1 — pengumuman penghentian sementara perdagangan oleh bursa, terbit 10 Desember 2025: Perdagangan saham dihentikan sementara oleh bursa pada 10 Desember 2025. Alasan resmi: Terjadinya peningkatan harga kumulatif yang signifikan pada saham Perusahaan T, dalam rangka cooling down sebagai bentuk perlindungan bagi investor. Kapan perdagangannya dibuka lagi tidak tercatat, jadi lama penghentiannya tidak bisa dipastikan.
- Kartu 2 — pengumuman penghentian sementara perdagangan oleh bursa, terbit 21 Januari 2025: Perdagangan saham dihentikan sementara oleh bursa pada 21 Januari 2025. Alasan resmi: Bursa menilai bahwa terdapat keraguan atas kelangsungan usaha perseroan. Kapan perdagangannya dibuka lagi tidak tercatat, jadi lama penghentiannya tidak bisa dipastikan.
Pertanyaan: Omongan Dita cocok dengan dokumennya?
a) Betul, bursa menghentikannya hari ini karena usahanya diragukan bisa terus berjalan.
b) Keliru, alasan resmi hari ini: kenaikan harganya terlalu tajam.
c) Betul, pengumuman hari ini juga menyebut rencana pengambilalihan belum diumumkan.
d) Keliru, alasan resmi hari ini: laporan keuangannya terlambat diserahkan.
