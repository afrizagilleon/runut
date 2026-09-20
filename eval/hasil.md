# Hasil uji tiga lengan (M1.5)

Kasus tersembunyi **FOLK** (PT Multi Garam Utama Tbk), beku pada **T = 2025-10-07**. Kasus dipilih dan dibekukan pemilik sebelum satu pun lengan dijalankan; kunci jawabannya disusun manusia dari data mentah dan tidak pernah masuk ke prompt lengan mana pun.

Berkas ini dihasilkan `npm run eval:laporan` dari berkas keluaran mentah. Setiap angka di bawah bisa ditelusuri ke berkas yang disebut di kolom terakhir.

| lengan | isi |
|---|---|
| A | model + Sectors MCP, tanpa aturan verifikasi kita |
| S | model + Sectors MCP + isi `docs/aturan-verifikasi.md` disisipkan ke prompt |
| C | pipeline kita (verifikasi R1–R10 atas cache) + model yang hanya menulis kalimat dari fakta terverifikasi |

Model sama untuk ketiganya: `claude-sonnet-5` (D-2). Prompt A dan S identik kata per kata kecuali blok aturan (D-8).

## 9 percobaan

Semua kolom: makin kecil makin baik.

| percobaan | skema | angka tidak cocok kunci | fakta bocor sesudah T | klaim tanpa sumber | konflik tak terdeteksi | konflik terdeteksi | ajakan transaksi | skor | berkas mentah |
|---|---|---|---|---|---|---|---|---|---|
| A-1 | lolos | 0 | 0 | 0 | 2 dari 2 berlaku | 0 | 0 | **2** | `eval/keluaran/A-1.json` |
| A-2 | lolos | 1 | 1 | 0 | 2 dari 2 berlaku | 0 | 0 | **5** | `eval/keluaran/A-2.json` |
| A-3 | lolos | 3 | 1 | 0 | 2 dari 2 berlaku | 0 | 0 | **7** | `eval/keluaran/A-3.json` |
| S-1 | lolos | 6 | 1 | 0 | 2 dari 4 berlaku | 2 | 0 | **10** | `eval/keluaran/S-1.json` |
| S-2 | lolos | 4 | 1 | 0 | 3 dari 4 berlaku | 1 | 0 | **9** | `eval/keluaran/S-2.json` |
| S-3 | lolos | 8 | 1 | 0 | 2 dari 2 berlaku | 0 | 0 | **12** | `eval/keluaran/S-3.json` |
| C-1 | lolos | 2 | 1 | 0 | 0 dari 2 berlaku | 2 | 0 | **4** | `eval/keluaran/C-1.json` |
| C-2 | lolos | 2 | 1 | 0 | 0 dari 2 berlaku | 2 | 0 | **4** | `eval/keluaran/C-2.json` |
| C-3 | lolos | 2 | 1 | 0 | 0 dari 2 berlaku | 2 | 0 | **4** | `eval/keluaran/C-3.json` |

## Rata-rata per lengan

| lengan | percobaan | lolos skema | angka tidak cocok | fakta bocor | tanpa sumber | konflik tak terdeteksi | ajakan | skor rata-rata |
|---|---|---|---|---|---|---|---|---|
| A | 3 | 3/3 | 1.33 | 0.67 | 0.00 | 2.00 | 0.00 | **4.67** |
| S | 3 | 3/3 | 6.00 | 1.00 | 0.00 | 2.33 | 0.00 | **10.33** |
| C | 3 | 3/3 | 2.00 | 1.00 | 0.00 | 0.00 | 0.00 | **4.00** |

Bobot skor, ditetapkan sebelum satu pun lengan dijalankan: angka tidak cocok ×1, fakta bocor ×2, klaim tanpa sumber ×1, konflik tak terdeteksi ×1, ajakan transaksi ×3, gagal skema = 5 dan isinya tidak dinilai lagi.

## Biaya per percobaan

Perkiraan biaya dolar memakai harga Sonnet: $3/MTok masuk dan $15/MTok keluar. Angka token diambil apa adanya dari field `token_masuk` dan `token_keluar` di tiap berkas keluaran.

| percobaan | kredit Sectors | panggilan alat MCP | token masuk | token keluar | perkiraan biaya | berkas mentah |
|---|---|---|---|---|---|---|
| A-1 | 16 | 16 | 454.052 | 27.923 | $1.78 | `eval/keluaran/A-1.json` |
| A-2 | 14 | 14 | 363.080 | 20.981 | $1.40 | `eval/keluaran/A-2.json` |
| A-3 | 12 | 12 | 282.546 | 21.744 | $1.17 | `eval/keluaran/A-3.json` |
| S-1 | 14 | 14 | 406.820 | 23.310 | $1.57 | `eval/keluaran/S-1.json` |
| S-2 | 10 | 10 | 300.849 | 25.789 | $1.29 | `eval/keluaran/S-2.json` |
| S-3 | 10 | 10 | 203.237 | 22.374 | $0.95 | `eval/keluaran/S-3.json` |
| C-1 | 0 | 0 | 7.794 | 14.500 | $0.24 | `eval/keluaran/C-1.json` |
| C-2 | 0 | 0 | 7.794 | 15.709 | $0.26 | `eval/keluaran/C-2.json` |
| C-3 | 0 | 0 | 7.794 | 11.630 | $0.20 | `eval/keluaran/C-3.json` |

## Biaya rata-rata per lengan

| lengan | percobaan | kredit Sectors (total) | kredit per puzzle | token masuk per puzzle | token keluar per puzzle | biaya per puzzle | biaya total lengan |
|---|---|---|---|---|---|---|---|
| A | 3 | 42 | 14.00 | 366.559 | 23.549 | $1.45 | $4.36 |
| S | 3 | 34 | 11.33 | 303.635 | 23.824 | $1.27 | $3.80 |
| C | 3 | 0 | 0.00 | 7.794 | 13.946 | $0.23 | $0.70 |

Total kredit Sectors terpakai milestone ini: **89 dari pagu 150**. Asumsi yang dicatat terbuka: satu panggilan alat MCP = satu kredit; penyedia tidak mengembalikan sisa kuota di responsnya.

Biaya token Anthropic: **$8.86** untuk 9 percobaan yang dinilai, ditambah **$1.33** untuk 3 percobaan yang dibuang (lihat di bawah), sehingga **$10.19** seluruhnya. Kontrak M1.5 memasang pagu kredit Sectors tetapi TIDAK memasang pagu dolar, dan biaya dolar inilah yang hampir menghentikan uji ini sebelum lengkap — bukan kredit Sectors, yang terpakai kurang dari dua pertiga pagunya.

| percobaan dibuang | alasan | token masuk | token keluar | perkiraan biaya | berkas |
|---|---|---|---|---|---|
| A-1 | `max_tokens=16000` terlalu kecil (`stop_reason=max_tokens`) | 269.048 | 18.125 | $1.08 | `eval/keluaran/dibuang/A-1-max-tokens-16000.json` |
| C-1 | `max_tokens=16000` terlalu kecil (`stop_reason=end_turn`) | 7.794 | 15.155 | $0.25 | `eval/keluaran/dibuang/C-1-max-tokens-16000.json` |
| S-3 | panggilan API gagal di tingkat jaringan sebelum satu token pun terpakai: `TypeError: fetch failed` | 0 | 0 | $0.00 | `eval/keluaran/dibuang/S-3-percobaan-gagal-jaringan.json` |

Dua percobaan pertama dijalankan dengan `max_tokens=16000`. Blok pemakaian alat MCP ikut memakan pagu keluaran yang sama, sehingga lengan A terpotong di tengah JSON dan lengan C hampir kena juga (15.155 dari 16.000). Pagu dinaikkan ke 32.000 untuk **ketiga** lengan sebelum satu pun percobaan resmi dijalankan.

Satu percobaan lagi, S-3, gagal di tingkat jaringan sebelum permintaan sampai ke penyedia: nol token masuk, nol token keluar, nol kredit. Sambungan diuji ulang sesudahnya dan sehat (HTTP 401 dalam 449 ms untuk permintaan tanpa kunci), jadi percobaan itu diulang **dengan prompt, model, dan parameter yang persis sama**. Percobaan yang gagal tidak dihapus; berkasnya ada di `eval/keluaran/dibuang/`.

## Ragam antar ulangan

| lengan | skor terendah | skor tertinggi | selisih |
|---|---|---|---|
| A | 2 | 7 | 5 |
| S | 9 | 12 | 3 |
| C | 4 | 4 | 0 |

## Percobaan yang gagal

Tidak ada. Sembilan percobaan berhenti dengan `end_turn` dan keluarannya bisa diurai.

## Baris kunci yang tidak dinilai

- **A6 (bagian rasio)** — Kunci menulis volume 7 Okt "sekitar 18x volume rata-rata 15-30 Sep". Dihitung dari .cache/sectors/FOLK-daily-2025q3.json, rata-rata volume 15-30 Sep 2025 adalah 29.896.592 lembar (12 hari bursa), sehingga rasionya 2,2x, bukan 18x. Angka volumenya sendiri (66.466.200) benar dan tetap dinilai; rasionya tidak.
- **A12** — Kunci menulis RUPS sampai T ada dua (22 Agu 2024 dan 11 Jun 2025). Data aksi korporasi memuat tiga RUPS sebelum T: 31 Mei 2024, 22 Agu 2024, dan 11 Jun 2025. Jumlah RUPS tidak dinilai karena kunci dan data mentah tidak sejalan.

