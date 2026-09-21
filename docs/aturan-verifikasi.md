# Aturan verifikasi

Aturan ini lahir dari memverifikasi tujuh emiten dengan tangan pada 19–20 September 2026. Enam di antaranya punya setidaknya satu kesalahan data yang mengubah kesimpulan. Aturan akan bertambah setiap kali kasus baru mengajari kami sesuatu; nomor lama tidak dipakai ulang.

Semua aturan berjalan **tanpa LLM**. Keluarannya `Finding`: aturan, ringkasan, angka, dan fakta terkait.

## R1 — Aritmetika per laporan
Untuk tiap filing: `kepemilikan_sebelum − jumlah` (jual) atau `+ jumlah` (beli) harus sama dengan `kepemilikan_sesudah`.
**Contoh pelanggaran nyata (KRYA, laporan 29 Jan 2026):** 561.322.772 − 80.000.000 ≠ 522.207.800.

## R2 — Kontinuitas rantai
Untuk tiap pemegang saham, urut berdasarkan tanggal laporan: `sebelum[i]` harus sama dengan `sesudah[i−1]`. Selisih berarti ada transaksi yang tidak ada di data.
**Contoh nyata (DADA):** +79.272.900 lembar antara 19 Okt 01:10 dan 23:09; **−1.660.008.900 lembar** antara 19 Okt 23:10 dan 23:44. Yang kedua kemungkinan penjualan besar 10 Okt yang diberitakan media tetapi tidak ada di data.

## R3 — Laporan ganda
Urutan transaksi (tanggal transaksi, jenis, jumlah, harga) yang berulang persis menandakan pelaporan ganda.
**Contoh nyata (DADA):** enam transaksi 23 Okt 2025 dilaporkan dua kali, pukul 22:50–22:54 dan 22:55–23:01, dengan nomor surat berbeda (173–178 dan 179–184). Total set ulangan 586.000.000 lembar = 7,89%. Bukti bahwa set kedua adalah ulangan: filing 12 Jan 2026 menyatakan kepemilikan sebelum transaksi 2.200.000.000 lembar (29,6%), yang hanya mungkin kalau set kedua tidak pernah terjadi.

## R4 — Tanggal ketersediaan
Yang menentukan apa yang boleh dilihat pemain pada tanggal T adalah **tanggal laporan**, bukan tanggal transaksi. Kalau tanggal laporan tidak ada, fakta itu `tersedia_sejak: null` dan dikecualikan dari tampilan.
**Contoh nyata (DADA):** transaksi 10 Okt 2025 baru dilaporkan 19 Okt.

## R5 — Rekonsiliasi dengan potret kepemilikan
Saldo akhir rantai dibandingkan dengan sumber kedua: saldo "sebelum" di filing berikutnya, atau potret komposisi pemegang saham.
**Contoh nyata (KRYA):** filing menunjukkan 374.014.400 lembar, potret menunjukkan 362.207.800.

## R6 — Subjek laporan
Emiten yang dibicarakan di dalam laporan harus sama dengan emiten yang sedang diperiksa, dan harga transaksi harus berada dalam rentang harga harian saham itu pada tanggal transaksi.
**Contoh nyata (LPLI):** satu filing yang tercatat di LPLI ternyata melaporkan penjualan saham NOBU.

## R7 — Persen dihitung ulang
Persentase di laporan tidak dipercaya; hitung `jumlah lembar ÷ saham beredar`
**pada tanggal laporan itu**. Jumlah saham beredar bukan tetapan: ia berubah
karena rights issue, private placement, saham bonus, dan pembelian kembali.
**Contoh nyata (COCO):** emiten menulis pengendali "tinggal 44,69%". Dengan
penyebut 889.863.981 yang berlaku sampai 30 Sep 2025, 456.716.151 lembar adalah
**51,32%** — masih mayoritas. Angka 44,69% hanya mungkin kalau penyebutnya
sekitar **1.022 juta lembar**; penyebut tersirat sepanjang rantai COCO memang
naik dari ~890 juta (30 Sep) ke ~1.022 juta (8 Okt), dan `financials` 2025
kemudian mencatat 3.559.455.924 = 889.863.981 × 4 sesudah rights issue 1:3 ex
9 Okt 2025. **Apakah pertambahan bertahap di tengah rantai itu benar atau salah
tidak bisa ditentukan dari endpoint yang ada; yang pasti salah adalah
membandingkan dua persen yang penyebutnya berbeda.**

