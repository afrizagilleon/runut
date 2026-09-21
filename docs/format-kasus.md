# Format berkas kasus

Berkas kasus (`cases/<kasus_id>.json`) **dihasilkan perintah** `npm run build:case -- <kasus_id>`,
bukan ditulis tangan. Membangun dua kali menghasilkan berkas yang sama persis.

## Kasus

| field | arti |
|---|---|
| `skema_versi` | Versi bentuk berkas ini; berkas dengan versi lain ditolak validator. |
| `kasus_id` | Nama kasus sekaligus nama berkas, memuat tanggal beku. |
| `judul` | Judul yang dibaca pemain di daftar kasus. |
| `emiten` | Simbol, nama resmi, papan pencatatan, dan sektor emiten yang sebenarnya. |
| `nama_samaran` | Nama yang dipakai di batang soal supaya jawabannya tidak bisa dicari di mesin pencari. |
| `tanggal_t` | Tanggal beku kasus; fakta yang baru tersedia sesudahnya tidak boleh terlihat pemain. |
| `pembuka` | Layar pertama: satu `hook` dan tepat tiga baris `aturan`. |
| `fakta` | Seluruh fakta berlabel, termasuk yang hanya muncul di pembukaan. |
| `fakta_terlihat` | Daftar `fact_id` yang menjadi kartu. **Harus sama persis dengan gabungan seluruh `kartu` di semua soal.** |
| `soal` | Tiga soal beserta kartu, istilah, pilihan, kunci, dan penjelasan. |
| `pembukaan` | Fakta dan paragraf yang baru muncul setelah pemain menjawab, ditambah tiga daftar butir. |
| `temuan` | Jejak verifikasi: hasil aturan R1–R10 atas rantai laporan. |
| `pemeriksaan` | Catatan kesepuluh aturan: mana yang jalan, mana yang dilewati, dan alasannya. Aturan yang hilang atau dilewati tanpa alasan membuat validator menolak kasus. |
| `kartu_konsep` | Kartu konsep yang dipakai kasus ini. |
| `disclaimer` | Tiga kalimat tetap yang selalu terlihat di halaman kasus. |

## Fakta

| field | arti |
|---|---|
| `fact_id` | Nama pendek yang unik; setiap angka di teks menunjuk ke sini. |
| `klaim` | Satu kalimat bahasa Indonesia yang menyatakan fakta itu. |
| `nilai` | Nilai terukurnya, kalau berupa satu angka atau satu teks. |
| `satuan` | Satuan `nilai`, misalnya `rupiah per lembar` atau `lembar`. |
| `sumber.jenis` | `api` (ditarik dari penyedia data), `berkas` (PDF keterbukaan informasi), atau `turunan` (dihitung dari fakta lain). |
| `sumber.endpoint` | Alamat endpoint asal, tanpa kunci API. `null` untuk sumber bukan API. |
| `sumber.berkas` | Nama berkas asal. `null` kalau tidak ada. |
| `sumber.parameter` | Parameter permintaan atau penunjuk baris di dalam berkas. |
| `sumber.diambil_pada` | Waktu data ditarik dari penyedia; `null` kalau waktunya tidak tercatat di dalam data. |
| `sumber.keterangan` | Rumus atau catatan singkat, terutama untuk fakta `turunan`. |
| `turunan_dari` | `fact_id` yang dipakai menghitung fakta ini. |
| `awam` | Teks kartu dalam bahasa sehari-hari: `{ kepala, isi }`, atau `null` kalau fakta ini tidak pernah menjadi kartu. `kepala` adalah baris "jenis sumber · tanggal terbit"; `isi` satu-dua kalimat yang setiap angkanya ditulis sebagai rujukan `[[fact_id|teks]]`. Paling panjang 220 karakter, diukur sesudah penanda rujukannya dilepas. |
| `tersedia_sejak` | Tanggal fakta itu bisa diketahui publik. Untuk laporan transaksi yang menentukan adalah **tanggal laporan**, bukan tanggal transaksi. `null` berarti tidak bisa ditentukan, dan fakta itu dikecualikan dari tampilan pemain. |
| `status` | `TERVERIFIKASI`, `KONFLIK` (melanggar aturan dan belum selesai; tidak boleh jadi dasar jawaban), atau `BELUM`. |