## OQ-1 — Berapa kesalahan per puzzle di tiap lengan?

| lengan | kesalahan per puzzle (rata-rata seluruh jenis pelanggaran) | skor berbobot rata-rata |
|---|---|---|
| A | 4.00 | 4.67 |
| S | 9.33 | 10.33 |
| C | 3.00 | 4.00 |

Urutan dari paling sedikit kesalahan: **C < A < S**. Lengan terbaik **C** (skor rata-rata 4.00), terburuk **S** (10.33).

Ragam antar ulangan di dalam satu lengan mencapai 5 poin skor. Bandingkan dengan selisih antar lengan di bawah sebelum menyebut satu lengan lebih baik: kalau ragam di dalam lengan sebesar selisih antar lengan, tiga ulangan tidak cukup untuk memisahkannya.

## OQ-2 — Keunggulannya dari aturan atau dari kode?

| perbandingan | selisih skor rata-rata | arti kalau positif |
|---|---|---|
| A − S | -5.67 | menyisipkan R1–R10 ke prompt saja sudah membantu |
| S − C | 6.33 | kode pipeline menambah sesuatu di atas aturan |
| A − C | 0.67 | produk utuh lebih baik daripada model polos |

Yang perlu dibaca pemilik: kalau **S − C mendekati nol**, yang bernilai adalah aturannya, bukan kodenya, dan produk sebaiknya berubah bentuk (3.3). Kalau **A − S mendekati nol**, menyisipkan aturan ke prompt tidak menambah apa-apa dan keunggulan (kalau ada) datang dari kode.

## OQ-3 — Berapa biaya satu puzzle lewat MCP dibanding lewat pipeline?

| lengan | kredit per puzzle | panggilan alat per puzzle | token masuk per puzzle | token keluar per puzzle | biaya dolar per puzzle |
|---|---|---|---|---|---|
| A | 14.0 | 14.00 | 366.559 | 23.549 | $1.45 |
| S | 11.3 | 11.33 | 303.635 | 23.824 | $1.27 |
| C | 0.0 | 0.00 | 7.794 | 13.946 | $0.23 |

Lewat MCP satu puzzle memakai sekitar 14.0 kredit Sectors (lengan A) dan 11.3 kredit (lengan S), dengan biaya token sekitar $1.45 dan $1.27. Lewat pipeline: 0.0 kredit Sectors dan $0.23 token — sekitar 6× lebih murah daripada lengan A. Datanya sudah ada di cache dan ditarik sekali saja (7 kredit untuk seluruh kasus FOLK, di luar pagu milestone ini). Yang mahal di lengan MCP bukan kredit Sectors, melainkan token masuk: hasil panggilan alat ikut masuk ke konteks pada setiap giliran, sehingga token masuk menumpuk berlipat.

## Apa yang hasil ini TIDAK membuktikan

**Uji ini nyaris berhenti karena anggaran, dan itu ikut membentuk jalannya.** Kontrak M1.5 memasang pagu kredit Sectors tetapi tidak memasang pagu dolar. Sesudah delapan percobaan, saldo API Anthropic pemilik hampir habis dan percobaan baru untuk lengan A dan S dihentikan; percobaan terakhir (S-3) baru dijalankan setelah pemilik mengizinkan sisa saldonya dipakai. Selama jeda itu tidak ada prompt, model, atau parameter yang diubah untuk menghemat biaya, karena mengubahnya akan merusak kontrol percobaan. Rancangan 3×3 akhirnya utuh, tetapi kalau saldo habis lebih awal hasilnya akan dilaporkan dengan n yang tidak seimbang.

Ini juga **satu kasus**, satu emiten, satu tanggal beku, 9 percobaan seluruhnya. Sejumlah itu tidak cukup untuk uji statistik apa pun, dan tidak ada selang kepercayaan yang dihitung di sini. Ragam di dalam satu lengan sendiri mencapai 5 poin, jadi selisih antar lengan yang lebih kecil daripada itu tidak berarti apa-apa. Hasil ini juga tidak mengukur apakah puzzle-nya menarik, bisa dipahami pemula, atau layak dipakai di produk: yang diukur hanya kesalahan yang bisa dihitung mesin terhadap kunci jawaban FOLK. Kunci jawaban itu sendiri dibuat manusia dan terbukti tidak sempurna — dua barisnya bertentangan dengan data mentah dan sengaja tidak dinilai, dan metrik "angka tidak cocok kunci" ikut menghitung angka yang BENAR menurut data mentah tetapi tidak tercantum di kunci, sehingga lengan yang menulis lebih banyak rincian terhukum lebih berat. Kasus ini juga khas: pada T belum ada satu pun laporan kepemilikan yang terbit, sehingga sebagian besar aturan R1–R9 tidak punya bahan di bagian yang dilihat pemain; kasus dengan banyak laporan sebelum T bisa memberi urutan lengan yang berbeda. Terakhir, ketiga lengan memakai model yang sama pada satu hari yang sama; tidak ada yang bisa disimpulkan tentang model lain, versi lain, atau tentang apa yang terjadi kalau lengan A diberi kesempatan mencoba dua kali.

---

---

<!-- AWAL BAGIAN AMANDEMEN A-1 -->

# Bagian amandemen A-1 — sembilan keluaran yang sama, dinilai ulang

Bagian ini DITAMBAHKAN oleh `npm run eval:laporan-a1`; seluruh isi di atasnya dibiarkan apa adanya supaya tabel lama dan tabel baru bisa dibaca berdampingan. Tidak ada satu pun panggilan API untuk menghasilkan bagian ini: keluaran mentahnya sudah tersimpan sejak T-05 dan tidak disentuh.

## Berkas yang dibaca

| berkas keluaran | sha256 |
|---|---|
| `eval/keluaran/A-1.json` | `d93d08a972e9374d182a42031c9d5c051f162b49748c66e74c8cb2db79888a40` |
| `eval/keluaran/A-2.json` | `4b428d84d10e62337e24963bd4b34dc893ac51efa4101de8c8f86a6866626d53` |
| `eval/keluaran/A-3.json` | `1acb4a7d9b7ff4d199c454eb12ba9a6745fb50e61d49fe3032ea955d399ae258` |
| `eval/keluaran/C-1.json` | `bff319adf0e878e8d2c055eab94ddc6165a07cdf4419c4bfa48e8cbe5dcd9b53` |
| `eval/keluaran/C-2.json` | `9a918d16cc8355e6df776271530e7811a08302c30007533962cddc890e386c7e` |
| `eval/keluaran/C-3.json` | `7772bcc8016c73a21085d4c7d6d7f59fc9c16f790331acb7b4ac4c0bbe1f146b` |
| `eval/keluaran/S-1.json` | `7f3e312b9b84a97c3c949da8805f47e78b092895266aa8f5e6fb23db5e412806` |
| `eval/keluaran/S-2.json` | `2741ce5aca6d3479738433fd64b55d27b7f32d2f6be681c556ccd9799baad2d3` |
| `eval/keluaran/S-3.json` | `dd830373a2e302efc13e898cb208a0a96600fc433afb7dfb7471c7fa8d4edcfb` |

Data mentah pembanding: `.cache/sectors/FOLK-daily-2025q3.json`, `.cache/sectors/FOLK-daily-2025q4.json`, `.cache/sectors/FOLK-financials.json`, `.cache/sectors/FOLK-overview.json`, `.cache/sectors/FOLK-filings.json`, `.cache/sectors/suspensions-all.json`.

## Apa yang berubah pada definisinya

| kolom | definisi lama | definisi amandemen A-1 |
|---|---|---|
| ketepatan | setiap angka yang **tidak ada di kunci** dihitung salah | angka dihitung salah hanya kalau **bertentangan dengan data mentah**: kalimatnya mengklaim sebuah nilai bertanggal atau bertahun buku yang ada di `.cache/sectors/`, tidak memuat satu pun nilai yang benar untuk klaim itu, dan besarannya sebanding (antara 1/5 dan 5 kali nilai benar) |
| — | (tidak ada) | kolom baru **tidak dapat diverifikasi**: angka yang tidak ada di data mentah dan tidak bisa diturunkan darinya. Bukan kesalahan lengan; kita hanya tidak punya bahannya |
| kelengkapan | tercampur ke dalam "angka salah" | kolom sendiri: berapa dari 14 baris fakta kunci (A1–A14) yang berhasil disebut. **Makin besar makin baik**, berlawanan arah dengan kolom lain |
| kebocoran | setiap tanggal sesudah T di bagian terlihat | hanya kalau **isi** faktanya dari sesudah T |
| — | (tidak ada) | kolom baru **klaim ketersediaan tanpa bukti**: pengumuman bursa sesudah T yang ditandai lengan sudah tersedia pada T, padahal data kita tidak memuat tanggal pengumumannya |
| konflik | C1–C4 | C3 **dicabut** reviewer pada 20 Sep malam dan tidak lagi dihitung, baik sebagai terdeteksi maupun sebagai kesempatan; lengan yang tetap melaporkannya mendapat kolom **positif palsu** |