Akibat praktisnya diukur: dengan satu angka tanpa tanggal, aturan ini menolak
**22 dari 22** sisi laporan COCO dan **14 dari 16** sisi laporan FOLK —
seluruhnya kartu yang benar. Dengan penyebut bertanggal, keempat belas sisi
FOLK itu kembali hijau.

## R8 — Tanda repo
Kolom *repurchase agreement* hanya ada di PDF, tidak ada di API. Transaksi repo bukan jual lepas dan tidak boleh dibaca sebagai "pengendali keluar".
**Contoh nyata (KRYA 31 Des 2025; RLCO Jun–Sep 2026):** API mencatat "sell", PDF menulis repo.

## R9 — Field terstruktur vs teks
Nilai di field terstruktur harus cocok dengan angka yang disebut di teks laporan.
**Contoh nyata (KRYA):** field `holding_before` sudah disesuaikan rantai, sedangkan teks laporan masih memakai angka PDF yang berbeda.

## R10 — Hari tanpa volume
Hari dengan volume 0 dan harga datar harus cocok dengan daftar suspensi. Kalau tidak ada di daftar, cari pengumuman bursanya.
**Contoh nyata (RLCO):** suspensi 22–23 Des 2025 tidak ada di data suspensi, tetapi volume 0 dan PDF pengumuman bursa membuktikannya.

## Status fakta
- **TERVERIFIKASI** — lolos semua aturan yang berlaku untuknya.
- **KONFLIK** — melanggar aturan dan belum terselesaikan. Tidak boleh dipakai sebagai jawaban soal; boleh dipakai sebagai bahan soal verifikasi.
- **TIDAK_LENGKAP** — datanya tidak cukup untuk memutuskan. Bukan konflik dan bukan "belum diperiksa": memetakannya ke konflik akan menolak kartu yang benar, memetakannya ke belum akan menyembunyikan temuannya. Tidak boleh dipakai sebagai jawaban soal.
- **BELUM** — belum diperiksa atau tanggal ketersediaannya tidak diketahui. Tidak ditampilkan ke pemain.

---

# Aturan generasi kedua (M2a)

Aturan di bawah ini lahir dari satu latihan: satu agent mengusulkan dua puluh
lima aturan baru, agent lain — **sengaja bukan penulisnya** — berusaha
mematahkannya dan menulis ulang setiap aturan dari nol. Yang tersisa sesudah
itu ada di sini.

Aturan ini berjalan di `npm run verifikasi:gudang` atas **seluruh** emiten di
`.cache/sectors/`, bukan atas satu kasus. Hasilnya, beserta hitungan berapa
yang sungguh diperiksa, ada di `docs/bukti/aturan-gudang.md`.

Tiga hal yang berubah di seluruh mesin karena aturan-aturan ini:

1. **Status `TIDAK_LENGKAP`.** "Datanya tidak cukup untuk memutuskan" bukan
   hal yang sama dengan "angkanya bertentangan". Tanpa status ini, ratusan
   baris harga yang benar akan ditolak sebagai konflik.
2. **Keparahan temuan.** `konflik` menolak kartu; `peringatan` menandai yang
   janggal tetapi mungkin ada penjelasan sahnya; `catatan` adalah label atau
   keterbatasan, bukan tuduhan.
3. **Jumlah saham beredar adalah fungsi tanggal.** Lihat R7 di atas.

## R11a — Dua sisi satu laporan harus punya penyebut yang sama
Satu laporan menulis dua persen: sebelum dan sesudah transaksi. Kalau tidak ada
satu jumlah saham beredar pun yang bisa menjelaskan keduanya, salah satunya
salah. Ketelitian persen **ditetapkan dua angka desimal**, bukan ditebak dari
nilainya: kalau ditebak, `22.7` memberi selang sepuluh kali lebih longgar
daripada `22.70` hanya karena nol berekornya hilang saat data diurai.
**Kedua sisi nol, atau tepat satu sisi nol, adalah `TIDAK_LENGKAP`** — bukan
dilewati diam-diam.

