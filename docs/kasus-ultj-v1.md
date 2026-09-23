# Kasus ULTJ v1 — dividen tiap tahun, dan orang dalam yang membeli

Kasus kedua. Bentuk layarnya mengikuti `docs/kasus-dada-v3.md` (urutan layar,
pesan teman, delapan aturan penulisan); yang ditulis di sini adalah isinya.
Berkasnya `cases/ultj-2026-05-04.json`, dibangun
`npm run build:case -- ultj-2026-05-04` dari `.cache/sectors/ULTJ-*.json`.

**Golongan pelajarannya: tanpa masalah yang terbaca di dokumen.** Labelnya
peristiwa, bukan penilaian — perusahaan membagi dividen tunai tiap tahun, dan
orang dalamnya melaporkan pembelian. Tidak satu kata penilaian saham pun ada di
berkas kasus ini maupun di dokumen ini; daftar kata yang dilarang, beserta
grep-nya, hidup di `factory/kasus/ultj.test.ts`, supaya ia dijaga tes dan bukan
niat.

**T = Senin, 4 Mei 2026** — hari pertama saham itu diperdagangkan tanpa hak
dividen Rp130 per lembar.

## Kenapa T = 4 Mei 2026

Satu-satunya tanggal di cache yang memegang **dua** peristiwa yang diminta
sekaligus: tanggal ex dividen, dan laporan pembelian orang dalam yang sudah
terbit sebelumnya. Tanggal ex 15 Mei 2025 (dividen Rp45) juga ada di dalam
deret harga, tetapi pada tanggal itu belum ada satu pun laporan kepemilikan —
yang paling awal di cache bertanggal 6 Januari 2026.

Deret harganya utuh 285 hari bursa, 15 Juli 2025 sampai 18 September 2026, dan
T berada di baris ke-194: 193 hari bursa sebelumnya, 91 sesudahnya. Pemecahan
saham ULTJ satu-satunya tercatat 10 Agustus 2017, jauh di luar jendela, dan
`right_issue` kosong — jadi kartu harga tidak melintasi aksi korporasi apa pun.

**Pengakuan atas batasnya.** Endpoint aksi korporasi tidak memuat `cum_date`.
"Hari bursa terakhir yang masih dapat dividen" karena itu **tidak** dijadikan
klaim; kartu hanya menyebut "hari bursa terakhir sebelum hari ini", yang murni
fakta harga.

## Layar pertama (M3.9, varian A uji K-06)

Halaman kalender besar (`MEI 2026` / `4` / `SENIN`), lalu:

- Judul: **Cek omongan saham di grup ke dokumen resminya.** (sama dengan DADA)
- Satu contoh gelembung, dibaca dari pesan soal 1: **Nadia** · *Saham U dibuka anjlok Rp145, padahal dividennya Rp45. Pasti ada kabar buruk!*
- Ajakan: **Betul atau keliru?**
- Tombol: **Mulai kasus**
- Baris meta: *3 soal · sekitar 5 menit · tanpa akun, tanpa skor*
- Kaki halaman: tiga kalimat tetap, di bawah lipatan.

"Kita mundur ke Senin, 4 Mei 2026." dan kalimat "Grup obrolanmu ramai…" dihapus (alasannya di
`docs/kasus-dada-v3.md`, bagian layar pertama). Patokan gambarnya: `docs/contoh/k06/a-ultj-*.png`.

## Soal 1 — Nadia, 17.58 (M3.9: pemanasan, varian A uji K-06)

**Soal 1 lama gagal tebak buta 3/3** — penguji yang TIDAK melihat kartu menebak jawabannya tiga dari tiga kali (turunnya
"jauh lebih gede" dari dividen terjawab dari pesannya sendiri). **Versi ini 0/3** (uji K-06). Seluruh kata disalin
persis dari kontrak M3.9 D-4 dan dijaga huruf demi huruf oleh `factory/kasus/soal1-k06.test.ts`.

**Petunjuk:** tidak ada.

**Pesan:** Saham U dibuka anjlok Rp145, padahal dividennya Rp45. Pasti ada kabar buruk!

"Rp45" adalah dividen 2025 yang tercatat (kartu riwayat di soal 2) — angka keliru yang sungguh ada; ia tidak
"dibetulkan". "Kabar buruk" adalah satu-satunya pengecualian bernama dari kata terlarang `ultj.test.ts`: ia menilai
kabar yang dibayangkan Nadia, bukan sahamnya.

**Pengantar kartu:** Betul atau keliru? Cek ke dua dokumen ini:

**Kartu 1 (penentu) — `div-2026-05-04`** · *Pengumuman dividen · 4 Mei 2026* (tanpa "ex" — keputusan reviewer
24 Sep sesudah K-06: kata itu keluhan utama penguji ULTJ, dan isi kartunya sudah mengatakan artinya)
> Dividen tunai **Rp130 per lembar**. Pembeli mulai hari ini tidak kebagian.

**Kartu 2 — `turun-2026-05-04`** (turunan, menggantikan `beda-turun-dividen`) · *Dihitung dari data harga*
> Hari ini dibuka **Rp145** di bawah penutupan terakhir.