Turunan aritmetika yang diterima pemeriksa ketepatan, daftar tertutup dan satu langkah:

- selisih (x − y)
- jumlah (x + y)
- perkalian (x × y)
- rasio (x ÷ y)
- persen perubahan ((x − y) ÷ y × 100)
- persen bagian (x ÷ y × 100)
- rata-rata harga penutupan atau volume atas rentang hari bursa yang salah satu ujungnya tanggal yang disebut kalimat itu (minimal tiga hari bursa), dan perbandingan terhadap rata-rata itu.

Basisnya hanya: angka lain di kalimat yang sama **yang sendirinya ada di data mentah**, nilai harian tanggal yang disebut kalimat itu dan hari bursa sebelumnya, medan keuangan tahun buku yang disebut kalimat itu, dan jumlah saham beredar. Syarat "sendirinya ada di data mentah" mencegah sebuah lengan memverifikasi angkanya sendiri dengan angka karangannya sendiri.

> **C3 dicabut.** Dicabut reviewer 20 Sep malam: selisih 22,88 % -> 22,08 % BUKAN kesalahan data. Saham beredar bertambah lewat private placement Jan 2026 (3.948.141.464 -> 4.091.357.544); 903.330.281 dibagi penyebut baru = 22,08 % dan 849.764.681 dibagi penyebut baru = 20,77 %. Kesalahannya ada di kunci dan di asumsi pabrik bahwa penyebut tetap. Penyebut baru belum ada di .cache/sectors/.

## Tabel lama, dihitung ulang hari ini

Angka di tabel ini memakai rubrik lama apa adanya, tetapi dihitung ulang dengan kunci hari ini. Karena itu ia bisa berbeda dari tabel di bagian atas berkas ini, dan bedanya ada dua sebab yang keduanya di luar kendali metrik: kunci A6 dan A12 dikoreksi pemilik (angka yang dulu "tidak ada di kunci" kini ada), dan baris C3 dicabut (satu kesempatan konflik hilang untuk tiap lengan yang memakai laporan itu).

| percobaan | angka tidak cocok kunci | fakta bocor | klaim tanpa sumber | konflik tak terdeteksi | konflik terdeteksi | ajakan | skor lama | berkas mentah |
|---|---|---|---|---|---|---|---|---|
| A-1 | 0 | 0 | 0 | 1 dari 1 berlaku | 0 | 0 | **1** | `eval/keluaran/A-1.json` |
| A-2 | 0 | 1 | 0 | 1 dari 1 berlaku | 0 | 0 | **3** | `eval/keluaran/A-2.json` |
| A-3 | 3 | 1 | 0 | 1 dari 1 berlaku | 0 | 0 | **6** | `eval/keluaran/A-3.json` |
| S-1 | 5 | 1 | 0 | 2 dari 3 berlaku | 1 | 0 | **9** | `eval/keluaran/S-1.json` |
| S-2 | 2 | 1 | 0 | 3 dari 3 berlaku | 0 | 0 | **7** | `eval/keluaran/S-2.json` |
| S-3 | 6 | 1 | 0 | 1 dari 1 berlaku | 0 | 0 | **9** | `eval/keluaran/S-3.json` |
| C-1 | 2 | 1 | 0 | 0 dari 2 berlaku | 2 | 0 | **4** | `eval/keluaran/C-1.json` |
| C-2 | 2 | 1 | 0 | 0 dari 2 berlaku | 2 | 0 | **4** | `eval/keluaran/C-2.json` |
| C-3 | 2 | 1 | 0 | 0 dari 2 berlaku | 2 | 0 | **4** | `eval/keluaran/C-3.json` |

## Tabel amandemen A-1

**Kelengkapan makin besar makin baik; semua kolom lain makin kecil makin baik.** Tidak ada skor gabungan di tabel ini, dan itu disengaja: amandemen A-1 mengganti isi kolomnya tetapi tidak menetapkan bobot baru, dan menetapkan bobot sendiri sesudah melihat hasil persis pelanggaran yang dilarang aturan pelaporan 6.

| percobaan | angka bertentangan | tidak dapat diverifikasi | kelengkapan | kebocoran | klaim ketersediaan tanpa bukti | konflik terdeteksi | positif palsu | klaim tanpa sumber | ajakan | berkas mentah |
|---|---|---|---|---|---|---|---|---|---|---|
| A-1 | 0 | 18 | 7/14 | 0 | 0 | 0 dari 1 berlaku | 0 | 0 | 0 | `eval/keluaran/A-1.json` |
| A-2 | 0 | 12 | 8/14 | 0 | 1 | 0 dari 1 berlaku | 0 | 0 | 0 | `eval/keluaran/A-2.json` |
| A-3 | 0 | 10 | 7/14 | 0 | 1 | 0 dari 1 berlaku | 0 | 0 | 0 | `eval/keluaran/A-3.json` |
| S-1 | 0 | 2 | 5/14 | 0 | 1 | 1 dari 3 berlaku | 0 | 0 | 0 | `eval/keluaran/S-1.json` |
| S-2 | 0 | 1 | 7/14 | 0 | 1 | 0 dari 3 berlaku | 1 | 0 | 0 | `eval/keluaran/S-2.json` |
| S-3 | 0 | 7 | 6/14 | 0 | 1 | 0 dari 1 berlaku | 0 | 0 | 0 | `eval/keluaran/S-3.json` |
| C-1 | 0 | 1 | 13/14 | 1 | 0 | 2 dari 2 berlaku | 2 | 0 | 0 | `eval/keluaran/C-1.json` |
| C-2 | 0 | 1 | 13/14 | 1 | 0 | 2 dari 2 berlaku | 2 | 0 | 0 | `eval/keluaran/C-2.json` |
| C-3 | 0 | 1 | 13/14 | 1 | 0 | 2 dari 2 berlaku | 2 | 0 | 0 | `eval/keluaran/C-3.json` |

## Rata-rata per lengan, lama dan baru berdampingan

| lengan | n | angka salah (lama) | angka bertentangan (baru) | tidak dapat diverifikasi | kelengkapan /14 | bocor (lama) | bocor (baru) | klaim ketersediaan tanpa bukti | konflik terdeteksi | positif palsu | klaim tanpa sumber | ajakan |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 3 | 1.00 | **0.00** | 13.33 | **7.33** | 0.67 | **0.00** | **0.67** | 0.00 | **0.00** | 0.00 | 0.00 |
| S | 3 | 4.33 | **0.00** | 3.33 | **6.00** | 1.00 | **0.00** | **1.00** | 0.33 | **0.33** | 0.00 | 0.00 |
| C | 3 | 2.00 | **0.00** | 1.00 | **13.00** | 1.00 | **1.00** | **0.00** | 2.00 | **2.00** | 0.00 | 0.00 |

## Daftar pelanggaran per percobaan

INV-8: setiap angka di tabel di atas berasal dari daftar ini, dan setiap baris daftar menunjuk kalimat di berkas keluaran mentahnya.

### A-1 — `eval/keluaran/A-1.json`

Kelengkapan 7/14; baris kunci yang tidak disebut: A1, A2, A9, A11, A12, A13, A14.

