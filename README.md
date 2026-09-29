# Runut

> Nama kerja. Bisa berubah sebelum submit.

Latihan membaca dokumen pasar modal Indonesia lewat kasus nyata yang dibekukan pada satu tanggal.

Pemain melihat hanya fakta yang sudah tersedia untuk publik sampai tanggal T: laporan keuangan, pengumuman bursa, laporan transaksi pemegang saham, jadwal RUPS. Pemain menjawab pertanyaan tentang **membaca data dan hak pemegang saham** — bukan menebak harga, bukan memutuskan beli atau jual. Setelah menjawab, data sesudah T dibuka.

Setiap angka di dalam soal bisa ditelusuri ke sumbernya: panggilan Sectors API, PDF keterbukaan informasi IDX, atau dokumen KSEI.

**Ini bukan nasihat investasi.** Data menggambarkan keadaan pada tanggal tertentu di masa lalu dan bukan kondisi perusahaan sekarang. Produk ini tidak pernah menyarankan membeli atau menjual efek apa pun.

## Status

Dibangun untuk Sectors Hackathon 2026, Track 01 (AI Agents & Assistants). Prototipe.

## Menjalankan

```bash
npm install
npm run build:case -- dada-2025-10-08   # bangun berkas kasus dari data (butuh .cache/)
npm run build:case -- ultj-2026-05-04
npm run dev                             # pemain di http://localhost:5173
```

Perintah lain: `npm test`, `npm run typecheck`, `npm run build`, `npm run preview`,
`npm run periksa:desain` (menjaga aturan tampilan di `docs/desain.md`: skala huruf,
sudut membulat, dua tulisan kapital, dan tidak ada tombol utama yang tampil mati).

Berkas kasus sudah ikut di repo, jadi `npm run dev` jalan tanpa `build:case`.

### Judul tab, ikon, dan pratinjau tautan

