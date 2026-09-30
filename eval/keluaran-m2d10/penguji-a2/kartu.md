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
Pesan dari Tio (20.14): "Gw yakin deh harga penutupan Perusahaan T kemarin Rp97, itu angka yang gw inget banget."
Kartu:
- Kartu 1 — data harga harian bursa, terbit 9 Desember 2025: Harga penutupan 9 Desember 2025 adalah Rp106 per lembar.
- Kartu 2 — data harga harian bursa, terbit 8 Desember 2025: Harga penutupan 8 Desember 2025 adalah Rp97 per lembar.
Pertanyaan: Omongan Tio cocok dengan dokumennya?
a) Betul, penutupan 9 Desember memang Rp97.
b) Betul, Rp97 itu penutupan tertinggi sebelum hari ini.
c) Keliru, penutupan 9 Desember Rp106, bukan Rp97.
d) Keliru, penutupan 9 Desember Rp115, bukan Rp97.