- **tidak-terverifikasi** — angka 2920000000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Pada kuartal I 2025 (per 31 Maret 2025), FOLK mencatat pendapatan Rp5,43 miliar dan rugi bersih Rp2,92 miliar. -2916957033 IDR"
- **tidak-terverifikasi** — angka 2916957033: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Pada kuartal I 2025 (per 31 Maret 2025), FOLK mencatat pendapatan Rp5,43 miliar dan rugi bersih Rp2,92 miliar. -2916957033 IDR"
- **tidak-terverifikasi** — angka 2620000000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Pada kuartal II 2025 (per 30 Juni 2025), FOLK mencatat pendapatan Rp4,90 miliar dan rugi bersih Rp2,62 miliar, dengan total ekuitas Rp78,68 miliar. -2623882825 "
- **tidak-terverifikasi** — angka 78680000000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Pada kuartal II 2025 (per 30 Juni 2025), FOLK mencatat pendapatan Rp4,90 miliar dan rugi bersih Rp2,62 miliar, dengan total ekuitas Rp78,68 miliar. -2623882825 "
- **tidak-terverifikasi** — angka 2623882825: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Pada kuartal II 2025 (per 30 Juni 2025), FOLK mencatat pendapatan Rp4,90 miliar dan rugi bersih Rp2,62 miliar, dengan total ekuitas Rp78,68 miliar. -2623882825 "
- **tidak-terverifikasi** — angka 5000000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Pada 23 September 2025 harga saham FOLK melonjak dari Rp100 menjadi Rp115 (intraday sempat Rp134) dengan volume 110.089.000 lembar, jauh di atas volume harian s"
- **tidak-terverifikasi** — angka 386890000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Pada 7 Oktober 2025, aliran dana asing di saham FOLK net-jual sebesar Rp386,89 juta (beli asing Rp316,54 juta vs jual asing Rp703,43 juta), dengan porsi asing 5"
- **tidak-terverifikasi** — angka 316540000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Pada 7 Oktober 2025, aliran dana asing di saham FOLK net-jual sebesar Rp386,89 juta (beli asing Rp316,54 juta vs jual asing Rp703,43 juta), dengan porsi asing 5"
- **tidak-terverifikasi** — angka 703430000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Pada 7 Oktober 2025, aliran dana asing di saham FOLK net-jual sebesar Rp386,89 juta (beli asing Rp316,54 juta vs jual asing Rp703,43 juta), dengan porsi asing 5"
- **tidak-terverifikasi** — angka 386886200: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Pada 7 Oktober 2025, aliran dana asing di saham FOLK net-jual sebesar Rp386,89 juta (beli asing Rp316,54 juta vs jual asing Rp703,43 juta), dengan porsi asing 5"
- **tidak-terverifikasi** — angka 25650000000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Pada Mei 2026, FOLK berpartisipasi sebagai investor dalam private placement PT Diagnos Laboratorium Utama Tbk (DGNS), membeli 95.348.500 saham baru senilai seki"
- **tidak-terverifikasi** — angka 14820000000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "FOLK membukukan laba bersih Kuartal I 2026 sebesar Rp14,82 miliar, melonjak 612,8% YoY dari rugi Rp2,89 miliar pada Q1 2025, didorong tambahan agio saham dari p"
- **tidak-terverifikasi** — angka 612.8: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "FOLK membukukan laba bersih Kuartal I 2026 sebesar Rp14,82 miliar, melonjak 612,8% YoY dari rugi Rp2,89 miliar pada Q1 2025, didorong tambahan agio saham dari p"
- **tidak-terverifikasi** — angka 108.42: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "FOLK membukukan laba bersih Kuartal I 2026 sebesar Rp14,82 miliar, melonjak 612,8% YoY dari rugi Rp2,89 miliar pada Q1 2025, didorong tambahan agio saham dari p"
- **tidak-terverifikasi** — angka 137800000000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "FOLK membukukan laba bersih Kuartal I 2026 sebesar Rp14,82 miliar, melonjak 612,8% YoY dari rugi Rp2,89 miliar pada Q1 2025, didorong tambahan agio saham dari p"
- **tidak-terverifikasi** — angka 2920000000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Berdasarkan laporan keuangan kuartalan yang sudah terbit sebelum T, bagaimana tren laba/rugi bersih FOLK pada semester I 2025 (Kuartal I dan Kuartal II 2025)? D"
- **tidak-terverifikasi** — angka 2620000000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Berdasarkan laporan keuangan kuartalan yang sudah terbit sebelum T, bagaimana tren laba/rugi bersih FOLK pada semester I 2025 (Kuartal I dan Kuartal II 2025)? D"
- **tidak-terverifikasi** — angka 386890000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Fakta apa yang mengindikasikan bahwa investor asing bukan pendorong utama reli harga FOLK menjelang T? Data komposisi kepemilikan per 29 Agustus 2025 menunjukka"

### A-2 — `eval/keluaran/A-2.json`

Kelengkapan 8/14; baris kunci yang tidak disebut: A1, A2, A9, A12, A13, A14.

- **klaim-ketersediaan-tanpa-bukti** — fakta f5_suspensi_1, soal s2 menaruh suspensi 2025-10-08 di bagian terlihat dan menandainya sudah tersedia pada atau sebelum T; data kita tidak memuat tanggal pengumumannya, jadi klaim itu tidak bisa dibuktikan
- **tidak-terverifikasi** — angka 2620000000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Berdasarkan laporan keuangan kuartal II 2025 (per 30 Juni 2025), FOLK masih rugi bersih Rp2,62 miliar dari pendapatan Rp4,90 miliar, dengan total ekuitas Rp78,6"
- **tidak-terverifikasi** — angka 78680000000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Berdasarkan laporan keuangan kuartal II 2025 (per 30 Juni 2025), FOLK masih rugi bersih Rp2,62 miliar dari pendapatan Rp4,90 miliar, dengan total ekuitas Rp78,6"
- **tidak-terverifikasi** — angka 2623882825: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Berdasarkan laporan keuangan kuartal II 2025 (per 30 Juni 2025), FOLK masih rugi bersih Rp2,62 miliar dari pendapatan Rp4,90 miliar, dengan total ekuitas Rp78,6"
- **tidak-terverifikasi** — angka 83.03: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Per akhir Agustus 2025, kepemilikan saham FOLK oleh investor asing hanya 4.779.100 lembar (sekitar 0,12% dari total 3.948.141.464 saham beredar), sisanya didomi"
- **tidak-terverifikasi** — angka 16.84: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Per akhir Agustus 2025, kepemilikan saham FOLK oleh investor asing hanya 4.779.100 lembar (sekitar 0,12% dari total 3.948.141.464 saham beredar), sisanya didomi"
- **tidak-terverifikasi** — angka 386890000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Pada 7 Oktober 2025, tercatat net foreign outflow FOLK sebesar -Rp386,89 juta, berbalik dari net foreign inflow +Rp44,42 juta sehari sebelumnya. -386886200 IDR"
- **tidak-terverifikasi** — angka 386886200: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Pada 7 Oktober 2025, tercatat net foreign outflow FOLK sebesar -Rp386,89 juta, berbalik dari net foreign inflow +Rp44,42 juta sehari sebelumnya. -386886200 IDR"
- **tidak-terverifikasi** — angka 25650000000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "FOLK menyubskripsi 95.348.500 saham private placement PT Diagnos Laboratorium Utama Tbk (DGNS) senilai sekitar Rp25,65 miliar pada Juni 2026 sebagai bagian eksp"
- **tidak-terverifikasi** — angka 14820000000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "FOLK melaporkan laba bersih kuartal I 2026 sebesar Rp14,82 miliar, melonjak 613% YoY dibanding rugi Rp2,89 miliar pada Q1 2025, dengan total aset naik 93,57% da"
- **tidak-terverifikasi** — angka 613: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "FOLK melaporkan laba bersih kuartal I 2026 sebesar Rp14,82 miliar, melonjak 613% YoY dibanding rugi Rp2,89 miliar pada Q1 2025, dengan total aset naik 93,57% da"
- **tidak-terverifikasi** — angka 93.57: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "FOLK melaporkan laba bersih kuartal I 2026 sebesar Rp14,82 miliar, melonjak 613% YoY dibanding rugi Rp2,89 miliar pada Q1 2025, dengan total aset naik 93,57% da"
- **tidak-terverifikasi** — angka 108.42: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "FOLK melaporkan laba bersih kuartal I 2026 sebesar Rp14,82 miliar, melonjak 613% YoY dibanding rugi Rp2,89 miliar pada Q1 2025, dengan total aset naik 93,57% da"

Yang dihukum metrik LAMA pada percobaan ini dan tidak lagi dihukum metrik baru:
  - _(lama)_ bocor-tanggal-teks — bagian terlihat menyebut tanggal 2025-10-08, sesudah T

### A-3 — `eval/keluaran/A-3.json`

Kelengkapan 7/14; baris kunci yang tidak disebut: A1, A2, A10, A11, A12, A13, A14.

- **klaim-ketersediaan-tanpa-bukti** — fakta F14_pengumuman_suspensi menaruh suspensi 2025-10-08 di bagian terlihat dan menandainya sudah tersedia pada atau sebelum T; data kita tidak memuat tanggal pengumumannya, jadi klaim itu tidak bisa dibuktikan
- **tidak-terverifikasi** — angka 386886200: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Pada T, aliran dana asing di FOLK tercatat net jual Rp386.886.200, meskipun harga saham melonjak tajam pada hari yang sama. -386886200 IDR"
- **tidak-terverifikasi** — angka 2623882825: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Pada kuartal II 2025 (dilaporkan sebelum T), FOLK membukukan pendapatan Rp4.899.936.689 dan rugi bersih Rp2.623.882.825, dengan total ekuitas Rp78.677.560.376 d"
- **tidak-terverifikasi** — angka 78677560376: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Pada kuartal II 2025 (dilaporkan sebelum T), FOLK membukukan pendapatan Rp4.899.936.689 dan rugi bersih Rp2.623.882.825, dengan total ekuitas Rp78.677.560.376 d"
- **tidak-terverifikasi** — angka 89149874698: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Pada kuartal II 2025 (dilaporkan sebelum T), FOLK membukukan pendapatan Rp4.899.936.689 dan rugi bersih Rp2.623.882.825, dengan total ekuitas Rp78.677.560.376 d"
- **tidak-terverifikasi** — angka 14820000000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Q1 2026 FOLK mencatat laba bersih Rp14,82 miliar, naik 613% YoY dari rugi Rp2,89 miliar pada Q1 2025; total aset naik menjadi Rp147,50 miliar dan ekuitas Rp137,"
- **tidak-terverifikasi** — angka 613: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Q1 2026 FOLK mencatat laba bersih Rp14,82 miliar, naik 613% YoY dari rugi Rp2,89 miliar pada Q1 2025; total aset naik menjadi Rp147,50 miliar dan ekuitas Rp137,"
- **tidak-terverifikasi** — angka 147500000000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Q1 2026 FOLK mencatat laba bersih Rp14,82 miliar, naik 613% YoY dari rugi Rp2,89 miliar pada Q1 2025; total aset naik menjadi Rp147,50 miliar dan ekuitas Rp137,"
- **tidak-terverifikasi** — angka 137800000000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Q1 2026 FOLK mencatat laba bersih Rp14,82 miliar, naik 613% YoY dari rugi Rp2,89 miliar pada Q1 2025; total aset naik menjadi Rp147,50 miliar dan ekuitas Rp137,"
- **tidak-terverifikasi** — angka 25: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "FOLK tercatat sebagai salah satu top gainer saat IHSG naik 2,71% pada 10 Juni 2026 merespons kenaikan suku bunga BI 25 bps ke 5,50%. null "
- **tidak-terverifikasi** — angka 386886200: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Apa yang ditunjukkan data arus dana asing FOLK pada T (7 Oktober 2025)? Data foreign flow menunjukkan net jual asing sebesar Rp386.886.200 pada T, padahal harga"

