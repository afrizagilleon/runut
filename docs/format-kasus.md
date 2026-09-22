# Format berkas kasus

Berkas kasus (`cases/<kasus_id>.json`) **dihasilkan perintah** `npm run build:case -- <kasus_id>`,
bukan ditulis tangan. Membangun dua kali menghasilkan berkas yang sama persis.

**Skema versi 3.** Perubahan dari versi 2, semuanya karena satu keputusan isi —
soal dibaca sebagai kabar dari teman yang harus dicek ke dokumen:

| versi 2 | versi 3 |
|---|---|
| `soal.batang` (satu paragraf: konteks + tanggal + pertanyaan) | `soal.pesan { nama, jam, isi }` + `soal.tanya` |
| — | `soal.petunjuk` (satu kalimat, hanya di soal pertama) |
| `kasus.pembuka { hook, aturan[3] }` | `kasus.pembuka { kalimat }` |

## Kasus

| field | arti |
|---|---|
| `skema_versi` | Versi bentuk berkas ini; berkas dengan versi lain ditolak validator. **Sekarang 3.** |
| `kasus_id` | Nama kasus sekaligus nama berkas, memuat tanggal beku. |
| `judul` | Judul yang dibaca pemain di daftar kasus. |
| `emiten` | Simbol, nama resmi, papan pencatatan, dan sektor emiten yang sebenarnya. |
| `nama_samaran` | Nama yang dipakai di batang soal supaya jawabannya tidak bisa dicari di mesin pencari. |
| `tanggal_t` | Tanggal beku kasus; fakta yang baru tersedia sesudahnya tidak boleh terlihat pemain. |
| `pembuka` | Layar pertama: **satu** `kalimat`, paling panjang 160 karakter, ditambah `menit` yang opsional. Tiga baris aturan main versi 2 dihapus di versi 3 — pemilik tidak membacanya; cara mainnya sekarang `petunjuk` di soal pertama. |
| `fakta` | Seluruh fakta berlabel, termasuk yang hanya muncul di pembukaan. |
| `fakta_terlihat` | Daftar `fact_id` yang menjadi kartu. **Harus sama persis dengan gabungan seluruh `kartu` di semua soal.** |
| `soal` | Tiga soal beserta pesan teman, kartu, istilah, pilihan, kunci, dan penjelasan. |
| `pembukaan` | Fakta dan paragraf yang baru muncul setelah pemain menjawab, ditambah tiga daftar butir. |
| `temuan` | Jejak verifikasi: hasil aturan R1–R10 atas rantai laporan. |
| `pemeriksaan` | Catatan kesepuluh aturan: mana yang jalan, mana yang dilewati, dan alasannya. Aturan yang hilang atau dilewati tanpa alasan membuat validator menolak kasus. |
| `kartu_konsep` | Kartu konsep yang dipakai kasus ini. |
| `disclaimer` | Tiga kalimat tetap yang selalu terlihat di halaman kasus. |

## Layar pertama (`pembuka`)

| field | arti |
|---|---|
| `kalimat` | Satu kalimat, paling panjang 160 karakter, tanpa angka telanjang (`ANGKA_TANPA_FACT_ID`) dan tanpa tautan ke fakta yang belum tersedia pada `tanggal_t`. |
| `menit` | **Opsional.** Kira-kira berapa menit kasus ini dimainkan; bilangan bulat 1–30 (`PEMBUKA_MENIT`). |

`menit` dipakai satu tempat saja: baris meta di bawah tombol "Mulai kasus",
`3 soal · sekitar 5 menit · tanpa akun, tanpa skor`. Jumlah soalnya dibaca dari
`soal.length`, jadi ia tidak pernah bisa berbohong; kasus yang tidak menulis
`menit` kehilangan potongan tengahnya, bukan menebak angkanya.

Kenapa medan ini ada: di uji duduk 22 Sep tidak satu pun dari tiga penguji bisa
mengatakan aplikasi ini apa, dan alasan berhenti yang diucapkan adalah *"ga tau
berapa soalnya; lebih suka soal dikit biar fokus, kalau banyak males"*. Angkanya
sendiri datang dari data, bukan dari selera: median durasi penyelesai alpha
±5–10 menit, jadi DADA menulis `5`.

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
| `status` | `TERVERIFIKASI`, `KONFLIK` (melanggar aturan dan belum selesai; tidak boleh jadi dasar jawaban), `TIDAK_LENGKAP` (datanya tidak cukup untuk memutuskan; juga tidak boleh jadi dasar jawaban), atau `BELUM`. |

