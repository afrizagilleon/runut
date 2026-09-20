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