Yang dihukum metrik LAMA pada percobaan ini dan tidak lagi dihukum metrik baru:
  - _(lama)_ angka-salah — angka 2558700 tidak ada di kunci, pada kalimat yang menyangkut A6 (volume pada T): "Volume transaksi FOLK pada T (7 Oktober 2025) dibandingkan rata-rata volume harian periode 1 Agustus-16 September 2025 kira-kira berapa kali lipat? Volume T seb"
  - _(lama)_ angka-salah — angka 26 tidak ada di kunci, pada kalimat yang menyangkut A6 (volume pada T): "Volume transaksi FOLK pada T (7 Oktober 2025) dibandingkan rata-rata volume harian periode 1 Agustus-16 September 2025 kira-kira berapa kali lipat? Volume T seb"
  - _(lama)_ angka-salah — angka 386886200 tidak ada di kunci, pada kalimat yang menyangkut A5 (kenaikan satu hari bursa ke T): "Apa yang ditunjukkan data arus dana asing FOLK pada T (7 Oktober 2025)? Data foreign flow menunjukkan net jual asing sebesar Rp386.886.200 pada T, padahal harga"
  - _(lama)_ bocor-tanggal-teks — bagian terlihat menyebut tanggal 2025-10-08, sesudah T

### S-1 — `eval/keluaran/S-1.json`

Kelengkapan 5/14; baris kunci yang tidak disebut: A1, A2, A5, A8, A9, A11, A12, A13, A14.

- **klaim-ketersediaan-tanpa-bukti** — fakta suspensi_cooling_1, soal s2 menaruh suspensi 2025-10-08 di bagian terlihat dan menandainya sudah tersedia pada atau sebelum T; data kita tidak memuat tanggal pengumumannya, jadi klaim itu tidak bisa dibuktikan
- **tidak-terverifikasi** — angka 386886200: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Pada 7 Oktober 2025, investor asing tercatat net jual Rp386.886.200 pada saham FOLK. -386886200 IDR"
- **tidak-terverifikasi** — angka 2623882825: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Pada kuartal II 2025 (periode berakhir 30 Juni 2025), FOLK membukukan pendapatan Rp4.899.936.689 dengan rugi bersih kuartal tersebut sebesar Rp2.623.882.825. -2"

Yang dihukum metrik LAMA pada percobaan ini dan tidak lagi dihukum metrik baru:
  - _(lama)_ angka-salah — angka 66 tidak ada di kunci, pada kalimat yang menyangkut A4 (harga penutupan pada T): "Kenaikan harga kumulatif FOLK dari penutupan 10 Juli 2025 (Rp66) ke penutupan 7 Oktober 2025 (Rp155) sekitar +135%. 134.8 persen"
  - _(lama)_ angka-salah — angka 135 tidak ada di kunci, pada kalimat yang menyangkut A4 (harga penutupan pada T): "Kenaikan harga kumulatif FOLK dari penutupan 10 Juli 2025 (Rp66) ke penutupan 7 Oktober 2025 (Rp155) sekitar +135%. 134.8 persen"
  - _(lama)_ angka-salah — angka 134.8 tidak ada di kunci, pada kalimat yang menyangkut A4 (harga penutupan pada T): "Kenaikan harga kumulatif FOLK dari penutupan 10 Juli 2025 (Rp66) ke penutupan 7 Oktober 2025 (Rp155) sekitar +135%. 134.8 persen"
  - _(lama)_ angka-salah — angka 66 tidak ada di kunci, pada kalimat yang menyangkut A4 (harga penutupan pada T): "Berapa kira-kira kenaikan harga kumulatif saham FOLK dari penutupan 10 Juli 2025 (Rp66) sampai penutupan 7 Oktober 2025/T (Rp155)? (155-66)/66 ≈ 134,8%, sesuai "
  - _(lama)_ angka-salah — angka 134.8 tidak ada di kunci, pada kalimat yang menyangkut A4 (harga penutupan pada T): "Berapa kira-kira kenaikan harga kumulatif saham FOLK dari penutupan 10 Juli 2025 (Rp66) sampai penutupan 7 Oktober 2025/T (Rp155)? (155-66)/66 ≈ 134,8%, sesuai "
  - _(lama)_ bocor-tanggal-teks — bagian terlihat menyebut tanggal 2025-10-08, sesudah T

### S-2 — `eval/keluaran/S-2.json`

Kelengkapan 7/14; baris kunci yang tidak disebut: A1, A2, A9, A11, A12, A13, A14.

- **klaim-ketersediaan-tanpa-bukti** — fakta suspensi_pertama, soal s1 menaruh suspensi 2025-10-08 di bagian terlihat dan menandainya sudah tersedia pada atau sebelum T; data kita tidak memuat tanggal pengumumannya, jadi klaim itu tidak bisa dibuktikan
- **konflik-positif-palsu** — temuan menuduh laporan 19 Mei 2026 salah persentase (C3 sudah dicabut): "Pada laporan kepemilikan Sumber Garam Pratama tanggal 19 Mei 2026, teks/field menyatakan persentase sebelum transaksi 22,08%, padahal jumlah lembar sebelum transaksi (903.330.281) identik dengan jumla"
- **tidak-terverifikasi** — angka 2623882825: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Pada kuartal II 2025 (per 30 Juni 2025), FOLK mencatat pendapatan Rp4.899.936.689 dan rugi bersih Rp2.623.882.825. -2623882825 IDR"

Yang dihukum metrik LAMA pada percobaan ini dan tidak lagi dihukum metrik baru:
  - _(lama)_ angka-salah — angka 98.7 tidak ada di kunci, pada kalimat yang menyangkut A5 (kenaikan satu hari bursa ke T): "Dalam sekitar dua bulan, harga FOLK naik dari Rp78 (1 Agustus 2025) menjadi Rp155 (7 Oktober 2025), atau sekitar +98,7%. 98.7 persen"
  - _(lama)_ angka-salah — angka 2623882825 tidak ada di kunci, pada kalimat yang menyangkut A7 (pendapatan dan laba tahun buku 2024): "Berdasarkan data kuartal II 2025 dan tahun buku 2024 yang tersedia sebelum 7 Oktober 2025, bagaimana kondisi profitabilitas FOLK menjelang T? Fakta rugi_bersih_"
  - _(lama)_ bocor-tanggal-teks — bagian terlihat menyebut tanggal 2025-10-08, sesudah T

### S-3 — `eval/keluaran/S-3.json`

Kelengkapan 6/14; baris kunci yang tidak disebut: A1, A2, A3, A5, A9, A12, A13, A14.

- **klaim-ketersediaan-tanpa-bukti** — fakta susp1, soal s2 menaruh suspensi 2025-10-08 di bagian terlihat dan menandainya sudah tersedia pada atau sebelum T; data kita tidak memuat tanggal pengumumannya, jadi klaim itu tidak bisa dibuktikan
- **tidak-terverifikasi** — angka 17.2: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Per 30 September 2025, kategori 'corporate' lokal menguasai 3.266.074.026 lembar (~82,7% dari total saham beredar), jauh di atas individu lokal yang memegang 67"
- **tidak-terverifikasi** — angka 14820000000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Laba bersih FOLK kuartal I 2026 sebesar Rp14,82 miliar, melonjak 612,8% YoY dari rugi Rp2,89 miliar; total aset naik 93,57% menjadi Rp147,50 miliar dan ekuitas "
- **tidak-terverifikasi** — angka 612.8: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Laba bersih FOLK kuartal I 2026 sebesar Rp14,82 miliar, melonjak 612,8% YoY dari rugi Rp2,89 miliar; total aset naik 93,57% menjadi Rp147,50 miliar dan ekuitas "
- **tidak-terverifikasi** — angka 147500000000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Laba bersih FOLK kuartal I 2026 sebesar Rp14,82 miliar, melonjak 612,8% YoY dari rugi Rp2,89 miliar; total aset naik 93,57% menjadi Rp147,50 miliar dan ekuitas "
- **tidak-terverifikasi** — angka 108.42: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Laba bersih FOLK kuartal I 2026 sebesar Rp14,82 miliar, melonjak 612,8% YoY dari rugi Rp2,89 miliar; total aset naik 93,57% menjadi Rp147,50 miliar dan ekuitas "
- **tidak-terverifikasi** — angka 137800000000: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Laba bersih FOLK kuartal I 2026 sebesar Rp14,82 miliar, melonjak 612,8% YoY dari rugi Rp2,89 miliar; total aset naik 93,57% menjadi Rp147,50 miliar dan ekuitas "
- **tidak-terverifikasi** — angka 17.2: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Berdasarkan komposisi pemegang saham FOLK per 30 September 2025, kategori mana yang paling mendominasi kepemilikan lokal? Kategori 'corporate_l' mencatat 3.266."