### Kenapa `TIDAK_LENGKAP` ada (M2a)

"Datanya tidak cukup" bukan hal yang sama dengan "angkanya bertentangan", dan
bukan juga "belum kami periksa". Sebelum status ini ada, satu-satunya pilihan
adalah memetakannya ke `KONFLIK` — yang **menolak kartu yang benar**: 203 baris
harga bervolume nol dan 55 aksi korporasi tanpa harga dua sisi akan tampil
sebagai pelanggaran data padahal yang kurang adalah datanya — atau ke `BELUM`,
yang menyembunyikan temuannya sama sekali.

## Temuan

| field | arti |
|---|---|
| `temuan_id` | Nama pendek yang unik untuk temuan itu. |
| `aturan` | Kode aturan yang melahirkannya. `R1`–`R10` adalah himpunan yang membangun berkas kasus; skema juga mengenal aturan M2a (`R11a`, `R12`, `R13`, `R14`, `R15`, `R16`, `R17B`, `R18a`, `R19a`, `R19b`, `R22`, `R25`, `R28`, `R33`, `R35`) yang berjalan di `npm run verifikasi:gudang`. |
| `ringkasan` | Satu kalimat yang menerangkan apa yang janggal. |
| `angka` | Angka-angka yang menjadi bukti; temuan tanpa angka ditolak validator. |
| `fakta_terkait` | `fact_id` yang tersangkut temuan itu. |
| `rujukan` | Penunjuk ke laporan yang terlibat: waktu laporan dan nama berkasnya. |
| `keparahan` | **Opsional.** `konflik`, `peringatan`, atau `catatan`. Temuan yang tidak menulisnya dibaca sebagai `konflik`; temuan R1–R10 memang tidak menulisnya, sehingga berkas kasus lama tetap sah dan tidak berubah satu byte pun. |

## Soal

| field | arti |
|---|---|
| `soal_id` | Nama pendek yang unik. |
| `kartu` | 2–4 `fact_id` yang tampil sebagai kartu tepat di atas soal. Semuanya wajib berstatus `TERVERIFIKASI`, punya `tersedia_sejak` ≤ `tanggal_t`, dan punya `awam`. |
| `istilah` | 0–2 butir `{kata, arti}` berpenjelasan satu baris, tampil di bawah kartu. |
| `pesan` | Kabar dari seorang teman: `{ nama, jam, isi }`. Nama 2–12 huruf tanpa angka, `jam` berbentuk `HH.MM` 24 jam (**titik**, bukan titik dua), `isi` paling panjang 220 karakter polos. |
| `tanya` | Judul pertanyaan, paling panjang 60 karakter, dan **wajib menyebut nama pengirim pesannya** — pemain menjawab tentang omongan seseorang, bukan tentang soal yang melayang. |
| `petunjuk` | Satu kalimat cara main, **hanya di soal pertama**; `null` di soal lain. |
| `kartu_penentu` | `fact_id` yang menjadi dasar jawaban; ditegaskan sesudah jawaban dikunci. |
| `pilihan` | Daftar `{kunci, teks}`. |
| `jawaban` | `kunci` pilihan yang benar; harus ada di daftar pilihan. |
| `penjelasan` | Alasan jawaban itu benar, tanpa menghakimi. |
| `fact_ids` | Fakta yang menjadi dasar jawaban; semuanya harus ada di `fakta_terlihat`. |

Opsi berbentuk **omongan teman yang dicek ke kartu**: tepat dua opsi diawali
`Betul,` dan dua diawali `Keliru,`, dan selisih panjang opsi terpanjang dan
terpendek tidak boleh lebih dari 40 persen dari yang terpanjang. Keduanya menjaga
hal yang sama: supaya bentuk opsi tidak membocorkan jawabannya.

### Pesan teman adalah ucapan, bukan fakta

Versi 2 menyimpan pertanyaan sebagai satu paragraf `batang`. Versi 3 memecahnya
menjadi pesan teman plus judul pertanyaan, dan pemecahan itu membawa aturan yang
berbeda untuk keduanya.

Di dalam `pesan.isi` dan `pilihan[].teks`, angka ditulis **telanjang** dan
tautan fakta **ditolak** (`UCAPAN_BERTAUT`). Alasannya bukan kerapian: kalau
angka di dalam kabar ikut ditautkan ke sumbernya, kabar itu tampak sudah
terverifikasi sebelum pemain memeriksanya, dan seluruh gagasan produk ini —
"orang kasih kabar, kita verify" — runtuh sebelum pemain sempat bekerja.