## R12 — Tanggal di nama berkas laporan
Alamat dokumen laporan kadang memuat tanggal terbitnya (`LK-DDMMYYYY-`). Kalau
tanggal itu berbeda dari jam terbit yang dicatat data, yang dipakai untuk
**mengurutkan rantai** adalah tanggal nama berkas. Bukan hiasan: dua laporan
yang tanggalnya berbeda menjelaskan tiga putus rantai dan satu jam terbit
janggal yang tadinya dikira kesalahan data. Polanya berjangkar pada `/LK-` dan
tanda hubung sesudahnya; enam alamat di gudang memuat sepuluh angka berurutan
yang bukan tanggal. Alamat yang tidak berpola itu **dilewati dengan alasan**,
tidak ditebak. Keparahan: peringatan.

## R13 — Lembar dilaporkan melebihi saham beredar
Satu pemegang tidak bisa memegang lebih banyak lembar daripada yang pernah
diterbitkan. Ambangnya 101%, bukan 100%: saham treasuri membuat sedikit di atas
100% bisa sah, dan batas telanjang membuat 100,000001% merah. Tanpa penyebut
yang berlaku pada tanggal itu, jawabannya `TIDAK_LENGKAP` — **bukan hijau**.
Melewati emiten diam-diam lebih berbahaya daripada merah palsu: mesin akan
melaporkan "hijau" untuk emiten yang tidak pernah diperiksa.
**Contoh nyata (RLCO, laporan 11 Jun 2026 17:27):** kepemilikan sebelum
5.082.642.900 lembar = 162,6% dari saham beredar; sesudah 6.832.215.100 = 218,6%.

## R14 — Rantai putus, diurutkan dengan benar
Sama seperti R2, dengan dua perbaikan yang mengubah jawabannya: rantai diurutkan
dengan tanggal nama berkas (R12), dan nama pemegang disatukan lebih dulu (R22).
Urutannya penting — menyatukan nama **tanpa** memperbaiki urutan justru menambah
putus rantai.

## R15 — Aritmetika per laporan, termasuk jenis transaksi lain
Sama seperti R1, ditambah satu hal: laporan yang `transaction_type`-nya bukan
`buy` maupun `sell` melainkan `others`. Mesin lama memperlakukan apa pun yang
bukan beli sebagai jual, sehingga laporan `others` yang rusak **lolos hijau**.
Untuk `others`, yang diperiksa adalah selisih tanpa arah.

## R16 — Jam terbit searah dengan rantai saldo
Laporan yang terbit lebih dulu tidak boleh sudah memuat keadaan yang baru
dihasilkan laporan yang terbit kemudian. Kalau itu terjadi, "apa yang sudah bisa
dibaca pada tanggal T" tidak punya satu jawaban. Temuannya wajib menyebut
**jam**, bukan hari — yang janggal justru terjadi di dalam satu hari.
Keparahan: peringatan. Pasangan yang juga putus rantainya dilaporkan **satu
kali** bersama R14: satu cacat data, satu temuan.

## R17B — Harga laporan terhadap rentang harga hari transaksinya
Menggantikan aturan lama yang memakai jendela 40 hari bursa. Premis aturan lama
— "tanggal transaksi tidak tersedia" — ternyata salah: setiap laporan
membawanya. Jendela 40 hari melewatkan 48 laporan yang melanggar rentang harga
hari transaksinya sendiri.
Dua hal yang wajib dikerjakan lebih dulu, keduanya terbukti dari data:
- **Baris harga cacat dibuang.** Satu baris yang harga terendahnya nol di dalam
  jendela membuat seluruh aturan berhenti berbunyi.
- **Medan harga gabungan laporan tidak dipakai sama sekali.** Ia rata-rata
  tertimbang yang menghitung harga yang hilang sebagai Rp0, jadi satu harga
  kosong mengempeskan seluruh laporan.
Tanggal transaksi yang tidak ada di deret harga harian: `TIDAK_LENGKAP`.

## R18a — Hari bervolume nol tanpa baris suspensi
Menggantikan R10, dengan satu perbedaan yang menentukan: jawabannya
`TIDAK_LENGKAP`, bukan konflik. Data suspensi mencatat hari **mulai**
berhentinya perdagangan, bukan tiap hari selama berhenti.

## R19a / R19b — Harga datar
**R19a:** hari yang harga buka, tertinggi, terendah, dan tutupnya satu angka
yang sama, sementara volumenya nol. Angka itu bukan harga yang disepakati
siapa pun hari itu.
**R19b:** runtun hari datar berturut-turut, dan jendela sepuluh hari bursa yang
sembilan harinya datar. Yang kedua ada karena runtun mudah pecah: satu hari
yang bergerak Rp1 di tengah memotong runtun panjang jadi dua.
Keparahan keduanya: peringatan.