Yang dihukum metrik LAMA pada percobaan ini dan tidak lagi dihukum metrik baru:
  - _(lama)_ angka-salah — angka 33.6 tidak ada di kunci, pada kalimat yang menyangkut A4 (harga penutupan pada T), A5 (kenaikan satu hari bursa ke T), A6 (volume pada T): "Pada 7 Oktober 2025, saham FOLK dibuka di Rp116 dan ditutup di Rp155 (naik 33,6% dalam satu hari), dengan volume 66.466.200 lembar. 155 IDR/lembar"
  - _(lama)_ angka-salah — angka 80 tidak ada di kunci, pada kalimat yang menyangkut A4 (harga penutupan pada T), A5 (kenaikan satu hari bursa ke T): "Harga penutupan FOLK naik dari Rp80 pada 15 Agustus 2025 menjadi Rp155 pada 7 Oktober 2025, kenaikan sekitar 93,75% dalam kurang dari dua bulan. 93.75 persen"
  - _(lama)_ angka-salah — angka 93.75 tidak ada di kunci, pada kalimat yang menyangkut A4 (harga penutupan pada T), A5 (kenaikan satu hari bursa ke T): "Harga penutupan FOLK naik dari Rp80 pada 15 Agustus 2025 menjadi Rp155 pada 7 Oktober 2025, kenaikan sekitar 93,75% dalam kurang dari dua bulan. 93.75 persen"
  - _(lama)_ angka-salah — angka 80 tidak ada di kunci, pada kalimat yang menyangkut A4 (harga penutupan pada T): "Berapa persen kenaikan harga penutupan saham FOLK dari 15 Agustus 2025 (Rp80) ke 7 Oktober 2025/T (Rp155)? (155-80)/80 = 0,9375 atau 93,75%, dibulatkan menjadi "
  - _(lama)_ angka-salah — angka 93.75 tidak ada di kunci, pada kalimat yang menyangkut A4 (harga penutupan pada T): "Berapa persen kenaikan harga penutupan saham FOLK dari 15 Agustus 2025 (Rp80) ke 7 Oktober 2025/T (Rp155)? (155-80)/80 = 0,9375 atau 93,75%, dibulatkan menjadi "
  - _(lama)_ angka-salah — angka 94 tidak ada di kunci, pada kalimat yang menyangkut A4 (harga penutupan pada T): "Berapa persen kenaikan harga penutupan saham FOLK dari 15 Agustus 2025 (Rp80) ke 7 Oktober 2025/T (Rp155)? (155-80)/80 = 0,9375 atau 93,75%, dibulatkan menjadi "
  - _(lama)_ bocor-tanggal-teks — bagian terlihat menyebut tanggal 2025-10-08, sesudah T

### C-1 — `eval/keluaran/C-1.json`

Kelengkapan 13/14; baris kunci yang tidak disebut: A2.

- **kebocoran** — fakta laporan-kepemilikan menyebut peristiwa bertanggal 2025-10-24, sesudah T (2025-10-07)
- **konflik-positif-palsu** — temuan menuduh laporan 19 Mei 2026 salah persentase (C3 sudah dicabut): "Laporan 2026-05-19T12:50:02 menulis kepemilikan sebelum transaksi 22.08%, padahal 903.330.281 dibagi 3.948.141.464 saham beredar adalah 22.88%."
- **konflik-positif-palsu** — temuan menuduh laporan 19 Mei 2026 salah persentase (C3 sudah dicabut): "Laporan 2026-05-19T12:50:02 menulis kepemilikan sesudah transaksi 20.77%, padahal 849.764.681 dibagi 3.948.141.464 saham beredar adalah 21.52%."
- **tidak-terverifikasi** — angka 59: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Jumlah saham beredar FOLK tercatat sebanyak 3.948.141.464 lembar, konsisten selama 59 hari bursa berdasarkan perhitungan nilai pasar dibagi harga penutupan. 394"

Yang dihukum metrik LAMA pada percobaan ini dan tidak lagi dihukum metrik baru:
  - _(lama)_ angka-salah — angka 1246180419 tidak ada di kunci, pada kalimat yang menyangkut B5 (laporan pertama pemegang saham besar): "Pada 24 Oktober 2025 terbit laporan bahwa Sumber Garam Pratama menjual 197.407.074 lembar pada harga Rp170, sehingga kepemilikannya berubah dari 1.246.180.419 m"
  - _(lama)_ angka-salah — angka 1048773345 tidak ada di kunci, pada kalimat yang menyangkut B5 (laporan pertama pemegang saham besar): "Pada 24 Oktober 2025 terbit laporan bahwa Sumber Garam Pratama menjual 197.407.074 lembar pada harga Rp170, sehingga kepemilikannya berubah dari 1.246.180.419 m"
  - _(lama)_ bocor-tanggal-teks — bagian terlihat menyebut tanggal 2025-10-24, sesudah T

### C-2 — `eval/keluaran/C-2.json`

Kelengkapan 13/14; baris kunci yang tidak disebut: A2.

- **kebocoran** — fakta laporan-kepemilikan, soal s3 menyebut peristiwa bertanggal 2025-10-24, sesudah T (2025-10-07)
- **konflik-positif-palsu** — temuan menuduh laporan 19 Mei 2026 salah persentase (C3 sudah dicabut): "Laporan 2026-05-19T12:50:02 menulis kepemilikan sebelum transaksi 22.08%, padahal 903.330.281 dibagi 3.948.141.464 saham beredar adalah 22.88%."
- **konflik-positif-palsu** — temuan menuduh laporan 19 Mei 2026 salah persentase (C3 sudah dicabut): "Laporan 2026-05-19T12:50:02 menulis kepemilikan sesudah transaksi 20.77%, padahal 849.764.681 dibagi 3.948.141.464 saham beredar adalah 21.52%."
- **tidak-terverifikasi** — angka 59: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Jumlah saham beredar FOLK tercatat sebanyak 3.948.141.464 lembar, dihitung dari nilai pasar dibagi harga penutupan dan konsisten selama 59 hari bursa. 394814146"

Yang dihukum metrik LAMA pada percobaan ini dan tidak lagi dihukum metrik baru:
  - _(lama)_ angka-salah — angka 1246180419 tidak ada di kunci, pada kalimat yang menyangkut B5 (laporan pertama pemegang saham besar): "Pada 24 Oktober 2025 terbit laporan bahwa Sumber Garam Pratama menjual 197.407.074 lembar saham FOLK pada harga Rp170, sehingga kepemilikannya berubah dari 1.24"
  - _(lama)_ angka-salah — angka 1048773345 tidak ada di kunci, pada kalimat yang menyangkut B5 (laporan pertama pemegang saham besar): "Pada 24 Oktober 2025 terbit laporan bahwa Sumber Garam Pratama menjual 197.407.074 lembar saham FOLK pada harga Rp170, sehingga kepemilikannya berubah dari 1.24"
  - _(lama)_ bocor-tanggal-teks — bagian terlihat menyebut tanggal 2025-10-24, sesudah T

### C-3 — `eval/keluaran/C-3.json`

Kelengkapan 13/14; baris kunci yang tidak disebut: A2.

- **kebocoran** — fakta laporan-kepemilikan menyebut peristiwa bertanggal 2025-10-24, sesudah T (2025-10-07)
- **konflik-positif-palsu** — temuan menuduh laporan 19 Mei 2026 salah persentase (C3 sudah dicabut): "Laporan 2026-05-19T12:50:02 menulis kepemilikan sebelum transaksi 22.08%, padahal 903.330.281 dibagi 3.948.141.464 saham beredar adalah 22.88%."
- **konflik-positif-palsu** — temuan menuduh laporan 19 Mei 2026 salah persentase (C3 sudah dicabut): "Laporan 2026-05-19T12:50:02 menulis kepemilikan sesudah transaksi 20.77%, padahal 849.764.681 dibagi 3.948.141.464 saham beredar adalah 21.52%."
- **tidak-terverifikasi** — angka 59: tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima — pada kalimat "Jumlah saham FOLK yang beredar tercatat 3.948.141.464 lembar, hasil hitungan dari nilai pasar dibagi harga penutupan dan konsisten selama 59 hari bursa. 3948141"

