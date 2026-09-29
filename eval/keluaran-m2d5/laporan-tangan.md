### Singkatnya

**TIRT terbit (lolos penuh) di putaran 4 dari 15, dengan biaya NYATA US$0,16** (59 panggilan; seluruh milestone termasuk probe US$0,22 dari pagu US$4,00). Di M2d-4 TIRT tidak terbit sesudah 15 putaran dan US$1,18 menurut tabel tebakan (tagihan nyatanya kira-kira dua kali itu). Ketiga posisi dikunci di sudut pertamanya; penolakan pemeriksa mekanis yang menjatuhkan TIRT M2d-4 (KUNCI_SERAGAM 5×, ANGKA_TANPA_RUJUKAN 7×) tidak terjadi lagi: huruf kunci diatur kode (9 dari 10 versi dipindah hurufnya), dan tidak ada penolakan pemeriksa sama sekali di jalan ini.

**Tetapi uji luar TIDAK lolos: tebak buta luar 1 dari 3.** Omongan 2 (Sari, "naik 58 rupiah") dan omongan 3 (Nia, "hasil putusan rapat … ada di catatan resmi ya?") ditebak benar oleh ketiga penguji luar tanpa kartu (yakin 40 dan 55–60). Penebak di dalam lingkar menebak keduanya SALAH (0 dari 3). Menurut keputusan pemilik (simulasi agen boleh tayang bila lolos semua gerbang **dan** uji luar), **draf TIRT M2d-5 ini belum layak dipasang ke produk.** Draf tidak dipasang.

### Kenapa gerbang di dalam lebih lunak dari penguji luar

- **Penebak GLM di OpenRouter hampir tidak berpikir**: 9 tebakan, penalaran rata-rata 39 token (maks 123), padahal batasnya 3.000. Di M2d-4 (Featherless) penebak GLM berpikir ratusan sampai ribuan token dan menjadi penebak terkuat (benar 57–80 %). Di sini ia benar 5 dari 9, dan pada dua omongan yang tertebak di luar ia ikut salah. Probe sudah memperlihatkan gejalanya (batas 1.500 → 1 token penalaran), tetapi pada batas 3.000 ia berpikir 425 token, jadi setelan 3.000 dianggap cukup. Di jalan sungguhan penyedia yang melayani (Wafer, Sail Research, AkashML, Friendli) memberi penalaran pendek.
- **Soal yang tertebak di luar mudah ditebak dengan akal sehat, bukan dengan menghitung**: omongan 2 mengulang angka di pesan ("58 rupiah") di pilihan kunci ("memang Rp58") — pola "pilihan mengulang omongan dengan rapi" yang justru disebut petunjuk penebak; omongan 3 memuat dua pengecoh yang sama isinya ("tercatat di dokumen" / "ada di catatan resmi"), sehingga pemain yang menyingkirkan keduanya tinggal memilih di antara dua. Dua dari tiga penguji kartu juga menandai pasangan pilihan itu membingungkan. Tidak ada gerbang yang menangkap "dua pengecoh identik" (G-mirip membandingkan antar-omongan, bukan antar-pilihan; kritikus menganggap keduanya sama-sama salah, jadi bukan ambigu kunci).

### Gerbang baru di jalan sungguhan

- **G-penilaian dan G-mirip** tidak menolak satu versi pun: penulis mematuhi aturan 18–19; kemiripan pola pilihan terbesar 0,23 (ambang 0,40). Efeknya terlihat di hasil (tidak ada "aman lah", tidak ada templat "disetop karena …" ×2), bukan di jumlah penolakan. Penguji kartu diberi pertanyaan penilaian D-10; satu menandai "Gw udah hafal polanya" — gaya pamer, bukan penilaian investasi, dan bukan kata dari daftar G-penilaian.
- **Pembaca kartu menandai kalimat membingungkan** sekali (putaran 3, omongan 3: pesan "Aku ragu rapat … itu cuma dijadwalin, keputusannya ga dicatat." — tulisan penulis, menolak); versi berikutnya lolos. Pembaca kartu tidak menandai teks kartu paket. Penguji luar menandai **"dalam rangka cooling down sebagai bentuk perlindungan bagi investor"** (3 penguji, 2 omongan) — itu kutipan ALASAN RESMI bursa di kartu suspensi, bukan tulisan penulis dan bukan frasa sistem; tidak diubah di D-8 (mengubah kutipan resmi mengubah dokumennya). Kandidat: glos awam di samping kutipan (milestone produk).
- **Teks kartu yang diperjelas (D-8)** tidak lagi ditandai siapa pun: frasa M2d-4 ("dibuktikan habis", "lolos seluruh pemeriksaan") tidak muncul di bahan TIRT; frasa suspensi "Kapan perdagangannya dibuka lagi tidak tercatat" tidak ditandai.