## Temuan

| field | arti |
|---|---|
| `temuan_id` | Nama pendek yang unik untuk temuan itu. |
| `aturan` | Kode aturan yang melahirkannya, `R1`–`R10`. |
| `ringkasan` | Satu kalimat yang menerangkan apa yang janggal. |
| `angka` | Angka-angka yang menjadi bukti; temuan tanpa angka ditolak validator. |
| `fakta_terkait` | `fact_id` yang tersangkut temuan itu. |
| `rujukan` | Penunjuk ke laporan yang terlibat: waktu laporan dan nama berkasnya. |

## Soal

| field | arti |
|---|---|
| `soal_id` | Nama pendek yang unik. |
| `kartu` | 2–4 `fact_id` yang tampil sebagai kartu tepat di atas soal. Semuanya wajib berstatus `TERVERIFIKASI`, punya `tersedia_sejak` ≤ `tanggal_t`, dan punya `awam`. |
| `istilah` | 0–2 butir `{kata, arti}` berpenjelasan satu baris, tampil di bawah kartu. |
| `batang` | Pertanyaannya, dibuka dengan "Hari ini `[[hari-ini|…]]`". |
| `pilihan` | Daftar `{kunci, teks}`. |
| `jawaban` | `kunci` pilihan yang benar; harus ada di daftar pilihan. |
| `penjelasan` | Alasan jawaban itu benar, tanpa menghakimi. |
| `fact_ids` | Fakta yang menjadi dasar jawaban; semuanya harus ada di `fakta_terlihat`. |

Opsi berbentuk **omongan teman yang dicek ke kartu**: tepat dua opsi diawali
`Betul,` dan dua diawali `Keliru,`, dan selisih panjang opsi terpanjang dan
terpendek tidak boleh lebih dari 40 persen dari yang terpanjang. Keduanya menjaga
hal yang sama: supaya bentuk opsi tidak membocorkan jawabannya.

## Pembukaan

| field | arti |
|---|---|
| `fact_ids` | Fakta yang baru tersedia sesudah `tanggal_t`. Tidak boleh ada di `fakta_terlihat`. |
| `paragraf` | Kejadian sesudah T, satu paragraf per keping garis waktu. |
| `bisa_dibaca` | Apa yang sudah bisa dibaca pada tanggal T. |
| `tidak_bisa_dibaca` | Apa yang tidak bisa dibaca, dan yang produk ini tidak pernah minta ditebak. |
| `disingkirkan` | Laporan resmi yang tidak lolos pemeriksaan sendiri, beserta alasannya. |

Layar pembukaan adalah **satu-satunya** tempat teks boleh menautkan fakta
berstatus `KONFLIK` atau fakta yang terbit sesudah T. Di semua layar lain —
teks kartu, batang, opsi, dan teks kunci — validator menolaknya.

## Cara menulis angka di dalam teks

Setiap angka di `batang`, `pilihan`, `penjelasan`, dan paragraf pembukaan ditulis
sebagai rujukan:

```
Harga penutupan naik ke [[harga-2025-10-08|Rp178]].
```

Bagian sebelum `|` adalah `fact_id`, bagian sesudahnya adalah teks yang dilihat pemain
dan bisa diketuk untuk membuka sumbernya. Angka yang berdiri sendiri tanpa rujukan
membuat validator menolak kasus itu (INV-4).

Dua pengecualian, keduanya penanda yang bukan `fact_id`:

- **`misal`** — angka andaian yang diciptakan soal itu sendiri, misalnya
  `[[misal|10 lot]]`. Tidak punya sumber karena bukan fakta.
