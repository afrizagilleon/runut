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
| `fakta` | Seluruh fakta berlabel, termasuk yang hanya muncul di pembukaan. |
| `fakta_terlihat` | Daftar `fact_id` yang boleh dilihat pemain sebelum menjawab. |
| `soal` | Tiga soal beserta pilihan, kunci, dan penjelasan. |
| `pembukaan` | Fakta dan paragraf yang baru muncul setelah pemain menjawab. |
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
| `batang` | Pertanyaannya. |
| `pilihan` | Daftar `{kunci, teks}`. |
| `jawaban` | `kunci` pilihan yang benar; harus ada di daftar pilihan. |
| `penjelasan` | Alasan jawaban itu benar, tanpa menghakimi. |
| `fact_ids` | Fakta yang menjadi dasar jawaban; semuanya harus ada di `fakta_terlihat`. |

## Cara menulis angka di dalam teks

Setiap angka di `batang`, `pilihan`, `penjelasan`, dan paragraf pembukaan ditulis
sebagai rujukan:

```
Harga penutupan naik ke [[harga-2025-10-08|Rp178]].
```

Bagian sebelum `|` adalah `fact_id`, bagian sesudahnya adalah teks yang dilihat pemain
dan bisa diketuk untuk membuka sumbernya. Angka yang berdiri sendiri tanpa rujukan
membuat validator menolak kasus itu (INV-4).

Satu pengecualian: angka andaian yang diciptakan soal itu sendiri (misalnya "kamu
memegang 10 lot") ditulis `[[misal|10 lot]]`. Angka seperti ini tidak punya sumber
karena bukan fakta, dan dirender tanpa tautan sumber.

## Kegagalan yang membuat build berhenti

Validator mengembalikan daftar masalah; perintah build keluar dengan kode ≠ 0 dan
menyebut penyebabnya kalau daftar itu tidak kosong. Kode masalah yang ada sekarang:

`SKEMA_VERSI` · `TANGGAL_T` · `TANGGAL_FAKTA` · `FAKTA_GANDA` · `SUMBER_TAK_LENGKAP` ·
`FACT_ID_MENGGANTUNG` · `ANGKA_TANPA_FACT_ID` · `FAKTA_BELUM_TERSEDIA` ·
`FAKTA_SESUDAH_T` · `FAKTA_KONFLIK_DIPAKAI` · `FAKTA_SOAL_TAK_TERLIHAT` ·
`FAKTA_PEMBUKAAN_BOCOR` · `SOAL_GANDA` · `SOAL_PILIHAN_KURANG` · `JAWABAN_TAK_ADA` ·
`SOAL_TANPA_FAKTA` · `TEMUAN_TANPA_ANGKA` · `AJAKAN_TRANSAKSI` · `DISCLAIMER` ·
`PEMERIKSAAN_TAK_LENGKAP` · `PEMERIKSAAN_TANPA_ALASAN` · `PEMERIKSAAN_TAK_COCOK`

## Status fakta dan soal

Fakta yang tersangkut satu temuan ditandai `KONFLIK`, dan fakta gabungan yang
dihitung dari fakta `KONFLIK` ikut menjadi `KONFLIK`: penjumlahan yang memuat
laporan bermasalah ikut bermasalah. Fakta `KONFLIK` boleh ditampilkan ke pemain
beserta tandanya, tetapi **tidak boleh menjadi dasar jawaban soal**; validator
menolaknya lewat `FAKTA_KONFLIK_DIPAKAI`.