### Batas penalaran dan penyedia (D-1, D-3)

- **AtlasCloud melayani 21 dari 41 panggilan DeepSeek di jalan TIRT** (26 dari 50 bila probe ikut; murah: 0,114/0,456) dan **tidak mematuhi `reasoning.max_tokens`**: penulis berpikir sampai 20.000 (habis, kosong, tetap ditagih) 3 kali → cadangan tanpa berpikir (3 dari 3 terbaca; omongan 2 yang dikunci justru tulisan cadangan tanpa berpikir); penebak DeepSeek berpikir sampai 15.344 dari batas 16.000 (nyaris terpotong). Batas penalaran efektif di penyedia lain; `max_tokens` menjadi batas keras yang sesungguhnya, dan perkiraan pagu memakainya.
- Kritikus GLM: 9 putusan, penalaran rata-rata 128 token, tidak ada yang terpotong, tidak ada "tidak menjawab" (M2d-4: 14/44 terpotong, 69 % biaya). Kritikus kini US$0,02 dari US$0,16 — biaya bukan lagi kritikus. Kritikus juga tidak mengajukan satu keberatan pun di 9 putusan; keberatan "minggu lalu tak tercek" yang muncul 2 dari 3 kali di probe menunjukkan kritikus GLM di OpenRouter cenderung lunak dan beragam antar-sampel.
- Semua 75 panggilan membawa `usage.cost` dan nama penyedia; tidak ada entri "tanpa cost".

### Keputusan yang diambil eksekutor (bisa ditolak reviewer)

1. **Probe dua putaran** (US$0,038 + US$0,026): putaran 2 dijalankan karena putaran 1 memperlihatkan AtlasCloud mengabaikan batas penalaran dan pembaca kartu DeepSeek berpikir 5.293 dari 8.000 token.
2. **Batas penalaran pembaca kartu (6.000/12.000)** ditambahkan walau D-3 hanya menyebut penulis, kritikus, dan penebak GLM — alasannya data probe (nyaris terpotong di 8.000). Ditetapkan sebelum jalan TIRT.
3. **Contoh bank gaya yang memuat "aman lah" (v2-056, v2-061) tidak ditunjukkan ke penulis M2d-5** (disaring kode dengan G-penilaian); berkas bank tidak diubah.
4. **Rujukan huruf: dilarang** (bukan disesuaikan otomatis) — dari 200 versi M2d-3/M2d-4 tidak ada satu pun yang merujuk huruf, dan larangan bisa dites persis.
5. **Jalan kedua tidak dijalankan**: D-9 hanya membolehkannya bila jalan pertama tidak terbit.
6. Kealamian memakai kelompok jangkar ULTJ (manusia + M2d-4) supaya skor TIRT bisa dibaca terhadap skor manusia dari penilai yang sama.

### Keterbatasan

- **n sangat kecil**: satu simulasi, 3 omongan, 3 penguji per uji. Perbedaan penilai kealamian antar-milestone besar (manusia ULTJ 4,00 di M2d-4, 3,00 di M2d-5).
- **Kealamian TIRT M2d-5 (3,00) di bawah draf TIRT M2d-4 dan M2d-3 (4,00) pada penilai yang sama**; kritikannya ada di penjelasan ("kartu penentu menghitung selisih", "beralasan tidak sama") — penjelasan tidak disentuh gerbang gaya, dan istilah "kartu penentu" bocor dari prompt ke penjelasan.
- **Temuan Featherless** memakai angka kredit pemilik yang dikutip kontrak (turun ±US$14,5 dari US$15); rasio 1,88 bergantung pada angka itu.
- Tidak ada panggilan Sectors; `web/`, `server/`, `cases/`, `factory/verifikasi/`, `deploy/` tidak disentuh; draf tidak dipasang ke produk.
