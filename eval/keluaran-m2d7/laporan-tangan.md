### Singkatnya

**TIRT M2d-7 TIDAK layak tayang.** Kedua jalan (jalan 1 US$0,344; jalan 2 sesudah perbaikan implementasi US$1,154) tidak terbit sesudah 9 putaran, dan **tidak satu omongan pun dikunci** di jalan mana pun. Menurut pra-registrasi, tanpa draf terbit syarat (a) gagal; omongan yang dikunci jalan terakhir diuji di luar hanya untuk laporan — dan karena tidak ada, **tidak ada subagent penguji yang dijalankan**. Syarat (b), (c), (d) tidak bisa diukur (0 omongan) dan dihitung tidak terpenuhi. Biaya M2d-7 US$2,3075 dari pagu US$3,00. Draf tidak dipasang.

### Apa yang berhasil (terukur)

- **Bank pengecoh dari data bekerja sebagai pagar fakta.** Semua kandidat lolos pemeriksa rujukan validator (dites atas setiap fakta tiga paket); di dua jalan tidak ada satu pun pengecoh dengan angka karangan atau `[[misal|…]]` yang lolos pemeriksa — G-ikatan-bank mengeluarkan 4 butir penolakan (pengecoh tidak memakai kandidatnya / pesan tidak memakai salah kaprahnya), validator 6 butir rujukan yang salah.
- **Gerbang pilihan-saja murah dan menangkap yang terlewat.** ±US$0,002–0,005 per pemeriksaan. Di kalibrasi ia satu-satunya gerbang yang menangkap omongan 1 TIRT M2d-6 (tertebak 3/3 di luar, sementara penebak GLM "max" memilih salah 3/3).
- **Perbaikan terarah berjalan mekanis.** Pesan yang lolos tidak ditulis ulang saat hanya pilihan yang gagal (jalan 1: pesan ditulis 10 kali untuk 27 versi); pilihan sebagian ditulis 10 kali; tiap sudut berhenti sesudah 2 perbaikan per bagian.
- **Kritikus "max" yang menjawab menemukan masalah nyata** yang tidak tertangkap kode: pengecoh bank yang ternyata ikut BENAR ("pilihan a juga benar" — alasan resmi setop 10 Desember memang kenaikan harga, jadi "Betul, harganya naik …" ikut benar) dan nada pesan yang membocorkan kunci ("gw ragu …").

### Yang tidak berhasil, dan kenapa (terukur)

1. **Kritikus `effort: "max"` berpikir sampai `max_tokens` habis.** Di jalan TIRT, 12 dari 15 panggilan kritikus habis tanpa jawaban (jalan 1: 2/2 di 16.000; jalan 2: 10/13 di 24.000), dibayar US$0,055–0,072 per panggilan, dan dibaca "tidak menjawab" → versi dibawa ke putaran berikutnya → kritikus dipanggil lagi. Kritikus menghabiskan US$1,03 dari US$1,50 jalan TIRT. Probe (3 panggilan atas omongan yang lebih sederhana) tidak memperlihatkan ini: penalarannya berhenti di 6.550–10.334. Di OpenRouter `"max"` ≈ 95 % `max_tokens` adalah anggaran, dan GLM memakainya habis pada soal yang ambigu.
2. **Gerbang meresmikan terlalu keras terhadap kata fungsi.** Ia menjadi penolak kode kedua terbesar (34 butir) sesudah OPSI_PANJANG_TIMPANG (64). Tokenisasi `isiPilihan` sengaja mempertahankan "tidak/bukan/hanya" (untuk G-pilihan-kembar), sehingga kunci koreksi seperti "Keliru, … karena harga naik, bukan keraguan" ditolak karena mengulang "karena", "bukan", "naik". Soal manusia tidak kena (dites), tulisan agen sering kena.
3. **Klaim BETUL berangka bertabrakan dengan gerbang yang ada.** Kunci yang membenarkan "58 perak" hampir selalu mengulang 58 (meresmikan), dan kandidat operand-keliru dari bank (Rp106, Rp48) membuat 58 bisa dihitung dari pilihan (G-angka-cukup). Omongan 2 jalan 1 habis di ketiga sudut berangka karena ini. Perbaikan sebelum jalan 2 (klaim BETUL tanpa angka persis, rujukan lain ke fakta sudut) mengurangi, tidak menghilangkan.
4. **"Dari data" tidak sama dengan "salah".** Nilai nyata milik fakta lain bisa tetap membenarkan klaim teman dengan label "Betul" — kritikus menangkapnya, kode tidak. Bank perlu tahu kandidat mana yang menjawab pertanyaan yang SAMA dengan klaim teman.
5. **Penebak GLM "max" lebih keras dari penguji luar Opus.** Di kalibrasi ia menebak benar 3 dari 4 soal aman yang terukur (penguji luar: 0/3 di ketiganya), jadi keempat langkah pelonggaran diambil tanpa menurunkan aman-ditolak di bawah 3/4. Satu-satunya versi yang sampai penebak di jalan TIRT tertebak 3/3 (keempat pilihan berekor sama "dari akhir November sampai awal Desember", kunci satu-satunya yang menyebut kenaikan).
6. **Kalibrasi berhenti di pagu.** Satu soal (m2d5-tirt-o3) menghabiskan US$0,20: tebakan GLM "max" habis di 12.000 token lalu diulang (tak terbaca). 7 dari 10 soal inti terukur.

