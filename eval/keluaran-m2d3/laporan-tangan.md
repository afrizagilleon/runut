### Singkatnya

**Dua dari tiga simulasi terbit (lolos penuh): TIRT di putaran 7 dan ULTJ di putaran 12. DADA tidak terbit** — omongan 2 habis tiga sudut (15 putaran); omongan 1 dan 3 terkunci. Di M2d-2 tidak ada satu pun simulasi yang lolos penuh dalam 5 putaran. Draf tetap **tidak** dipasang ke produk.

Tetapi pembanding eksternal menunjukkan bahwa "terbit" di dalam lingkar belum berarti soal yang baik:

- **Tebak buta luar: 3 dari 8 omongan yang dikunci lolos** (M2d-2: 2 dari 3). Lima omongan dijawab benar oleh ketiga penguji Opus tanpa kartu, walau dengan keyakinan rendah (30–45). Penebak DeepSeek di dalam lingkar justru memilih pengecoh untuk kelimanya. **Gerbang tebak di dalam lebih lunak daripada penguji luar**, dan jaraknya membesar: model penebak yang sama dengan penulis, sekarang diberi petunjuk berhitung, tetap tertipu pola yang tidak menipu Opus.
- **Jawab-dengan-kartu luar: 8 dari 8** dijawab benar oleh ketiga penguji dan semuanya menunjuk kartu penentu. Kalimat membingungkan yang mereka tandai konkret: "Ini gara-gara ada yang ngeborong gede ya?" (TIRT 1 — bagian omongan yang tidak bisa dicek kartu, padahal kuncinya "Betul"), pilihan d ULTJ 1 yang juga benar menurut kartu, dan istilah kartu "hitungan dari kartu lain" / "Jarak antara penutupan terakhir … dan pembukaan hari ini".
- **Kealamian: 3,33 untuk draf M2d-3, sama dengan draf M2d-2 (3,33) di tangan penilai yang sama**; M2d-1 2,44; manusia 4,00. Bank gaya dan G-kaku tidak menaikkan skor bahasa. Keluhan penilai berpindah dari pesan ke penjelasan dan pola berulang: "sudah dirapikan jadi", "Gue ragu nih" di dua pesan ULTJ, "lolos pemeriksaan" (istilah fakta paket yang terbawa ke pesan DADA).

### Apa yang dikerjakan tiap peran (dari jejak)

- **Kritikus GLM-5.3** dipanggil 13 kali (US$0,4840 — sepertiga biaya milestone untuk 4 % panggilan). Karena ia hanya dipanggil sesudah pemeriksa, pembaca kartu, dan penebak tidak keberatan, ia menilai sedikit versi, dan keberatannya sedikit tetapi nyata: "omongan" (istilah sistem) di penjelasan TIRT, dan penjelasan ULTJ yang membantah pengecoh tetapi tidak membantah klaim teman. Kritikus **tidak** menangkap satu pun dari lima omongan yang tertebak di luar, dan tidak menangkap pilihan d ULTJ 1 yang ikut benar menurut kartu.
- **Kritikus yang terpotong**: tiga panggilan di dua langkah (ULTJ omongan 1, putaran 2 dua kali dan putaran 3 sekali; batas 16.384 token habis untuk penalaran). Aturan "tidak menjawab = keberatan" bekerja: di putaran 2 versi itu tidak lolos, dibawa tanpa ditulis ulang, diperiksa lagi di putaran 3, dan kali itu kritikus menjawab (ulangan) dengan keberatan makna. Harganya ±US$0,05 per panggilan terpotong.
- **Gerbang G tidak pernah menolak di M2d-3**: 56 pemeriksaan G (tiap versi yang bentuknya terbaca, dari 62 versi), 0 tolak — penulis diberi tahu kedua aturannya di prompt. Retro atas 37 versi M2d-2, G-angka-cukup menolak 7 dan G-kaku 1 — termasuk omongan TIRT "48 ke 106" yang dulu lolos gerbang dalam dan gagal di luar. Tetapi **G-angka-cukup tidak menangkap perkalian**: DADA omongan 2 berputar lima putaran di sudut `andai-10-lot-dividen` karena penebak menghitung 10 lot × 100 lembar × Rp0,14 = Rp140 sendiri. Itu keterbatasan yang sudah ditulis di `gerbang-g.ts` (hanya rasio, persen, selisih).
- **Strategi sudut** bekerja sebagai mekanisme: TIRT membuang dua sudut di putaran 5 dan keduanya terkunci di sudut kedua pada putaran 7; ULTJ membuang tiga sudut dan terkunci di putaran 7 dan 12. DADA omongan 2 habis di `jumlah-jual-terverifikasi` → `andai-10-lot-dividen` → `fil-2025-09-01-01`.