Tanda tebal juga ditolak di kedua tempat itu (`PESAN_DITEBALKAN`,
`OPSI_DITEBALKAN`): penekanan di dalam ucapan orang adalah penilaian kami atas
ucapannya.

Di `awam` kartu, `penjelasan`, dan paragraf pembukaan, aturannya kebalikannya:
setiap angka **wajib** tertaut (INV-4).

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

Setiap angka di `awam` kartu, `penjelasan`, dan paragraf pembukaan ditulis
sebagai rujukan — **tetapi tidak di `pesan` dan `pilihan`**, yang aturannya
kebalikannya (lihat "Pesan teman adalah ucapan" di atas):

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
  Ia bukan fakta melainkan `kasus.tanggal_t`, dan validator memastikan teks yang
  ditulisnya sama persis dengan tanggal itu — jadi penanda ini tidak bisa dipakai
  menyelundupkan angka lain.

  Di versi 2, setiap batang soal dibuka dengannya. Versi 3 menghapus kebiasaan
  itu: jangkar waktunya sekarang keping kalender yang menempel di kepala layar,
  karena pemilik membaca kalimat "Hari ini 8 Oktober…" yang diulang tiga kali
  sebagai informasi baru, bukan sebagai konteks.

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

Baru di M2a, tentang skema temuan generasi kedua:
`TEMUAN_ATURAN_TAK_DIKENAL` · `TEMUAN_KEPARAHAN_TAK_DIKENAL`

Baru di versi 2, tentang kartu dan bentuk soal:
`KARTU_JUMLAH` · `KARTU_MENGGANTUNG` · `KARTU_TAK_TERVERIFIKASI` · `KARTU_TANPA_TANGGAL` ·
`KARTU_SESUDAH_T` · `KARTU_TANPA_AWAM` · `KARTU_AWAM_PANJANG` · `KARTU_TAK_TERLIHAT` ·
`KARTU_PENENTU_JUMLAH` · `KARTU_PENENTU_BUKAN_KARTU` · `KEPALA_HITUNG_HILANG` ·
`KEPALA_HITUNG_PALSU` · `KEPALA_PANJANG` · `KETERANGAN_KODE_FAKTA` ·
`KETERANGAN_TANGGAL_MESIN` ·
`TERLIHAT_TAK_TERPAKAI` · `ISTILAH_TERLALU_BANYAK` · `ISTILAH_TANPA_ARTI` ·
`OPSI_TANPA_LABEL` · `OPSI_TAK_DUA_DUA` · `OPSI_PANJANG_TIMPANG` · `KUNCI_SESUDAH_T` ·
`TAUTAN_KONFLIK` · `TAUTAN_SESUDAH_T` · `HARI_INI_TAK_COCOK` · `PEMBUKAAN_TAK_LENGKAP`

Baru di versi 3, tentang pesan teman dan judul pertanyaan:
`PESAN_NAMA` · `PESAN_JAM` · `PESAN_KOSONG` · `PESAN_PANJANG` · `PESAN_DITEBALKAN` ·
`OPSI_DITEBALKAN` · `UCAPAN_BERTAUT` · `TANYA_KOSONG` · `TANYA_PANJANG` ·
`TANYA_TANPA_NAMA` · `PETUNJUK_BUKAN_SOAL_PERTAMA` · `PETUNJUK_HILANG` ·
`PEMBUKA_KOSONG` · `PEMBUKA_PANJANG`

Baru di M3.5, tentang lama main yang dijanjikan layar pertama:
`PEMBUKA_MENIT`

Dihapus di versi 3 bersama medannya: `PEMBUKA_ATURAN` ("layar pertama harus
tepat tiga baris aturan").

## Apa yang dicatat aplikasi dari berkas ini

Berkas kasus tidak memuat data pemain, dan tidak pernah akan. Yang tercatat saat
seseorang bermain dijelaskan di README (bagian "Apa yang dicatat"): nama
peristiwa, nama blok yang diketuk (`uid`), kedalaman gulir, kode penanda tautan,
dan satu nomor pengunjung acak. Dua hal dari berkas ini ikut muncul di sana, dan
keduanya kode kami sendiri, bukan isi layar:

- `fact_id`, di `kartu_buka` dan di `uid` berbentuk `lembar:<fact_id>`,
  `kaki:<fact_id>`, `angka:<fact_id>`;
- `soal_id`, di `pilih`, `kunci_jawaban`, dan `kembali_ke_kartu`.

Teks kartu, isi pesan teman, dan teks opsi **tidak pernah** dikirim ke mana pun.

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