"Lihat cara menghitungnya" di kartu 2 memperlihatkan kedua harga asalnya: penutupan 30 April 2026 Rp1.690 dan
pembukaan 4 Mei 2026 Rp1.545 (`.cache/sectors/ULTJ-daily-2026q2.json`; 1.690 − 1.545 = 145, dihitung ulang dari
baris mentah di `ultj.test.ts`).

**Arti istilah:** Tanggal ex (arti versi M4 apa adanya). "Dividen tunai" keluar dari soal ini.

**Judul pertanyaan:** Omongan Nadia cocok dengan dokumennya?

- a. Betul, dividennya memang cuma Rp45 per lembar.
- **b. Keliru, dividennya Rp130, bukan Rp45.** ← jawaban
- c. Betul, turunnya lebih dari tiga kali dividennya.
- d. Keliru, dividennya Rp160, bukan Rp45.

**Kartu penentu:** Kartu 1.

**Teks kunci:** Nadia memakai angka yang keliru: dividen yang tanggal ex-nya hari ini Rp130 per lembar, bukan Rp45.
Turunnya Rp145 hanya Rp15 lebih besar dari dividen itu (penutupan terakhir Rp1.690, pembukaan hari ini Rp1.545). Pada
tanggal ex, uang sebesar dividen berpindah dari perusahaan ke pemilik saham, jadi harga per lembarnya menyesuaikan.
Yang tidak dikatakan kartu mana pun: apakah sisa Rp15 itu punya sebab. Salah-kaprah yang umum: mencari kabar buruk
untuk setiap penurunan harga sebelum mencocokkan angkanya dengan dokumen hari itu.

(Rujukan angka: Rp45 → `div-2025-05-15`, Rp160 → pengandaian, Rp15 → `beda-turun-dividen`, fakta yang tetap lahir
walau bukan kartu lagi.)

## Soal 2 — Fajar, 18.11

**Pesan:** Gue baru buka riwayat dividennya. Perusahaan U ini bagi dividen tiap
tahun tanpa putus sejak 2020, dan jumlah per lembarnya naik terus tiap tahun.
Rapi banget.

**Kartu 1 — `dividen-tercatat`** · *Riwayat dividen · 2020–2026*
> Tercatat satu pembagian dividen tunai di tiap tahun, menurut tanggal ex-nya: **2020 Rp12**, **2021 Rp85**, **2022 Rp25**, **2023 Rp30**, **2024 Rp40**, **2025 Rp45**, **2026 Rp130** per lembar.

**Kartu 2 — `tahun-berdividen`** (turunan) · *Dihitung dari riwayat di atas*
> **Tujuh tahun berturut-turut** ada pembagian. Jumlah per lembarnya tidak selalu naik: dari **Rp85 di 2021** turun ke **Rp25 di 2022**, baru naik lagi tiap tahun sampai **Rp130**.

**Arti istilah:** Per lembar.

**Judul pertanyaan:** Omongan Fajar cocok dengan dokumennya?

- **a. Keliru, tiap tahun memang ada, tetapi jumlahnya pernah turun jauh.** ← jawaban
- b. Betul, tiap tahun ada pembagian dan jumlahnya naik di tahun berikutnya.
- c. Betul, jumlahnya sempat datar dua tahun, tetapi tidak pernah turun.
- d. Keliru, ada satu tahun tanpa pembagian sama sekali di tengah deret.

**Kartu penentu:** Kartu 2.

Kartunya sengaja **tidak** mengatakan "perusahaan selalu membagi dividen",
hanya "tercatat di tiap tahun 2020–2026": daftar aksi korporasi tidak bisa
dibuktikan habis. Riwayatnya berhenti di 2020 karena tidak ada entri sebelum
itu di data, dan pemecahan saham 2017 membuat angka sebelumnya tidak sebanding.

## Soal 3 — Rio, 18.26

**Pesan:** Jangan kegeeran dulu. Gue baca laporan Januari: pemilik terbesarnya
yang 53 persen itu ikut beli juga, bukan cuma orang dalam yang porsinya kecil.

**Kartu 1 — `fil-2026-01-06-01`** · *Laporan pemilik terbesar · Jan*
> Pemilik terbesar Perusahaan U melaporkan **dua pembelian**, terbit **6** dan **7 Januari 2026**: **700.000** lalu **300.000 lembar**. Porsinya hanya naik sehelai — dari **53,16%** ke **53,17%** — tapi itu **1 juta lembar**.

**Kartu 2 — `fil-2026-01-06-02`** · *Laporan orang dalam lain · Jan*
> Seorang orang dalam lain melaporkan **enam pembelian**, terbit **6** sampai **22 Januari 2026**. Ia menambah **16,07 juta lembar**, dan porsinya bergerak dari **1,21%** ke **1,37%**.

**Kartu 3 — `tambahan-jan-2026`** (turunan) · *Dihitung dari laporan di atas*
> **Kedelapan laporan** itu pembelian. Pemilik terbesar menambah **1 juta lembar** lewat **dua laporan**; orang dalam lain menambah **16,07 juta lembar** lewat **enam laporan**. Seluruhnya **17,07 juta lembar**.

