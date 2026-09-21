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
npm run dev                             # pemain di http://localhost:5173
```

Perintah lain: `npm test`, `npm run typecheck`, `npm run build`, `npm run preview`,
`npm run periksa:desain` (menjaga aturan tampilan di `docs/desain.md`: skala huruf,
sudut membulat, dua tulisan kapital, dan tidak ada tombol utama yang tampil mati).

Berkas kasus sudah ikut di repo, jadi `npm run dev` jalan tanpa `build:case`.

## Uji di browser sungguhan

```bash
npm run e2e          # memainkan Runut di Chromium, ponsel 360 x 640, terang dan gelap
npm run e2e:lihat    # sama, tetapi kelihatan
```

`npm run e2e` menyalakan servernya sendiri di port miliknya (8797, 5183, 4183,
4184) dan mematikannya lagi, lalu memainkan satu kasus penuh terhadap **build
produksi dengan pengumpul peristiwa yang sungguhan**. Tiap layar disimpan sebagai
PNG di `.cache/e2e/layar/`, supaya bisa dilihat tanpa membuka browser.

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

> Kami mencatat apa yang diketuk dan seberapa jauh layar digulir, dan menyimpan
> satu nomor acak di browsermu supaya tahu kalau kamu kembali. Bukan nama, bukan
> akun, bukan alamat IP; tidak dibagikan ke siapa pun. Teks yang kamu ketik tidak
> dicatat, kecuali kotak masukan ini.

Yang tercatat adalah perilaku di halaman, bukan orangnya:

| dicatat | artinya |
|---|---|
| `mulai` | permainan dibuka: lebar layar, kode penanda tautan, nomor pengunjung, dan kunjungan ke berapa |
| `layar_masuk` | pindah ke layar mana |
| `kartu_buka` | sumber sebuah lembar dokumen dibuka |
| `pilih` | pilihan jawaban dipindah, dan sudah berapa kali |
| `kunci_jawaban` | jawaban dikunci: pilihannya, benar atau tidak, lama di soal itu, berapa lama lembar-lembarnya terlihat sebelumnya |
| `lihat_balik` | kembali melihat soal yang sudah dikunci |
| `ketuk` | satu ketukan: di layar mana, pada blok bernama apa, di bagian layar sebelah mana (0–1), dan apakah sasarannya memang bisa diketuk |
| `ketuk_dibatasi` | sesi ini menabrak batas 300 ketukan; sesudahnya ketukan tidak dicatat lagi |
| `gulir` | sejauh mana layar itu digulir (0–1), dikirim saat meninggalkannya |
| `pembukaan_masuk`, `pembukaan_selesai`, `loncat_ke_ringkasan` | sampai ke layar pembukaan, lama membacanya, seberapa jauh menggulir |
| `minat_kasus_lain` | tombol "Mau coba kasus lain" ditekan |
| `akhir_kirim` | isian tiga pertanyaan dan kotak teks di layar akhir |
| `tutup` | tab ditutup, di layar mana |

Daftar peristiwa di atas tertutup: pengumpul menolak apa pun di luarnya.

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
soal berapa sesi yang mengetuk "↓ Jawab di bawah", membuka sumber, atau membuka
baris istilah.

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
| `docs/` | Catatan arsitektur, aturan verifikasi, dan sumber |

## Sumber data

- Sectors Financial API v2 (sumber inti; tanpa Sectors tidak ada kasus)
- Dokumen resmi IDX dan KSEI sebagai pemutus ketika data berkonflik

## Lisensi

MIT (menyusul).