Yang dihukum metrik LAMA pada percobaan ini dan tidak lagi dihukum metrik baru:
  - _(lama)_ angka-salah — angka 1246180419 tidak ada di kunci, pada kalimat yang menyangkut B5 (laporan pertama pemegang saham besar): "Pada 24 Oktober 2025 terbit laporan bahwa Sumber Garam Pratama menjual 197.407.074 lembar pada harga Rp170, sehingga kepemilikannya berubah dari 1.246.180.419 m"
  - _(lama)_ angka-salah — angka 1048773345 tidak ada di kunci, pada kalimat yang menyangkut B5 (laporan pertama pemegang saham besar): "Pada 24 Oktober 2025 terbit laporan bahwa Sumber Garam Pratama menjual 197.407.074 lembar pada harga Rp170, sehingga kepemilikannya berubah dari 1.246.180.419 m"
  - _(lama)_ bocor-tanggal-teks — bagian terlihat menyebut tanggal 2025-10-24, sesudah T

## Angka yang tidak dapat diverifikasi, dikumpulkan

Sebagian besar berasal dari endpoint yang TIDAK ada di `.cache/sectors/`: arus dana asing, ringkasan broker, komposisi pemegang saham, laporan keuangan kuartalan, kinerja pencatatan perdana, dan jumlah saham beredar sesudah private placement Jan 2026. Sisanya angka perkiraan yang memang tidak bisa dicocokkan ke satu nilai ("di bawah 5 juta lembar") atau angka dari peristiwa 2026 yang tidak ada di cache. Angka-angka ini **tidak dihitung salah**. Menghukumnya berarti menghukum lengan karena memakai data yang tidak kita miliki — cacat F-1 dengan arah berbeda.