### Keputusan yang diambil eksekutor (bisa ditolak reviewer)

1. **Tafsir pra-registrasi**: masalah makna = ≥ 2 dari 3 penguji kartu pada butir yang sama (bukan satu penguji); jalan 2 hanya bila jalan 1 tidak terbit; draf yang diuji = jalan pertama yang terbit, atau omongan dikunci jalan terakhir.
2. **Label BETUL/KELIRU per posisi ditetapkan kode** (sha256 id paket, 6 pola yang memuat keduanya), kartu dihitung kode, dan angka andaian di pesan dilarang (lebih ketat dari validator) — supaya klaim KELIRU pun memakai nilai nyata dari bank.
3. **Aturan pelonggaran D-6 dibandingkan sebagai porsi** (> 4/6 dari soal aman yang TERUKUR) — ditambahkan sesudah kalibrasi berhenti di pagu dengan 4 dari 6 soal aman terukur; tanpa itu (hitungan mutlak 3 ≤ 4) tidak ada yang dilonggarkan. Akibatnya pilihan-saja dilonggarkan (rata-rata yakin ≥ 60) — ini melepas tangkapan satu-satunya atas omongan TIRT M2d-6 o1 (c/55, c/60), tetapi membuat keenam soal manusia lolos pilihan-saja (sebelumnya ULTJ "siapa-yang-membeli" ditolak).
4. **Perubahan di antara jalan 1 dan jalan 2** (commit `5c6be07`, ambang gerbang tidak diubah): meresmikan dan G-angka-cukup menulis ulang keempat pilihan (bukan kunci saja); alternatif kunci menawarkan rujukan lain ke fakta sudut; permintaan pilihan menyebut angka pesan eksplisit; klaim BETUL tidak wajib angka persis; kritikus `max_tokens` 16.000 → 24.000 lewat aturan probe yang sama atas probe + kritikus jalan 1. Jalan 2 karena itu bukan pengulangan jalan 1 yang identik.
5. **`provider.order: ["wafer"]`** untuk GLM dari bukti ledger: 60 dari 60 panggilan GLM M2d-7 dilayani Wafer (US$1,83 dari US$2,31) — ketergantungan pada satu penyedia.

### Keterbatasan

- n sangat kecil: kalibrasi 7 soal inti terukur; dua jalan TIRT; nol omongan yang diuji di luar — tidak ada angka tebak buta luar M2d-7.
- Probe `"max"` atas 3 omongan sederhana memberi gambaran yang terlalu baik tentang penalaran kritikus.
- Ledger mencatat DeepSeek di Wafer melewati `reasoning.max_tokens` (5.617 > 4.000 di kalibrasi); tidak dikecualikan (tidak diminta kontrak, pengaruhnya hanya biaya kecil).
- Tidak ada panggilan Sectors; `web/`, `server/`, `cases/`, `factory/verifikasi/`, `factory/kasus/`, `alat/`, `deploy/` tidak disentuh; draf tidak dipasang ke produk.