## R22 — Satu pemegang, satu ejaan
Nama pemegang saham ditulis berbeda-beda. Membuang semua yang bukan huruf
**tidak cukup** untuk nama Indonesia: `"PT Estika Tata Tiara Tbk"` dan
`"Estika Tata Tiara"` adalah pemegang yang sama, dan kalau tidak disatukan,
rantainya terbaca sebagai dua orang. Awalan `PT` dan akhiran badan hukum
dibuang, dan aturan ini jalan **di dalam** daftar laporan juga, bukan hanya
menyilang ke potret kepemilikan. Keparahan: peringatan.

## R25 — Daftar laporan harus terbukti habis
Kalimat "emiten ini tidak punya laporan lain" adalah bukti negatif, dan bukti
negatif hanya sah kalau halamannya terbukti habis. Dua hal membuat itu sulit:
kelengkapan adalah sifat sebuah **permintaan**, bukan sifat sebuah emiten; dan
**respons kosong tidak memuat kode emitennya sama sekali** — dua respons kosong
dari emiten berbeda identik byte per byte.
Karena gudang menyimpan jawaban tanpa pertanyaannya, jawaban aturan ini untuk
setiap emiten adalah `TIDAK_LENGKAP`. Yang tetap bisa diputuskan dari isi saja:
halaman yang menjanjikan sambungan yang tidak ada di gudang adalah konflik.

## R28 — Label deret harga di sekitar aksi korporasi
Aturan ini **tidak bisa merah**. Ia memberi label: `disesuaikan` (jumlah saham
tersirat tidak berubah melintasi aksi), `mentah` (berubah sebesar rasio
aksinya), atau `tak terbaca`. Label itu menentukan kartu harga mana yang boleh
dibuat, bukan siapa yang salah — bukti di dalam satu endpoint yang sama saling
bertentangan, dan **penyebabnya tidak diketahui**.
Aturan tolak yang mengikat: **kartu harga tidak boleh melintasi tanggal stock
split yang tercatat.**

## R33 — Jumlah saham tersirat yang goyah
Jumlah saham tersirat (`nilai pasar ÷ harga tutup`) seharusnya tidak melompat
dari satu hari bursa ke hari berikutnya. Kalau melompat, penyebut persen tidak
boleh diambil dari hari seperti itu. Ambangnya `max(2%, 2 × fraksi harga ÷
harga)`: untuk saham berharga Rp50, satu gerakan harga terkecil yang mungkin
sudah 2,00%, jadi ambang 2% saja akan merah setiap hari tanpa ada yang salah.
Temuannya menyebut aksi korporasi dalam 21 hari di sekitarnya **sebagai fakta**;
kalau tidak ada, kalimatnya "penyebabnya tidak diketahui".

## R35 — Harga tertinggi dan terendah di ringkasan harus terjangkau
Nilai seperti "terendah 52 minggu" harus berada di antara harga terendah dan
tertinggi baris harian pada tanggal yang disebutnya sendiri. Tiga keluaran, dan
yang ketiga sama pentingnya: terjangkau, **tidak** terjangkau, dan **belum bisa
diperiksa** karena tanggalnya di luar deret harga yang kita punya.

---

## Aturan yang sengaja tidak diterapkan

- **R17 bentuk lama** (jendela 40 hari) — dibuang, diganti R17B. Premisnya
  salah dan dua-duanya merahnya terbukti positif palsu.
- **R18b** (suspensi tetapi ada volume) — dibuang. Nol merahnya hanya berlaku
  atas 18 baris yang bisa diperiksa, bukan atas ratusan emiten, dan ia tidak
  membawa satu bit pun yang belum ada di R18a.
- **R24** (aksi diumumkan, medan kosong) — dibuang. Satu-satunya merah yang
  dipakai membenarkannya adalah positif palsu: kalimatnya menyatakan **tidak**
  membagi dividen, dan medan yang kosong justru benar.
- **R30** (urutan tanggal aksi) — ditunda sampai tanggal cum tersedia untuk
  aksi lama.
- **R11b, R20, R21, R23, R26, R27, R29, R31, R32, R34** — kelompok keuangan
  dan aksi korporasi, milestone berikutnya.