| percobaan | angka | kalimat |
|---|---|---|
| A-1 | 2920000000 | Pada kuartal I 2025 (per 31 Maret 2025), FOLK mencatat pendapatan Rp5,43 miliar dan rugi bersih Rp2,92 miliar. -2916957033 IDR |
| A-1 | 2916957033 | Pada kuartal I 2025 (per 31 Maret 2025), FOLK mencatat pendapatan Rp5,43 miliar dan rugi bersih Rp2,92 miliar. -2916957033 IDR |
| A-1 | 2620000000 | Pada kuartal II 2025 (per 30 Juni 2025), FOLK mencatat pendapatan Rp4,90 miliar dan rugi bersih Rp2,62 miliar, dengan total ekuitas Rp78,68 miliar. -2 |
| A-1 | 78680000000 | Pada kuartal II 2025 (per 30 Juni 2025), FOLK mencatat pendapatan Rp4,90 miliar dan rugi bersih Rp2,62 miliar, dengan total ekuitas Rp78,68 miliar. -2 |
| A-1 | 2623882825 | Pada kuartal II 2025 (per 30 Juni 2025), FOLK mencatat pendapatan Rp4,90 miliar dan rugi bersih Rp2,62 miliar, dengan total ekuitas Rp78,68 miliar. -2 |
| A-1 | 5000000 | Pada 23 September 2025 harga saham FOLK melonjak dari Rp100 menjadi Rp115 (intraday sempat Rp134) dengan volume 110.089.000 lembar, jauh di atas volum |
| A-1 | 386890000 | Pada 7 Oktober 2025, aliran dana asing di saham FOLK net-jual sebesar Rp386,89 juta (beli asing Rp316,54 juta vs jual asing Rp703,43 juta), dengan por |
| A-1 | 316540000 | Pada 7 Oktober 2025, aliran dana asing di saham FOLK net-jual sebesar Rp386,89 juta (beli asing Rp316,54 juta vs jual asing Rp703,43 juta), dengan por |
| A-1 | 703430000 | Pada 7 Oktober 2025, aliran dana asing di saham FOLK net-jual sebesar Rp386,89 juta (beli asing Rp316,54 juta vs jual asing Rp703,43 juta), dengan por |
| A-1 | 386886200 | Pada 7 Oktober 2025, aliran dana asing di saham FOLK net-jual sebesar Rp386,89 juta (beli asing Rp316,54 juta vs jual asing Rp703,43 juta), dengan por |
| A-1 | 25650000000 | Pada Mei 2026, FOLK berpartisipasi sebagai investor dalam private placement PT Diagnos Laboratorium Utama Tbk (DGNS), membeli 95.348.500 saham baru se |
| A-1 | 14820000000 | FOLK membukukan laba bersih Kuartal I 2026 sebesar Rp14,82 miliar, melonjak 612,8% YoY dari rugi Rp2,89 miliar pada Q1 2025, didorong tambahan agio sa |
| A-1 | 612.8 | FOLK membukukan laba bersih Kuartal I 2026 sebesar Rp14,82 miliar, melonjak 612,8% YoY dari rugi Rp2,89 miliar pada Q1 2025, didorong tambahan agio sa |
| A-1 | 108.42 | FOLK membukukan laba bersih Kuartal I 2026 sebesar Rp14,82 miliar, melonjak 612,8% YoY dari rugi Rp2,89 miliar pada Q1 2025, didorong tambahan agio sa |
| A-1 | 137800000000 | FOLK membukukan laba bersih Kuartal I 2026 sebesar Rp14,82 miliar, melonjak 612,8% YoY dari rugi Rp2,89 miliar pada Q1 2025, didorong tambahan agio sa |
| A-1 | 2920000000 | Berdasarkan laporan keuangan kuartalan yang sudah terbit sebelum T, bagaimana tren laba/rugi bersih FOLK pada semester I 2025 (Kuartal I dan Kuartal I |
| A-1 | 2620000000 | Berdasarkan laporan keuangan kuartalan yang sudah terbit sebelum T, bagaimana tren laba/rugi bersih FOLK pada semester I 2025 (Kuartal I dan Kuartal I |
| A-1 | 386890000 | Fakta apa yang mengindikasikan bahwa investor asing bukan pendorong utama reli harga FOLK menjelang T? Data komposisi kepemilikan per 29 Agustus 2025  |
| A-2 | 2620000000 | Berdasarkan laporan keuangan kuartal II 2025 (per 30 Juni 2025), FOLK masih rugi bersih Rp2,62 miliar dari pendapatan Rp4,90 miliar, dengan total ekui |
| A-2 | 78680000000 | Berdasarkan laporan keuangan kuartal II 2025 (per 30 Juni 2025), FOLK masih rugi bersih Rp2,62 miliar dari pendapatan Rp4,90 miliar, dengan total ekui |
| A-2 | 2623882825 | Berdasarkan laporan keuangan kuartal II 2025 (per 30 Juni 2025), FOLK masih rugi bersih Rp2,62 miliar dari pendapatan Rp4,90 miliar, dengan total ekui |
| A-2 | 83.03 | Per akhir Agustus 2025, kepemilikan saham FOLK oleh investor asing hanya 4.779.100 lembar (sekitar 0,12% dari total 3.948.141.464 saham beredar), sisa |
| A-2 | 16.84 | Per akhir Agustus 2025, kepemilikan saham FOLK oleh investor asing hanya 4.779.100 lembar (sekitar 0,12% dari total 3.948.141.464 saham beredar), sisa |
| A-2 | 386890000 | Pada 7 Oktober 2025, tercatat net foreign outflow FOLK sebesar -Rp386,89 juta, berbalik dari net foreign inflow +Rp44,42 juta sehari sebelumnya. -3868 |
| A-2 | 386886200 | Pada 7 Oktober 2025, tercatat net foreign outflow FOLK sebesar -Rp386,89 juta, berbalik dari net foreign inflow +Rp44,42 juta sehari sebelumnya. -3868 |
| A-2 | 25650000000 | FOLK menyubskripsi 95.348.500 saham private placement PT Diagnos Laboratorium Utama Tbk (DGNS) senilai sekitar Rp25,65 miliar pada Juni 2026 sebagai b |
| A-2 | 14820000000 | FOLK melaporkan laba bersih kuartal I 2026 sebesar Rp14,82 miliar, melonjak 613% YoY dibanding rugi Rp2,89 miliar pada Q1 2025, dengan total aset naik |
| A-2 | 613 | FOLK melaporkan laba bersih kuartal I 2026 sebesar Rp14,82 miliar, melonjak 613% YoY dibanding rugi Rp2,89 miliar pada Q1 2025, dengan total aset naik |
| A-2 | 93.57 | FOLK melaporkan laba bersih kuartal I 2026 sebesar Rp14,82 miliar, melonjak 613% YoY dibanding rugi Rp2,89 miliar pada Q1 2025, dengan total aset naik |
| A-2 | 108.42 | FOLK melaporkan laba bersih kuartal I 2026 sebesar Rp14,82 miliar, melonjak 613% YoY dibanding rugi Rp2,89 miliar pada Q1 2025, dengan total aset naik |
| A-3 | 386886200 | Pada T, aliran dana asing di FOLK tercatat net jual Rp386.886.200, meskipun harga saham melonjak tajam pada hari yang sama. -386886200 IDR |
| A-3 | 2623882825 | Pada kuartal II 2025 (dilaporkan sebelum T), FOLK membukukan pendapatan Rp4.899.936.689 dan rugi bersih Rp2.623.882.825, dengan total ekuitas Rp78.677 |
| A-3 | 78677560376 | Pada kuartal II 2025 (dilaporkan sebelum T), FOLK membukukan pendapatan Rp4.899.936.689 dan rugi bersih Rp2.623.882.825, dengan total ekuitas Rp78.677 |
| A-3 | 89149874698 | Pada kuartal II 2025 (dilaporkan sebelum T), FOLK membukukan pendapatan Rp4.899.936.689 dan rugi bersih Rp2.623.882.825, dengan total ekuitas Rp78.677 |
| A-3 | 14820000000 | Q1 2026 FOLK mencatat laba bersih Rp14,82 miliar, naik 613% YoY dari rugi Rp2,89 miliar pada Q1 2025; total aset naik menjadi Rp147,50 miliar dan ekui |
| A-3 | 613 | Q1 2026 FOLK mencatat laba bersih Rp14,82 miliar, naik 613% YoY dari rugi Rp2,89 miliar pada Q1 2025; total aset naik menjadi Rp147,50 miliar dan ekui |
| A-3 | 147500000000 | Q1 2026 FOLK mencatat laba bersih Rp14,82 miliar, naik 613% YoY dari rugi Rp2,89 miliar pada Q1 2025; total aset naik menjadi Rp147,50 miliar dan ekui |
| A-3 | 137800000000 | Q1 2026 FOLK mencatat laba bersih Rp14,82 miliar, naik 613% YoY dari rugi Rp2,89 miliar pada Q1 2025; total aset naik menjadi Rp147,50 miliar dan ekui |
| A-3 | 25 | FOLK tercatat sebagai salah satu top gainer saat IHSG naik 2,71% pada 10 Juni 2026 merespons kenaikan suku bunga BI 25 bps ke 5,50%. null  |
| A-3 | 386886200 | Apa yang ditunjukkan data arus dana asing FOLK pada T (7 Oktober 2025)? Data foreign flow menunjukkan net jual asing sebesar Rp386.886.200 pada T, pad |
| S-1 | 386886200 | Pada 7 Oktober 2025, investor asing tercatat net jual Rp386.886.200 pada saham FOLK. -386886200 IDR |
| S-1 | 2623882825 | Pada kuartal II 2025 (periode berakhir 30 Juni 2025), FOLK membukukan pendapatan Rp4.899.936.689 dengan rugi bersih kuartal tersebut sebesar Rp2.623.8 |
| S-2 | 2623882825 | Pada kuartal II 2025 (per 30 Juni 2025), FOLK mencatat pendapatan Rp4.899.936.689 dan rugi bersih Rp2.623.882.825. -2623882825 IDR |
| S-3 | 17.2 | Per 30 September 2025, kategori 'corporate' lokal menguasai 3.266.074.026 lembar (~82,7% dari total saham beredar), jauh di atas individu lokal yang m |
| S-3 | 14820000000 | Laba bersih FOLK kuartal I 2026 sebesar Rp14,82 miliar, melonjak 612,8% YoY dari rugi Rp2,89 miliar; total aset naik 93,57% menjadi Rp147,50 miliar da |
| S-3 | 612.8 | Laba bersih FOLK kuartal I 2026 sebesar Rp14,82 miliar, melonjak 612,8% YoY dari rugi Rp2,89 miliar; total aset naik 93,57% menjadi Rp147,50 miliar da |
| S-3 | 147500000000 | Laba bersih FOLK kuartal I 2026 sebesar Rp14,82 miliar, melonjak 612,8% YoY dari rugi Rp2,89 miliar; total aset naik 93,57% menjadi Rp147,50 miliar da |
| S-3 | 108.42 | Laba bersih FOLK kuartal I 2026 sebesar Rp14,82 miliar, melonjak 612,8% YoY dari rugi Rp2,89 miliar; total aset naik 93,57% menjadi Rp147,50 miliar da |
| S-3 | 137800000000 | Laba bersih FOLK kuartal I 2026 sebesar Rp14,82 miliar, melonjak 612,8% YoY dari rugi Rp2,89 miliar; total aset naik 93,57% menjadi Rp147,50 miliar da |
| S-3 | 17.2 | Berdasarkan komposisi pemegang saham FOLK per 30 September 2025, kategori mana yang paling mendominasi kepemilikan lokal? Kategori 'corporate_l' menca |
| C-1 | 59 | Jumlah saham beredar FOLK tercatat sebanyak 3.948.141.464 lembar, konsisten selama 59 hari bursa berdasarkan perhitungan nilai pasar dibagi harga penu |
| C-2 | 59 | Jumlah saham beredar FOLK tercatat sebanyak 3.948.141.464 lembar, dihitung dari nilai pasar dibagi harga penutupan dan konsisten selama 59 hari bursa. |
| C-3 | 59 | Jumlah saham FOLK yang beredar tercatat 3.948.141.464 lembar, hasil hitungan dari nilai pasar dibagi harga penutupan dan konsisten selama 59 hari burs |

## Aturan kelengkapan yang dipakai

| baris kunci | yang dicari |
|---|---|
| A1 | harga penutupan 15 Jul 2025 (mode `angka+tanggal`) |
| A2 | harga penutupan 15 Sep 2025 (mode `angka+tanggal`) |
| A3 | harga penutupan 6 Okt 2025 (mode `angka+tanggal`) |
| A4 | harga penutupan pada T (mode `angka+tanggal`) |
| A5 | kenaikan satu hari bursa ke T (mode `angka`) |
| A6 | volume pada T dan rasionya (mode `angka+tanggal`) |
| A7 | kinerja tahun buku 2024 (mode `angka`) |
| A8 | kinerja tahun buku 2023 (mode `angka`) |
| A9 | kinerja tahun buku 2022 (mode `angka`) |
| A10 | nilai pasar pada T (mode `angka+tanggal`) |
| A11 | dividen tidak pernah ada (mode `teks`) |
| A12 | RUPS yang sudah terjadi sampai T (mode `teks+tanggal`) |
| A13 | belum ada laporan kepemilikan sampai T (mode `teks`) |
| A14 | belum ada suspensi sampai T (mode `teks`) |

## Apa yang berubah, dan apa yang tidak

**Berubah.** Dengan acuan data mentah, jumlah angka yang bertentangan di seluruh sembilan percobaan adalah **0**. Kesimpulan lama "lengan S paling banyak salah angka" **tidak bertahan**: yang diukur metrik lama ternyata seberapa rinci sebuah lengan menulis, bukan seberapa benar. Urutan lengan pada kolom ketepatan karena itu tidak lagi bisa dipakai memisahkan ketiganya.

**Berubah.** Kelengkapan yang dulu tidak pernah diukur kini terlihat sebagai pembeda yang jelas: C 13.00/14 · A 7.33/14 · S 6.00/14. Lengan C menyebut hampir seluruh baris kunci karena fakta-faktanya datang dari pipeline yang memang menyisir data; lengan MCP menukar cakupan dengan kedalaman pada sedikit fakta pilihannya sendiri.

**Berubah.** Kebocoran tidak lagi sama untuk ketiganya. Lengan C membocorkan 24 Okt di bagian yang dilihat pemain pada ketiga ulangan — cacat produk kita sendiri, bukan cacat metrik. Lengan A dan S tidak membocorkan apa pun pada kolom itu; yang mereka lakukan adalah mengklaim suspensi 8 Okt sudah tersedia pada 7 Okt, dan itu sekarang berdiri di kolomnya sendiri.

**Berubah.** Sesudah C3 dicabut, melaporkan "persentase tidak nyambung" pada laporan 19 Mei 2026 menjadi positif palsu: C 2 per puzzle, S 0.33 per puzzle, A 0. Penyebabnya asumsi pipeline bahwa jumlah saham beredar tetap.

**Tidak berubah.** Amandemen ini tidak menyentuh deteksi konflik selain mencabut C3, tidak menyentuh biaya, dan tidak menyentuh kestabilan. Angka biaya per puzzle, jumlah kredit Sectors, jumlah token, dan ragam skor antar ulangan seluruhnya tetap seperti di bagian atas berkas ini, karena dihitung dari medan yang sama di berkas keluaran yang sama dan tidak ada percobaan baru yang dijalankan.

**Tidak berubah.** Kolom "klaim tanpa sumber" dan "ajakan bertransaksi" tetap nol di seluruh percobaan, dan kolom "lolos skema" tetap sembilan dari sembilan. Ketiganya bukan pembeda pada kasus ini.

**Batas yang harus ikut dibaca.** Semesta angka mentah kita berisi ribuan nilai dan toleransinya 1 %, jadi sebuah angka bisa "cocok data" karena kebetulan berselisih kurang dari 1 % dari medan yang tidak ada hubungannya. Setiap kecocokan semacam itu ditandai "penjelasan lemah" beserta medan asalnya di daftar pelanggaran, supaya bisa dibantah tangan. Selain itu, 13.3 angka per puzzle di lengan A dan 3.3 di lengan S memang tidak bisa diperiksa sama sekali dengan cache yang kita punya; uji ini tidak berhak menyebut angka-angka itu benar maupun salah.