- **`hari-ini`** — tanggal beku kasus, misalnya `[[hari-ini|8 Oktober 2025]]`.
  Setiap batang soal dan setiap baris aturan main dibuka dengannya, karena pemain
  hidup di tahun yang berbeda dari kasusnya. Ia bukan fakta melainkan
  `kasus.tanggal_t`, dan validator memastikan teks yang ditulisnya sama persis
  dengan tanggal itu — jadi penanda ini tidak bisa dipakai menyelundupkan angka
  lain.

Teks awam kartu memakai aturan yang sama, dengan satu kelonggaran: ia boleh
membulatkan. `[[kelipatan-…|22 kali]]` sah walaupun nilai faktanya 22,25; angka
persisnya tampil di panel sumber.

## Kegagalan yang membuat build berhenti

Validator mengembalikan daftar masalah; perintah build keluar dengan kode ≠ 0 dan
menyebut penyebabnya kalau daftar itu tidak kosong. Kode masalah yang ada sekarang:

Dari versi 1:
`SKEMA_VERSI` · `TANGGAL_T` · `TANGGAL_FAKTA` · `FAKTA_GANDA` · `SUMBER_TAK_LENGKAP` ·
`FACT_ID_MENGGANTUNG` · `ANGKA_TANPA_FACT_ID` · `FAKTA_BELUM_TERSEDIA` ·
`FAKTA_SESUDAH_T` · `FAKTA_KONFLIK_DIPAKAI` · `FAKTA_SOAL_TAK_TERLIHAT` ·
`FAKTA_PEMBUKAAN_BOCOR` · `SOAL_GANDA` · `SOAL_PILIHAN_KURANG` · `JAWABAN_TAK_ADA` ·
`SOAL_TANPA_FAKTA` · `TEMUAN_TANPA_ANGKA` · `AJAKAN_TRANSAKSI` · `DISCLAIMER` ·
`PEMERIKSAAN_TAK_LENGKAP` · `PEMERIKSAAN_TANPA_ALASAN` · `PEMERIKSAAN_TAK_COCOK`

Baru di versi 2, tentang kartu dan bentuk soal:
`KARTU_JUMLAH` · `KARTU_MENGGANTUNG` · `KARTU_TAK_TERVERIFIKASI` · `KARTU_TANPA_TANGGAL` ·
`KARTU_SESUDAH_T` · `KARTU_TANPA_AWAM` · `KARTU_AWAM_PANJANG` · `KARTU_TAK_TERLIHAT` ·
`TERLIHAT_TAK_TERPAKAI` · `ISTILAH_TERLALU_BANYAK` · `ISTILAH_TANPA_ARTI` ·
`OPSI_TANPA_LABEL` · `OPSI_TAK_DUA_DUA` · `OPSI_PANJANG_TIMPANG` · `KUNCI_SESUDAH_T` ·
`TAUTAN_KONFLIK` · `TAUTAN_SESUDAH_T` · `HARI_INI_TAK_COCOK` · `PEMBUKA_ATURAN` ·
`PEMBUKAAN_TAK_LENGKAP`

## Status fakta dan soal

Fakta yang tersangkut satu temuan ditandai `KONFLIK`, dan fakta gabungan yang
dihitung dari fakta `KONFLIK` ikut menjadi `KONFLIK`: penjumlahan yang memuat
laporan bermasalah ikut bermasalah. Fakta `KONFLIK` **tidak boleh menjadi kartu**
(`KARTU_TAK_TERVERIFIKASI`), tidak boleh menjadi dasar jawaban soal
(`FAKTA_KONFLIK_DIPAKAI`), dan tidak boleh ditautkan dari teks mana pun yang
dilihat pemain sebelum layar pembukaan (`TAUTAN_KONFLIK`).

Ia boleh — dan sebaiknya — muncul di layar pembukaan, di butir `disingkirkan`,
beserta alasannya. Produk yang mengajarkan membaca data tidak boleh menyodorkan
angka yang dibantah jejak verifikasinya sendiri; tetapi menyembunyikan bahwa
angka itu ada juga bukan mengajar.