`web/index.html` memakai judul layar pertama yang lolos uji K-06 ("Cek omongan
saham di grup ke dokumen resminya.") untuk `<title>` dan `og:title`, ikon
halaman kalender `web/public/kalender.svg`, warna tema = `--kertas` tiap mode
(terang `#f3f5f7`, gelap `#191816` sejak palet gelap M3.11),
dan gambar pratinjau `web/public/pratinjau.png` (1200 × 630). Tidak ada kode
atau nama emiten di sana: pratinjau tautan terbaca sebelum orang membuka apa
pun, dan identitas emiten tersamar sampai pembukaan.

Gambarnya dibuat ulang dengan `node alat/buat-pratinjau.ts`: aplikasi dibangun
tanpa pengumpul, layar pertama DADA versi terang dipotret di Chromium tanpa
server dan tanpa jaringan (semua permintaan dipenuhi dari cakram, yang lain
dibatalkan), dan gambar **tidak ditulis** bila teks layar memuat kode atau nama
emiten kasus mana pun. Jalankan lagi bila layar pertama berubah.

**`og:image` dan `og:url` ditulis ABSOLUT ke situs yang dinilai** (M3.11 D-8):
`https://alpha.zaa.my.id/pratinjau.png` dan `https://alpha.zaa.my.id/`, ditambah
`twitter:card` = `summary_large_image`. Threads dan WhatsApp (juga Facebook dan
LinkedIn) hanya menerima URL absolut dan tampil tanpa gambar bila jalurnya
relatif. Meta itu hanya teks: halaman tidak memuat apa pun dari domain itu, dan
e2e (E-35) memeriksa gambarnya dari build lokal, bukan dari domain tersebut.

**Bila domain berubah**, ganti kedua nilai di `web/index.html` (`og:url` dan
`og:image`, keduanya dengan domain baru dan garis miring penutup untuk `og:url`),
lalu ganti konstanta `SITUS` di `e2e/kepala-halaman.spec.ts` dengan nilai yang
sama — E-35 akan merah sampai keduanya cocok.

## Kasus mana yang dimainkan

Ada dua kasus sekarang, dan pemain tidak memilih sendiri:

| kasus | tanggal beku | pelajarannya |
|---|---|---|
| `dada-2025-10-08` | 8 Oktober 2025 | harga melonjak sementara pemilik besarnya menjual |
| `ultj-2026-05-04` | 4 Mei 2026 | dividen tiap tahun, orang dalam membeli, dan tanggal ex |

- **Kunjungan pertama:** satu kasus dipilih acak seragam.
- **Kunjungan berikutnya:** kasus yang **belum** dimainkan dari peramban itu.
  Daftarnya disimpan di `localStorage` (`kasus_dimainkan`). Kalau semuanya sudah
  dimainkan, kasusnya acak lagi.
- **"Coba simulasi lain"** (dulu "Mau coba kasus lain", M3.12) di layar terima kasih **langsung membuka** kasus
  berikutnya yang belum dimainkan — sesi baru, pengunjung yang sama. Kalau tidak
  ada lagi, barulah pesan penutup kasus itu tampil.
- **`?kasus=<id>`** memaksa satu kasus, untuk juri dan untuk uji. Nilai yang
  tidak dikenal diabaikan diam-diam, seperti `?k=`.

Label tiap kasus adalah **peristiwanya**, bukan penilaian atas sahamnya: tidak
ada kata "sehat", "bagus", atau "buruk" di teks kasus mana pun, dan itu dijaga
tes.

## Mesin verifikasi

Produk ini menjanjikan satu hal: setiap angka di kartu sudah diperiksa. Yang
memeriksanya adalah sekumpulan aturan yang berjalan **tanpa LLM**, ditulis di
`docs/aturan-verifikasi.md`.

Ada dua himpunan. Himpunan pertama (R1–R10) membangun kasus DADA. Himpunan
kedua (35 aturan) membangun kasus ULTJ **dan** berjalan atas seluruh gudang. Himpunan kedua lahir dari uji lawan: satu agent
mengusulkan aturan baru, agent lain berusaha mematahkannya dan menulis ulang
tiap aturan dari nol. Ia berjalan atas **seluruh** emiten di `.cache/sectors/`,
bukan atas satu kasus:

```bash
npm run verifikasi:gudang
```

Perintah itu menulis hasil lengkapnya ke `.cache/m2b/gudang.json` dan
agregatnya ke `docs/bukti/aturan-gudang.md`. Ia tidak membaca jaringan, jam
dinding, maupun angka acak, jadi dua kali jalan atas data yang sama memberi
berkas yang sama persis.

Tiap aturan wajib melaporkan **berapa yang sungguh diperiksa**, bukan hanya
berapa yang merah, dan tiap temuan punya berat: `konflik` menolak kartu,
`peringatan` menandai yang janggal, `catatan` adalah label atau keterbatasan.
Fakta yang datanya tidak cukup untuk diputuskan berstatus `TIDAK_LENGKAP` —
bukan konflik, dan bukan "belum diperiksa".

Sebuah kasus **diverifikasi dengan dokumen yang sudah terbit pada tanggal
bekunya**, bukan dengan seluruh data yang ada hari ini. Alasannya sama dengan
alasan kasus itu ada: yang ditanyakan adalah apa yang bisa dibaca pada hari itu.
Satu laporan yang terbit tiga minggu sesudah tanggal beku bisa membuat kartu
yang pada hari itu tidak punya cacat apa pun tiba-tiba gugur — dan pemain
kehilangan kartu karena sesuatu yang belum ada di dokumen mana pun. Yang
terjadi sesudah tanggal beku tetap muncul, di layar pembukaan.

Kelompok terakhir yang masuk menjawab pertanyaan yang lain: **kalau perusahaan
melakukan sesuatu — membagi dividen, menerbitkan saham baru, memecah saham —
angka mana yang masih boleh dipakai di kartu?** Di sekitar peristiwa seperti
itu, jumlah saham berubah di tengah jendela, laba per lembar berganti basis,
dan dua medan dari endpoint yang sama bisa memakai dasar yang berbeda. Hasilnya
ada di bagian "Peristiwa perusahaan" di `docs/bukti/aturan-gudang.md`: per jenis
peristiwa, berapa kejadiannya, berapa yang punya harga di kedua sisi tanggalnya,
berapa yang lolos jadi bahan kartu, dan satu kalimat tentang apa yang **wajib
dijelaskan** di kartu tentang jenis itu.

## Uji di browser sungguhan

```bash
npm run e2e          # memainkan Runut di Chromium, ponsel 360 x 640, terang dan gelap
npm run e2e:lihat    # sama, tetapi kelihatan
```

`npm run e2e` menyalakan servernya sendiri di port miliknya (8797, 5183, 4183,
4184) dan mematikannya lagi, lalu memainkan **tiap kasus** penuh terhadap
**build produksi dengan pengumpul peristiwa yang sungguhan**. Tiap layar
disimpan sebagai PNG di `.cache/e2e/layar/<proyek>/` (kasus kedua dan
seterusnya di anak foldernya sendiri), supaya bisa dilihat tanpa membuka
browser.

Ia ada karena tes unit tidak bisa melihat apa yang dilihat pemain: repo ini
sengaja tanpa jsdom, dan peramban tanpa frame tidak menjalankan
`IntersectionObserver`, animasi, maupun gulir. Lima cacat sampai ke ponsel
pemilik lewat celah itu.

**Aturan repo: setiap cacat yang ditemukan manusia ditulis dulu sebagai tes e2e
yang merah, baru diperbaiki.** Dan setiap tes harus dibuktikan merah dengan
merusak kode produk — tes yang tetap hijau ketika kode yang dijaganya rusak
bukan penjaga. Tabel "cacat → tes → sabotase" dan cara menambah tes baru ada di
[`docs/uji-e2e.md`](docs/uji-e2e.md).

## Apa yang dicatat

Secara baku **tidak ada apa pun yang dikirim ke mana pun.** Aplikasi yang
dibangun tanpa `VITE_KOLEKTOR_URL` tidak memuat satu pun alamat untuk dihubungi;
itu diperiksa dari isi `web/dist/`, bukan dari membaca kode.

Kalau alamat pengumpul diisi saat build — yang hanya dilakukan untuk uji coba
terbatas — kalimat inilah yang dibaca pemain di layar akhir, dan ia dimaksudkan
harfiah:

> Kami mencatat apa yang diketuk, seberapa jauh layar digulir, kapan halaman
> ditinggalkan, dan kesalahan teknisnya; juga jenis perangkat dan pengaturan
> tampilan secara garis besar, jam setempat, dan asal tautan — tanpa alamat IP dan
> tanpa identitas. Kami menyimpan satu nomor acak di browsermu supaya tahu kalau
> kamu kembali. Bukan nama, bukan akun; tidak dibagikan ke siapa pun. Teks yang
> kamu ketik tidak dicatat, kecuali kotak masukan ini.

Yang tercatat adalah perilaku di halaman, bukan orangnya:

| dicatat | artinya |
|---|---|
| `mulai` | permainan dibuka: lebar layar, kode penanda tautan, nomor pengunjung, kunjungan ke berapa, dan (sejak M3.8) keterangan **kasar** perangkat dan asal — lihat "Perangkat dan asal" di bawah |
| `layar_masuk` | pindah ke layar mana |
| `kartu_buka` | sumber sebuah lembar dokumen dibuka |
| `pilih` | pilihan jawaban dipindah, dan sudah berapa kali |
| `kunci_jawaban` | jawaban dikunci: pilihannya, benar atau tidak, lama di soal itu, berapa lama lembar-lembarnya terlihat sebelumnya |
| `lihat_balik` | kembali melihat soal yang sudah dikunci |
| `ketuk` | satu ketukan: di layar mana, pada blok bernama apa, di bagian layar sebelah mana (0–1), dan apakah sasarannya memang bisa diketuk |
| `ketuk_dibatasi` | sesi ini menabrak batas 300 ketukan; sesudahnya ketukan tidak dicatat lagi |
| `gulir` | sejauh mana layar itu digulir (0–1): saat meninggalkan layar, **dan** saat 25 %, 50 %, 75 %, lalu 100 % pertama kali terlewat di layar itu |
| `balon` | balon chat melayang diturunkan utuh atau dikembalikan mengintip, dan dengan cara apa: ketukan atau tarikan jari |
| `pembukaan_masuk`, `pembukaan_selesai`, `loncat_ke_ringkasan` | sampai ke layar pembukaan, lama membacanya, seberapa jauh menggulir |
| `minat_kasus_lain` | tombol "Coba simulasi lain" (dulu "Mau coba kasus lain") ditekan; nama peristiwanya tetap |
| `akhir_kirim` | isian tiga pertanyaan dan kotak teks di layar akhir |
| `tampak` | halaman tersembunyi (pindah aplikasi, kunci layar) atau terlihat lagi, di layar mana, dan berapa lama tersembunyi; paling banyak 30 per sesi |
| `galat` | kesalahan JavaScript: jenisnya, pesannya **yang sudah disamarkan** (alamat → `‹url›`, angka ≥ 6 digit → `‹n›`, potongan UA → `‹ua›`, dipangkas 120 huruf), dan apakah asalnya aplikasi atau luar; paling banyak 5 per sesi, pesan yang sama sekali saja |
| `kinerja` | sekali per sesi: milidetik sampai layar pertama dirender, dan sampai ketukan hidup pertama (atau kosong bila tidak ada) |
| `tutup` | tab ditutup, di layar mana |

Daftar peristiwa di atas tertutup: pengumpul menolak apa pun di luarnya.

**Kapan, bukan hanya seberapa jauh.** `gulir` lahir di tiap ambang yang pertama
kali terlewat di satu kunjungan layar — 25 %, 50 %, 75 %, 100 % (25 dan 75 sejak
M3.8) — dan sekali lagi ketika layarnya ditinggalkan. Semuanya berbentuk sama (`{ layar, maks }`) —
tidak ada nama baru dan tidak ada medan baru, karena daftar itu tertutup dan
pengumpul di server memvalidasinya. Yang membedakan adalah urutannya: `gulir`
yang diikuti `layar_masuk` atau `tutup` pada milidetik yang sama adalah yang
lahir saat meninggalkan layar.

Alasannya satu sesi alpha yang sungguhan. Ia berada 18,6 menit di soal 1, gulir
100 %, tanpa satu ketukan pun, lalu menutup. Dengan `gulir` yang hanya lahir saat
pindah layar, *ia membaca semuanya lalu bingung harus apa* dan *ponselnya
ditinggal* menghasilkan angka yang sama persis. Dua cap waktu tambahan
memisahkan keduanya. Layar yang memang muat satu jendela melahirkan keduanya
pada detik nol — "100 % pada detik 0" berarti **tidak perlu menggulir**, bukan
membaca dengan kecepatan yang mustahil.

### Balon chat yang melayang

Begitu lebih dari separuh badan pesan teman lewat ke atas keping tanggal,
sebuah salinannya melayang tepat di bawah keping dan **mengintip**: tersisa
satu tepi setinggi 28 px. Ketuk atau tarik untuk menurunkannya utuh, tarik ke
atas untuk mengembalikannya mengintip. Ia tidak pernah menutupi keping, dan
"↑ Kembali ke dokumen" membawa pemain ke puncak halaman, tempat balonnya ada
di alirannya sendiri.

Yang dicatat adalah **perubahan keadaan**, bukan gerakan jari: tarikan yang
jatuh kembali ke tempat semula tidak melahirkan apa pun. Paling banyak **40**
peristiwa `balon` per sesi; sesudah itu pencatatannya berhenti, tanpa peristiwa
penanda — berbeda dengan `ketuk`, yang batasnya diumumkan lewat
`ketuk_dibatasi`. Balon yang digoyang empat puluh kali sudah menjawab
pertanyaannya sendiri, dan peristiwa ke-41 hanya menghabiskan kuota kiriman.

**Mengintip tidak bisa dicatat, dan itu sifat balonnya:** balon yang dibiarkan
tidak berpindah keadaan. Ringkasan karena itu membaca "hanya mengintip" dari
fakta lain — pemain sampai ke pilihan jawaban di layar itu, dan pilihan berada
jauh di bawah balon aslinya.

### Perangkat dan asal (M3.8)

Data 23 Sep: dari 13 orang asing, nol yang selesai, dan tidak ada yang bisa
mengatakan apa pun tentang mereka. Peristiwa `mulai` kini membawa lima belas
keterangan **kasar**, semuanya kategori atau angka berentang:

| medan | isi |
|---|---|
| `os` | `android`, `ios`, `windows`, `mac`, `linux`, `lain` |
| `peramban_dalam` | `threads`, `instagram`, `facebook`, `whatsapp`, `tiktok`, `line`, `telegram`, `x`, `lain` (tampilan-web tanpa nama), `tidak` (peramban biasa) |
| `perujuk` | `threads`, `instagram`, `facebook`, `whatsapp`, `google`, `x`, `tiktok`, `telegram`, `langsung`, `lain` — dari **nama host** saja |
| `skema_warna`, `penunjuk`, `koneksi`, `bahasa` | `terang`/`gelap` · `kasar`/`halus`/`tidak` · `4g`/`3g`/`2g`/`lambat`/`tidak-tahu` · `id`/`en`/`lain` |
| `jam_lokal`, `hari_lokal`, `zona_menit` | jam 0–23, hari 0–6, zona dalam menit ke timur (WIB = 420) |
| `tinggi_layar`, `rasio_piksel` | tinggi jendela, rasio piksel satu desimal |
| `hemat_data`, `gerak_dikurangi`, `mandiri` | ya/tidak; `null` bila perambannya tidak mengatakan |

User-Agent dibaca **hanya di peramban**, oleh fungsi murni
`web/src/perangkat.ts`, dan yang keluar hanya dua kategorinya. Alamat perujuk
tidak pernah disimpan — path dan query-nya (tempat Threads dan Instagram
menaruh kode pelacaknya) dibuang sebelum apa pun dikirim. E-26 membuktikannya
dari antrean kiriman satu permainan penuh dengan UA dan perujuk sungguhan:
nol `Mozilla`, nol `AppleWebKit`, nol `://`. Pengumpul SKEMA 3 menolak apa pun
di luar daftar kategori itu (pertahanan kedua).

Tidak ada lebar/tinggi layar fisik, daftar huruf, kanvas, atau sidik jari
lain: yang ditanyakan adalah pertanyaan desain ("apakah opsi pertama terlihat
tanpa menggulir di ponsel ini"), bukan "siapa orang ini".

### Ketukan: nama, bukan isi

Yang dicatat sebuah `ketuk` adalah `uid` — nama yang **kami** tulis sendiri di
markup, misalnya `opsi:b`, `lembar:susp-2025-06-30`, `kaki:div-2025-09-16`,
`istilah`, `bilah:turun` — dan bukan isi elemennya. Tidak ada `textContent`,
tidak ada nilai kotak teks, tidak ada koordinat mutlak: posisinya relatif
terhadap ukuran jendela, dengan tiga desimal.

`mati: true` berarti ketukan mendarat di sesuatu yang tidak bisa diketuk.
Itu bukan kesalahan pemain melainkan pertanyaan untuk kami: kalau banyak orang
mengetuk badan sebuah lembar dokumen, lembar itu perlu menjadi pintu.

Ketukan yang sebenarnya bagian dari guliran (jari bergerak lebih dari 10 piksel)
tidak dicatat sama sekali.

### Nomor pengunjung

Supaya "seratus peserta" berarti seratus orang dan bukan seratus sesi, aplikasi
menyimpan **satu** angka acak (UUID v4) di `localStorage` browser pemain:

| kunci | isi |
|---|---|
| `pengunjung` | satu UUID v4 acak, dibuat di browser pemain, tidak pernah dipakai di tempat lain |
| `kunjungan_ke` | sudah berapa kali halaman ini dibuka dari browser itu |
| `kasus_dimainkan` | daftar `kasus_id` yang sudah dimainkan dari browser itu, supaya kunjungan berikutnya mendapat kasus lain |

Kunci ketiga lahir bersama kasus kedua: tanpa daftar itu, orang yang kembali
besok disodori kasus yang persis sama. Isinya nama kasus, bukan jawaban —
jawaban tidak pernah disimpan di browser pemain.

Ia **bukan cookie**: tidak ikut terkirim di setiap permintaan dan tidak bisa
dibaca situs lain. Tetapi ia tetap sesuatu yang disimpan di browser pemain, dan
kalimat di layar akhir mengatakannya. Kalau `localStorage` tidak tersedia atau
melempar — mode penyamaran, penyimpanan penuh, penyimpanan diblokir — nomornya
`null`, permainan tetap jalan, dan sesi itu dihitung terpisah di ringkasan,
tidak ditebak sebagai orang baru.

Menghapus data situs di browser menghapus nomor itu, dan kunjungan berikutnya
terhitung sebagai orang baru. Kami tidak punya cara mengenalinya lagi, dan
memang tidak mau punya.

### Kode penanda tautan

Tautan yang disebar boleh membawa `?k=<kode>` — huruf kecil dan angka, paling
panjang delapan karakter — supaya sesi dari satu saluran bisa dipisahkan dari
sesi saluran lain:

```
https://contoh.invalid/?k=wa1
```

Kodenya masuk ke peristiwa `mulai` sebagai `penanda`, **tidak pernah tampil di
layar**, dan tidak pernah dipakai sebagai identitas. Nilai yang tidak cocok
diabaikan diam-diam. Dua kode dikecualikan tanpa diminta di `alpha:ringkas`:
`afriza` (pemilik) dan `uji` (reviewer) — jumlah sesi yang dikecualikan selalu
ikut dicetak.

### Yang tidak ada, dan tidak akan ditambahkan

- tidak ada akun, login, atau nama;
- tidak ada identitas selain satu nomor acak di atas — tidak ada sidik jari
  perangkat, tidak ada iklan, tidak ada pihak ketiga;
- pengumpul **tidak menulis alamat IP maupun User-Agent** ke berkas — tidak ada
  header apa pun yang disimpan, dan ia hanya mendengarkan di loopback;
- id sesi adalah angka acak yang hidup di memori tab saja dan hilang saat tab
  ditutup;
- teks yang diketik tidak pernah dicatat, kecuali kotak masukan di layar akhir
  yang memang meminta tulisan.

### Membaca hasilnya

```bash
npm run alpha:ringkas -- data/peristiwa-2026-09-21.jsonl
npm run alpha:ringkas -- data/*.jsonl --kecuali uji     # ganti daftar pengecualian
npm run alpha:ringkas -- data/*.jsonl --kecuali ""      # jangan kecualikan apa pun
```

Keluarannya tabel Markdown: berapa orang (bukan berapa sesi), sepuluh `uid`
teratas per layar beserta ketukan matinya, kedalaman gulir median, dan per layar
soal berapa sesi yang mengetuk bilah turun (uid `bilah:turun`; labelnya "↓ Pilih
jawaban" sejak M3.9, dulu "↓ Jawab di bawah" — tabel ringkasannya masih memakai
label lama), membuka sumber, atau membuka baris istilah.

Bagian **"Kapan, bukan hanya seberapa jauh"** menjawab per sesi × layar: detik
ke ketukan pertama, detik ke 50 %, detik ke 100 %, dan jeda diam terpanjang
beserta di antara peristiwa apa. Berkas yang terkumpul sebelum pelacak
bertingkat tidak punya peristiwa ambang, jadi kolom 50 %/100 % di sana "—" —
itu ketiadaan data, bukan nol. Contohnya ada di
[`alat/contoh/peristiwa-bertingkat.jsonl`](alat/contoh/peristiwa-bertingkat.jsonl),
yang memuat tiga sesi yang sengaja berlawanan:

```bash
npm run alpha:ringkas -- alat/contoh/peristiwa-bertingkat.jsonl
```

```
| sesi                         | layar  | ketuk-1 | 50 %   | 100 %  | diam     |
| sesi-h-membaca-lalu-menjawab | soal-1 | 10.7 d  | 20.5 d | 46.2 d | 19.4 d   |
| sesi-i-ditinggal-di-soal-1   | soal-1 | —       | 1.5 d  | 3.2 d  | 18.5 mnt |
```

Kedua sesi itu punya kedalaman gulir yang **sama persis** di soal 1 (100 %).
Hanya kolom waktunya yang memberi tahu bahwa yang satu membaca dan yang satu
meninggalkan ponselnya.

Bagian **"Balon chat"** menjawab pertanyaan pemilik tentang balon melayang:
per sesi × layar soal, berapa kali ia diturunkan lewat ketukan dan berapa lewat
tarikan; per soal, berapa sesi yang tidak menyentuhnya sama sekali, hanya
mengintip, atau pernah menurunkannya. Kolom terakhirnya menyandingkan
`gulir_balik_ke_kartu` rata-rata antara sesi yang memakai balon dan sesi yang
tidak — angka yang sama yang membuat balon ini ada. Contohnya di
[`alat/contoh/peristiwa-balon.jsonl`](alat/contoh/peristiwa-balon.jsonl):

```bash
npm run alpha:ringkas -- alat/contoh/peristiwa-contoh.jsonl alat/contoh/peristiwa-balon.jsonl
```

```
| layar  | sesi | tidak menyentuh | hanya mengintip | pernah menurunkan | gulir balik (pakai balon) | gulir balik (tanpa balon) |
| soal-1 | 7    | 2               | 3               | 2                 | 0.0 (2 sesi)              | 0.7 (3 sesi)              |
| soal-2 | 5    | 0               | 3               | 2                 | 0.5 (2 sesi)              | 2.0 (2 sesi)              |
```

Delapan bagian M3.8 — **corong per penanda** (sesi · orang · sampai soal 1…n ·
pembukaan · akhir, keluaran bawaan), **pergi cepat** (< 15 d tanpa ketukan,
per layar per penanda), **perangkat** (os × peramban dalam aplikasi, skema
warna, penunjuk, ember lebar, koneksi — tiap baris dengan "sampai soal 1" dan
"sampai akhir"), **asal** (perujuk × penanda), **jam setempat** (ember 3 jam ×
hari), **kinerja** (median dan p90 `ms_ke_tampil` per os dan koneksi),
**galat** (pesan × sesi × layar), dan **keluar-masuk**. Contohnya, enam sesi
yang tiap angkanya bisa dihitung tangan, di
[`alat/contoh/peristiwa-pelacak-lengkap.jsonl`](alat/contoh/peristiwa-pelacak-lengkap.jsonl):

```bash
npm run alpha:ringkas -- alat/contoh/peristiwa-pelacak-lengkap.jsonl --kecuali ""
```

```
| penanda | sesi | orang | sampai soal-1 | sampai soal-2 | sampai soal-3 | pembukaan | akhir |
| semua | 6 | 5 | 5 | 3 | 2 | 2 | 1 |
| sekree | 3 | 2 | 3 | 2 | 2 | 2 | 1 |
| threads | 2 | 2 | 1 | 0 | 0 | 0 | 0 |
```

Berkas sebelum M3.8 tetap terbaca: medan yang tidak ada dicetak "—" —
ketiadaan data, bukan nol.

Berkas yang terkumpul **sebelum** balon melayang ada tidak punya peristiwa
`balon` sama sekali; di sana ketiga kotak hanya menggambarkan seberapa jauh
orang sampai, dan yang berarti adalah kolom pembandingnya. Laporannya
mengatakan itu sendiri.

**Mengecualikan sesi sendiri lewat nomor pengunjung.** Penanda `?k=` hanya
bekerja kalau tautannya memang dipakai — dan pemilik pernah membuka situsnya
tanpa itu, sehingga sesinya ikut terhitung sebagai peserta. Nomor pengunjung
(D-13) acak tetapi tetap sama tiap kunjungan dari browser yang sama, jadi itulah
kunci yang benar:

```bash
# satu UUID v4 per baris; baris kosong dan #komentar diabaikan
npm run alpha:ringkas -- data/*.jsonl --kecuali-pengunjung daftar-saya.txt
```

Tanpa argumen itu, berkas `pengunjung-dikecualikan.txt` **di direktori berkas
peristiwa pertama** dipakai bila ada. Contohnya:
[`alat/contoh/pengunjung-dikecualikan.txt`](alat/contoh/pengunjung-dikecualikan.txt).

Dua hal yang dijaga di sini. Baris yang bukan UUID v4 **menghentikan** perintahnya
dengan galat yang menyebut nomor barisnya — daftar pengecualian yang salah ketik
dan diam akan membuang sesi orang sungguhan tanpa ada yang tahu. Dan jumlah yang
dikecualikan lewat nomor pengunjung dicetak **terpisah** dari yang lewat penanda,
beserta berapa pengunjung, supaya ketiga angkanya menjumlah kembali ke seluruh
sesi. Berkas mentahnya tidak pernah diubah.

## Penyusun LLM (M2d, eksperimen — belum dipasang ke produk)

`factory/llm/` menyusun draf simulasi dengan LLM **di bawah validator**: paket
fakta ringkas yang sudah lolos mesin verifikasi (tanpa JSON mentah Sectors) →
model lewat klien OpenAI-compatible buatan sendiri → validator deterministik
(setiap angka berjejak ke fakta, tanpa tanggal sesudah T, bentuk 2×2) → umpan
balik → tulis ulang, paling banyak tiga kali. Pagu dolar ditegakkan kode
**sebelum** tiap panggilan; ledger biaya di `.cache/llm/` (tidak di-commit).

```bash
npm run llm:model                          # GET /models (tanpa biaya)
LLM_PAGU_USD=5 npm run llm:tanding         # uji tanding 3 model × 3 paket (berbayar, di bawah pagu)
npm run llm:penguji && npm run llm:laporan # bahan uji buta, lalu docs/bukti/uji-tanding-model.md
```

Butuh `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, dan `LLM_PAGU_USD` di `.env`
(atau lingkungan proses; `.env` menang). Hasil dan rekomendasi model:
`docs/bukti/uji-tanding-model.md`; keluaran mentah: `eval/keluaran-m2d/`.

**Lingkar agen (M2d-2).** `factory/llm/agen.ts` menulis satu omongan per
panggilan, lalu validator → gerbang jawab-dengan-kartu (pembaca yang memegang
kartu harus benar) → gerbang tebak buta (tiga penebak tanpa kartu tidak boleh
benar, kriteria K-05); omongan yang lolos dikunci kode, yang ditolak ditulis
ulang dengan umpan balik, paling banyak 5 putaran. Setiap langkah dicatat kode
saat terjadi di `jejak-agen.json` (skema `factory/llm/jejak-agen.skema.json`).

```bash
npm run agen:susun -- tirt                 # satu simulasi sungguhan (berbayar, di bawah pagu)
npm run agen:penguji && npm run agen:laporan  # bahan penguji eksternal, lalu docs/bukti/lingkar-agen.md
```

Hasil jujurnya — belum ada simulasi yang lolos penuh — ada di
`docs/bukti/lingkar-agen.md`; keluaran mentah dan jalan yang dibuang di
`eval/keluaran-m2d2/`.

**Lingkar berperan (M2d-3).** Penulis tidak menilai karyanya sendiri
(`factory/llm/peran.md`): perencana (kode) memberi tiap omongan satu *sudut* —
fakta yang wajib jadi kartu penentunya; penulis DeepSeek menulis dengan 2–3
contoh dari bank gaya (`bank-gaya.json`); pemeriksa (kode) menjalankan
validator + gerbang G (`gerbang-g.ts`: kunci yang bisa dihitung dari angka di
teks, bahasa kaku); pembaca kartu dan tiga penebak DeepSeek; kritikus GLM-5.3
yang melihat kunci dan kartu tetapi hanya boleh menyebut keberatan. Omongan
dikunci hanya bila keempat penilai tidak keberatan; yang gagal 5 putaran
dibuang dan mendapat sudut lain (paling banyak 3). Pagu milestone ditegakkan
kode (`--pagu-milestone`).

```bash
npm run peran:susun -- tirt --pagu-milestone 2.00   # berbayar, di bawah pagu kumulatif dan pagu milestone
npm run peran:penguji && npm run peran:laporan      # bahan penguji eksternal, lalu docs/bukti/lingkar-agen-peran.md
```

Hasil dan keterbatasannya: `docs/bukti/lingkar-agen-peran.md`; keluaran mentah
di `eval/keluaran-m2d3/`.

**Gaya & makna (M2d-4).** Generasi berikutnya dari lingkar berperan
(`GENERASI_M2D4`): pemeriksa menambah gerbang gaya (`gerbang-gaya.ts`: pilihan
≤ 11 kata dan pesan ≤ 26 kata — maksimum soal manusia di `cases/`, satu klausa
per pilihan, "gw/aku" bukan "gue"); penulis memakai bank gaya v2
(`bank-gaya-v2.json`, ditulis baru dari statistik korpus berlisensi MIT);
penebak ke-3 memakai GLM-5.3; kritikus dipanggil sebelum penebak dengan dua
pertanyaan makna wajib. Ledger biaya lama diarsipkan, tidak dihapus.

```bash
npm run gaya:arsip                                   # sekali, sebelum panggilan berbayar pertama
npm run gaya:susun -- tirt                           # berbayar; pagu milestone US$4,00 ditetapkan kode
npm run gaya:penguji && npm run gaya:laporan         # bahan penguji eksternal, lalu docs/bukti/lingkar-agen-gaya.md
```

Hasil dan keterbatasannya: `docs/bukti/lingkar-agen-gaya.md`; keluaran mentah
di `eval/keluaran-m2d4/`.

## Susunan

| Folder | Isi |
|---|---|
| `factory/` | Pabrik puzzle: agent yang memilih kasus, menarik data Sectors, membaca PDF resmi, memverifikasi, lalu menyusun soal |
| `cases/` | Hasil pabrik: kasus terverifikasi beserta jejak verifikasinya (JSON, ikut di-commit) |
| `web/` | Aplikasi pemain: statis, tanpa login, membaca `cases/` |
| `server/` | Pengumpul peristiwa alpha: Node bawaan saja, nol dependensi |
| `alat/` | Perkakas: ringkasan data alpha menjadi tabel Markdown, dan gate `periksa:desain` |
| `deploy/` | Berkas dan skrip untuk menerbitkan alpha; tidak pernah dijalankan otomatis |
| `e2e/` | Uji ujung-ke-ujung di Chromium sungguhan; lihat `docs/uji-e2e.md` |
| `docs/` | Catatan arsitektur, aturan verifikasi, isi tiap kasus, dan sumber |

## Sumber data

- Sectors Financial API v2 (sumber inti; tanpa Sectors tidak ada kasus)
- Dokumen resmi IDX dan KSEI sebagai pemutus ketika data berkonflik

## Lisensi

MIT (menyusul).