**Arti istilah:** Orang dalam.

**Judul pertanyaan:** Omongan Rio cocok dengan dokumennya?

- a. Keliru, pemilik terbesarnya tidak tercatat membeli satu lembar pun.
- b. Betul, pemilik terbesarnya tercatat membeli lewat satu laporan besar.
- c. Keliru, yang tercatat membeli bulan itu justru pemilik terbesar sendirian.
- **d. Betul, pemilik terbesarnya tercatat membeli sejuta lembar di dua laporan.** ← jawaban

**Kartu penentu:** Kartu 1, dibantu Kartu 3.

Satu dari tiga omongan **betul**, dan yang betul justru yang paling curiga
nadanya — Rio membuka dengan "jangan kegeeran dulu" dan ternyata cocok dengan
dokumen; yang keliru satu cemas (Nadia) dan satu kagum (Fajar). Susunan itu
disengaja supaya kasus ini tidak terbaca sebagai "yang curiga selalu salah"
maupun sebagai iklan untuk sahamnya. Posisi jawaban benar b · a · d.

## Layar pembukaan

**Nama aslinya:** PT Ultrajaya Milk Industry & Trading Company Tbk (ULTJ).

Garis waktu (semuanya fakta bertanggal dari `.cache/sectors/`):

1. **5 Mei 2026** — hari bursa berikutnya ditutup Rp1.700, di atas Rp1.690.
2. **22 Mei 2026** — terbit lagi satu laporan pembelian orang dalam, 3.000.000 lembar; di hari yang sama dividen Rp130 per lembar dibayarkan.
3. **8 Juni 2026** — harga menyentuh Rp1.210 di dalam hari, ditutup Rp1.245.
4. **18 September 2026** — harga menyentuh Rp2.190, ditutup Rp2.060; volume sehari 123.380.100 lembar, enam kali volume hari sebelumnya.
5. **27 Oktober 2026** — satu rapat pemegang saham lagi dijadwalkan; teks keputusannya belum ada di data.

**Yang kami singkirkan dari kartu, dan sebabnya** — empat butir, semuanya ada
di layar itu: nama orang (sumber mengejanya dua cara, jadi kartu memakai
peran); harga yang ditulis laporan (satu laporan Januari menulis rata-rata jauh
di bawah tiap butir transaksinya sendiri, karena butir tanpa harga dihitung
nol); rantai laporan yang putus **sesudah** hari itu; dan laba per lembar
(penyebutnya berganti antar tahun, dan tanggal terbit laporan tahunan tidak ada
di data, jadi tidak bisa dipastikan angkanya sudah bisa dibaca pada T).

**Pesan penutup kasus ini:** *Ini kasus yang kedua. Kasus lain: perusahaan yang
harganya melonjak sementara pemilik besarnya menjual.* Ia hanya tampil ketika
tidak ada lagi kasus yang belum dimainkan.

## Jejak verifikasi

Kasus ini dibangun lewat **himpunan aturan V2** (`ATURAN_V2`), bukan V1 yang
membangun DADA: 35 aturan, **28 dijalankan**, 7 dilewati beserta alasannya.
Hasilnya 7 temuan, dan **tidak satu pun berkeparahan `konflik`** — jadi tidak
ada fakta yang gugur sebagai kartu. Kalimat jejaknya mengatakan itu apa adanya:
*"Hasilnya 7 hal yang tidak cocok, tetapi tidak satu pun membuat sebuah angka
gugur sebagai kartu."*

Dua dari tujuh temuan itu justru yang membentuk kartunya: R22 (satu orang, dua
ejaan) adalah alasan kartu memakai peran, dan R17B (dua butir transaksi tanpa
harga, rata-rata laporan Rp910,143) adalah alasan tidak satu kartu pun memakai
harga yang ditulis laporan.

**Yang diverifikasi adalah dunia pemain.** `bangunKasusUmum()` menjalankan V2
atas dokumen yang sudah terbit pada T (`dataSampai`), sementara pustaka
faktanya dibangun dari data penuh — layar pembukaan memang bercerita tentang
sesudah T. Atas data penuh, R14 melahirkan satu temuan berkeparahan `konflik`
yang **seluruh buktinya** laporan 22 Mei 2026, tiga minggu sesudah T; temuan
itu akan menjatuhkan dua kartu soal 3 yang pada 4 Mei tidak punya cacat apa pun
yang bisa dibaca siapa pun. Jeda 9.089.400 lembar itu tetap disebut sendiri di
layar pembukaan.

## Setiap angka dihitung ulang

`factory/kasus/ultj.test.ts` menghitung ulang tiap fakta berangka dari JSON
mentah dengan rumus yang ditulis terpisah dari pabriknya — 40 fakta, nol
selisih, nol fakta tanpa rumus pemeriksa. Pemeriksaan keduanya menelusuri tiap
angka yang **dibaca pemain** kembali ke fakta yang ditautkannya.