### Keputusan di tengah jalan

1. **Jalan TIRT ke-1 dibuang** (±35 menit, US$0,0516 menurut ledger termasuk KOREKSI US$0,0034): penebak dengan petunjuk berhitung habis di 8.000 token dua kali dari empat panggilan, dan tebakan tak terbaca dihitung benar/100. Batas penebak M2d-3 dinaikkan ke 16.000 token. DADA dan ULTJ memakai setelan yang sama dengan jalan TIRT ke-2, tanpa penyetelan lagi.
2. **DADA dan ULTJ dijalankan** karena sisa pagu milestone sesudah TIRT US$1,6190 dan sesudah DADA US$1,0740 (syarat D-6 ≥ US$0,80, saya periksa sebelum masing-masing).
3. **Panggilan penulis berpikir kadang lewat 900 detik** (dua kali: TIRT jalan 1 dan DADA putaran 1). Klien tidak mengulang batas waktu (bisa sudah ditagih), jadi ledger mencatat perkiraan maksimum (US$0,0160 dan US$0,0154) dan cadangan tanpa berpikir mengisi omongannya; selisih jejak vs ledger DADA (US$0,5296 vs US$0,5450) adalah panggilan itu.

### Keterbatasan

- **n kecil**: 3 simulasi, 8 omongan terkunci, 3 penguji per uji, 3 penilai. Selisih satu omongan menggeser persentase besar-besar.
- **Penebak di dalam = model penulis** (DeepSeek). Hasil M2d-3 menguatkan usul M2d-2: gerbang tebak perlu penebak yang berbeda atau lebih kuat; kritikus GLM tidak menggantikannya.
- **Kritikus hanya melihat versi yang sudah lolos tiga penilai lain** (urutan murah → mahal). Keberatan kritikus terbanyak karena itu datang dari sedikit panggilan (13); kalau kritikus dipanggil lebih awal, arahannya bisa membantu lebih banyak versi, tetapi biayanya naik tajam.
- **"Terbit" bukan "siap dipasang"**: TIRT 1 menyebut spekulasi ("gara-gara ada yang ngeborong") yang tidak bisa dicek tetapi kuncinya "Betul"; ULTJ 1 punya dua pilihan yang benar menurut kartu; ULTJ 2 dan 3 membahas klaim yang hampir sama (turun harga vs dividen). Semua lolos keempat penilai di dalam. Penghalusan RASA oleh manusia (disetujui pemilik, bukan bagian M2d-3) dan pemeriksaan makna oleh manusia tetap perlu.
- **Kealamian M2d-2 di tabel ini (3,33)** berbeda dari laporan M2d-2 (3,83) karena penilainya lain dan draf M2d-2 dinilai berdampingan dengan draf M2d-3; bandingkan antar-generasi hanya di baris "penilai M2d-3 yang SAMA".
- **Waktu**: TIRT 96 menit, DADA 209 menit, ULTJ 54 menit; penyedia lambat dan tidak rata (satu panggilan penulis 566 detik, satu penebak 705 detik).
- **Biaya kritikus** memakai angka penjaga harga GLM-5.3 (1,00/3,00 per juta token), bukan tagihan; ledger bisa dihitung ulang dari token.
