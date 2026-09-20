# Kasus DADA — beku pada 8 Oktober 2025

Nama samaran di batang soal: **"Perusahaan D"**, sektor properti, Papan Pengembangan.
Nama asli dibuka di bagian pembukaan: **PT Diamond Citra Propertindo Tbk (DADA)**.

Semua angka di bawah diverifikasi pemilik pada 19–20 Sep 2026 dari data di `.cache/`. Eksekutor tidak boleh mengarang angka baru; kalau perhitungan berbeda, laporkan di §9 kontrak.

## Fakta yang terlihat pemain (tersedia sampai 8 Okt 2025)

| id | klaim | sumber | tersedia_sejak |
|---|---|---|---|
| `harga-2025-08-01` | Harga penutupan 1 Agu 2025 Rp8 | `/v2/daily/DADA/?start=2025-08-01&end=2025-10-29` | 2025-08-01 |
| `harga-2025-10-08` | Harga penutupan 8 Okt 2025 Rp178 | sama | 2025-10-08 |
| `kenaikan-agu-okt` | Naik hampir setiap hari dari Rp8 ke Rp178 dalam 48 hari bursa | turunan dari deret harga | 2025-10-08 |
| `susp-2025-06-30` | Disuspensi 30 Jun 2025: belum menyampaikan laporan keuangan auditan tahunan | `/v2/suspensions/?symbol=DADA` | 2025-06-30 |
| `fin-2024` | FY2024: pendapatan Rp37 M, laba bersih Rp1,1 M | halaman laporan keuangan Sectors | sebelum T (tanggal terbit belum dipastikan → tandai BELUM kalau tidak bisa ditentukan) |
| `div-2025` | Dividen Rp0,14 per lembar, ex-date 16 Sep 2025 | `/v2/company/corporate-actions/DADA/` | 2025-09-16 |
| `fil-2025-08-25` | Pengendali menjual 369.500.000 lembar @Rp12–14 (dilaporkan 25 Agu 2025); kepemilikan 64,48% → 59,375% | `/v2/filings/?symbol=DADA` | 2025-08-25 |
| `fil-2025-09-01` | Pengendali menjual 50.000.000 lembar @Rp15 (dilaporkan 1 Sep 2025); 59,38% → 58,70% | sama | 2025-09-01 |
| `fil-2025-09-29` | Pengendali menjual 10.000.000 lembar @Rp165 (dilaporkan 29 Sep 2025); 58,70% → 58,57% | sama | 2025-09-29 |
| `saham-beredar` | Saham beredar 7.431.815.981 lembar (dihitung dari lembar ÷ persen di filing) | turunan | sebelum T |

## Soal

### Soal 1 — sinyal resmi dan rumor
**Batang:** Beredar kabar di media sosial bahwa Perusahaan D akan dibeli investor besar dari luar negeri. Dari daftar fakta di atas, informasi mana yang berasal dari perusahaan atau bursa, dan adakah yang mendukung kabar itu?
**Jawaban:** Yang resmi: pengumuman suspensi dari bursa, laporan keuangan, jadwal dividen, dan laporan transaksi pengendali. Tidak ada satu pun yang menyebut rencana akuisisi.
**Penjelasan:** Harga naik sekitar 22 kali lipat, sementara laba setahun perusahaan Rp1,1 miliar. Kenaikan harga adalah data pasar; ia memberi tahu bahwa banyak orang bertransaksi, bukan mengapa.
**fact_ids:** `harga-2025-08-01`, `harga-2025-10-08`, `susp-2025-06-30`, `fin-2024`, `div-2025`, `fil-2025-08-25`

### Soal 2 — hak pemilik kecil
**Batang:** Kamu memegang 10 lot (1.000 lembar) sejak sebelum 16 September 2025. Berapa dividen tunai yang kamu terima?
**Jawaban:** 1.000 × Rp0,14 = **Rp140**.
**Penjelasan:** Dividen dihitung per lembar dan berasal dari laba perusahaan. Angka ini memperlihatkan bahwa kenaikan harga 22 kali lipat tidak datang dari pembagian laba.
**fact_ids:** `div-2025`

### Soal 3 — membaca pemilik
**Batang:** Selama harga naik, apa yang dilakukan pemegang saham terbesar, dan pada harga berapa?
**Jawaban:** Mengurangi kepemilikan dari 64,48% ke 58,57%, sebagian besar di harga **Rp12–15**, jauh di bawah harga pasar 8 Oktober.
**Penjelasan:** Pemegang saham besar berhak menjual di harga yang mereka sepakati. Yang perlu dipahami pembeli baru adalah siapa yang menjadi penjual ketika mereka membeli. Perhatikan juga tanggalnya: transaksi baru diketahui publik ketika laporannya terbit.
**fact_ids:** `fil-2025-08-25`, `fil-2025-09-01`, `fil-2025-09-29`, `harga-2025-10-08`

## Pembukaan (hanya muncul setelah pemain menjawab)

| id | klaim | sumber | tersedia_sejak |
|---|---|---|---|
| `susp-2025-10-09` | 9 Okt 2025 disuspensi: kenaikan harga kumulatif signifikan, dalam rangka cooling down | `/v2/suspensions/` | 2025-10-09 |
| `harga-2025-10-10` | 10 Okt dibuka lagi: buka Rp177, tertinggi Rp240, tutup Rp152, volume 5.112.760.000 lembar | `/v2/daily/` | 2025-10-10 |
| `harga-2025-10-22` | 22 Okt Rp50 | `/v2/daily/` | 2025-10-22 |
| `fil-2025-10-19` | Pengendali melaporkan penjualan di Rp220–232 (dilaporkan 19 Okt 2025) | `/v2/filings/` | 2025-10-19 |
| `fil-2025-10-26` | Pengendali melaporkan penjualan di Rp51–56 (dilaporkan 26 Okt 2025) | `/v2/filings/` | 2025-10-26 |
| `rups-2026-07-16` | RUPS 16 Jul 2026 gagal kuorum: hadir 22,32% saham | `/v2/company/corporate-actions/` | 2026-07-16 |

Kalimat pembukaan: harga tertinggi tercapai sehari setelah bursa menghentikan perdagangan; dua belas hari kemudian harga kembali ke Rp50. Setahun kemudian, RUPS perusahaan ini gagal kuorum karena hanya 22,32% saham yang hadir, padahal pemegang sahamnya puluhan ribu orang.

## Temuan verifikasi yang harus muncul di jejak kasus

1. **R3 laporan ganda** — enam transaksi 23 Okt 2025 dilaporkan dua kali (586.000.000 lembar, 7,89%).
2. **R2 lompatan** +79.272.900 lembar (19 Okt 01:10 → 23:09).
3. **R2 lompatan** −1.660.008.900 lembar (19 Okt 23:10 → 23:44).

Temuan ini **tidak** ditampilkan di soal utama M1; ia disimpan di jejak kasus dan ditampilkan di bagian "jejak verifikasi". Soal tentang verifikasi data dibuat di milestone berikutnya.

## Kartu konsep yang dipakai
`A2 lot dan lembar` · `A4 kapitalisasi pasar` · `B1 dividen dan tanggal cum/ex` · `C1 pengendali` · `C3 tanggal transaksi vs tanggal laporan` · `D1 suspensi` · `D2 cooling down vs sampai pengumuman lebih lanjut` · `D4 suspensi karena telat lapor` · `E1 pendapatan dan laba`

## Tiga kalimat tetap
1. Data ini menggambarkan keadaan pada 8 Oktober 2025 dan bukan kondisi perusahaan sekarang.
2. Produk ini tidak menyarankan membeli atau menjual efek apa pun.
3. Setiap angka di halaman ini bisa ditelusuri ke sumbernya.
