# Arah desain pemain kasus

Dokumen ini mengikat. Setiap warna, huruf, dan gerak di `web/` diturunkan dari sini; yang tidak disebut di sini tidak ditambahkan.

## Subjek, pembaca, tugas halaman

- **Subjek:** satu hari yang dibekukan di Bursa Efek Indonesia. Di satu sisi ada omongan grup obrolan; di sisi lain ada dokumen resmi. Pemain menempelkan yang pertama ke yang kedua.
- **Pembaca:** orang Indonesia usia 20-an yang belum pernah membeli saham, membuka tautan dari story Instagram, di ponsel Android, satu tangan, malas berhitung.
- **Tugas tunggal tiap layar soal:** membuat kartu fakta terbaca *sebelum* jempol sampai ke opsi.

## Dua bahan, dua suara

Seluruh antarmuka hanya punya dua bahan, dan bedanya membawa arti:

1. **Lembar dokumen** — suara resmi. Kartu fakta tampak seperti potongan surat: baris kepala berhuruf mesin tik (jenis sumber · tanggal terbit), lalu satu-dua kalimat. Lembar dari sumber resmi punya **garis kepala utuh** berwarna tinta stempel; lembar "Dihitung dari…" punya **garis kepala putus-putus**. Garis itu bukan hiasan: ia memberi tahu pemain mana yang diumumkan pihak lain dan mana yang kami hitung.
2. **Gelembung obrolan** — suara teman. Omongan teman di batang soal tampil sebagai gelembung pesan **berekor**, dengan label kecil "Temanmu" di atasnya. Bukan inisial huruf: huruf "A" di samping opsi a–d terbaca sebagai opsi. Bentuk (ekor), bukan hanya rona hijau, yang membedakannya dari lembar. Tidak ada elemen lain yang berbentuk gelembung.

**Lembar hanya untuk fakta.** Apa pun yang merupakan suara *kami* — temuan jejak verifikasi, pesan "kasus berikutnya sedang disiapkan", catatan penjelas — **tidak** memakai bahan lembar. Ia ditulis langsung di atas kertas dengan garis kiri tipis `--tinta-redup`. Kalau lembar dipakai untuk segalanya, ia berhenti berarti "ini sumbernya".

**Garis kepala harus bisa dibaca artinya.** Lembar bergaris putus-putus wajib berkepala "Dihitung dari …". Di soal pertama, satu baris legenda 13 px di bawah tumpukan kartu: "Garis utuh: diumumkan pihak resmi. Garis putus-putus: kami yang menghitung."

**Angka di dalam lembar tebal, bukan tautan.** Satu lembar = satu pintu ke sumbernya: kepala lembar (selebar kartu, tinggi ≥ 44 px) membuka panel sumber yang mendaftar setiap angka di lembar itu beserta asalnya. Tautan angka tetap dipakai di teks kunci dan layar pembukaan, dengan `padding-block: 8px` dan tinggi baris 1,7 supaya bidang sentuhnya layak.

## Tanda tangan: kalender sobek

Satu-satunya tempat desain ini berani. Penanda waktu beku berwujud **halaman kalender sobek** — benda yang ada di hampir setiap rumah dan warung di Indonesia: pita nama bulan di atas, angka tanggal sangat besar, nama hari di bawahnya.

- **Benda yang sama di mana pun ia muncul:** sisi atas halaman kalender **bergerigi** (bekas perforasi sobekan; gigi ±6 px lewat `clip-path`), dan gerigi yang sama menjadi sisi atas keping yang menempel di layar soal. Halaman kalender bukan kartu: ia tidak berbagi bentuk dengan lembar dokumen.
- **Layar pertama:** halaman kalender besar di tengah — `OKTOBER 2025` / `8` / `RABU` — di atas kalimat "Kita mundur ke Rabu, 8 Oktober 2025."
- **Layar soal:** kalender mengecil menjadi keping yang **menempel di atas layar** dan tetap terlihat saat menggulir: `RABU · 8 OKT 2025`, dengan kata "Hari ini".
- **Layar pembukaan:** satu-satunya gerak yang diatur di seluruh aplikasi — halaman kalender **tersobek dan jatuh keluar dari tempatnya**: mulai 250 ms sesudah layar tampil (supaya tidak tertelan lompatan gulir ke atas), `overflow: visible`, berputar sampai 14°, turun 220 px sambil memudar, 700 ms; ruang bekasnya baru menutup 200 ms sesudah sobekan dimulai. Lalu muncul "Waktu berjalan lagi" dan kejadian sesudahnya tersusun sebagai garis waktu berkeping tanggal (9 Okt, 10 Okt, 22 Okt, … 16 Jul 2026). Di sini urutan memang informasi, jadi penanda urutan dipakai; di tempat lain tidak.
- Dengan `prefers-reduced-motion`, sobekan diganti pergantian langsung.
- **Layar terima kasih menutup perjalanan waktunya:** halaman kalender yang sama, kali ini bertanggal **hari ini** menurut jam perangkat, dengan kalimat "Kamu kembali ke hari ini." Tanpa itu, kesan terakhir produk ini adalah layar kosong.

Tidak ada gerak lain selain transisi keadaan 120–160 ms pada opsi dan tombol. Tidak ada konfeti, tidak ada angka yang berhitung naik, tidak ada efek melayang.

## Warna

Diambil dari benda-bendanya: kertas HVS, tinta pulpen, **tinta stempel ungu-biru** kantor Indonesia, dan merah pita kalender. Merah **hanya** hidup di kalender.

| nama | terang | gelap | dipakai untuk |
|---|---|---|---|
| `--kertas` | `#F3F5F7` | `#0F1524` | latar halaman |
| `--lembar` | `#FFFFFF` | `#182038` | kartu fakta, panel sumber |
| `--tinta` | `#14213D` | `#E8ECF4` | teks utama |
| `--tinta-redup` | `#4A5670` | `#A4AEC4` | baris kepala kartu, istilah, kaki halaman |
| `--stempel` | `#4B3FA7` | `#A99BFF` | garis kepala kartu, tautan angka ke sumber, fokus, tombol utama |
| `--merah-kalender` | `#D7263D` | `#FF5C6F` | pita bulan di kalender — tidak di tempat lain |
| `--obrolan` | `#DFF3E4` | `#1F3A2E` | gelembung omongan teman |
| `--cocok` | `#177052` | `#5FD3A6` | umpan balik: jawaban cocok dengan kartu |
| `--belum-cocok` | `#8A5300` | `#F0B45A` | umpan balik: belum cocok — **kuning tua, bukan merah**; nadanya ke tugas, bukan menghukum |

Garis tepi **kontrol** (baris opsi, petak pilihan layar akhir, kotak teks) memakai `--garis-kontrol` = `--tinta` 45 % sehingga ≥ 3:1 terhadap latarnya (WCAG 1.4.11); garis tepi lembar yang bukan kontrol tetap `--tinta` 12 %. Setiap `color-mix()` didahului nilai cadangan `rgba()` dan setiap gaya yang bergantung pada `:has()` punya cadangan, untuk WebView Android lama. Setiap pasangan teks/latar wajib ≥ 4,5:1; rasio dihitung dan dilaporkan, bukan dikira-kira. Benar/belum selalu disertai ikon dan kata, tidak pernah warna saja.

## Huruf

Tanpa unduhan dan tanpa CDN (aplikasi ini tidak boleh memanggil jaringan luar), jadi tiga peran dipetakan ke huruf bawaan perangkat, dipilih dengan sengaja:

| peran | tumpukan | pemakaian |
|---|---|---|
| **Kalender** (display) | `"Avenir Next Condensed", Bahnschrift, "Roboto Condensed", sans-serif-condensed, "Arial Narrow", sans-serif` · `font-stretch: condensed` · tebal 800 | angka dan nama hari di kalender, judul layar. **Hanya itu.** Rapat dan tebal seperti angka kalender sobek. |
| **Baca** (body) | `system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif` | kalimat kartu, gelembung, opsi, teks kunci. Dasar 17 px, tinggi baris 1,5; angka penting tebal 700. |
| **Mesin tik** (utilitas) | `ui-monospace, "SF Mono", "Cascadia Mono", "Roboto Mono", "Droid Sans Mono", monospace` | baris kepala kartu, tanggal keping, label sumber. 12–13 px, huruf besar, jarak huruf 0,06 em — seperti nomor surat. |

Skala: 13 · 15 · 17 · 20 · 28 · 72 (angka kalender di layar pertama). Tidak ada ukuran di luar skala.

## Tata letak (acuan 375 × 812, satu kolom, maksimum 560 px di layar lebar)

```
┌──────────────────────────────────┐
│ ▲▲▲ HARI INI  RABU · 8 OKT 2025  │ ← keping bergerigi, menempel
│ ● ○ ○                            │ ← tiga titik: memang tiga soal berurutan
├──────────────────────────────────┤
│ ┃ PENGUMUMAN BURSA · 30 JUN 2025 │ garis utuh = sumber resmi
│ ┃ Bursa menghentikan …           │ kepala satu baris, isi padat
│ ╎ DIHITUNG DARI DATA HARGA · …   │ putus-putus = kami yang menghitung
│ ╎ Harga naik dari Rp8 ke Rp178 … │ angka tebal, bukan tautan
│ suspensi · hari bursa        ▸   │ istilah: satu baris, ketuk = buka arti
│ Hari ini 8 Oktober 2025.         │
│ Temanmu                          │
│ ╭────────────────────────────╮   │
│ │ "Naik 22 kali tuh pasti …" ◣   │ gelembung berekor
│ ╰────────────────────────────╯   │
│ Mana yang paling tepat?          │ 15 px
│ ┌ a  Betul, …                  ┐ │ opsi pertama sudah terlihat
│ ┌ b  Keliru, …                 ┐ │ sebelum kartu hilang dari layar
│ ┌ c  …                         ┐ │
│ ┌ d  …                         ┐ │
│ ↑ Kembali ke kartu               │ menggulir ke tumpukan kartu, selalu
├──────────────────────────────────┤
│ [       Kunci jawaban          ] │ ← baru muncul sesudah ada pilihan
└──────────────────────────────────┘
```

- **Sasaran tinggi:** layar soal dua-kartu ≤ 1,35 × tinggi layar (≤ 1.100 px pada 375 × 812) sebelum dikunci; opsi pertama mulai terlihat sebelum kartu terakhir keluar dari layar. Soal empat-kartu boleh lebih tinggi; tingginya dilaporkan, bukan disembunyikan.
- **Tidak ada tombol lipat di kartu.** Kartu selalu terbuka; tugas layar ini membuat kartu terbaca, bukan menyembunyikannya.
- **Kaki halaman tiga kalimat hanya tampil di layar pembuka dan layar akhir**, tidak di layar soal.
- **Tombol utama tidak pernah tampil dalam keadaan mati.** "Kunci jawaban" baru muncul sesudah ada pilihan.
- Kartu: sudut 6 px, garis tepi 1 px `--tinta` 12 %, tanpa bayangan, bantalan 6/12 px, kepala satu baris. Kartu bertumpuk dengan jarak 8 px — tumpukan kertas, bukan galeri.
- Sesudah jawaban dikunci, di bawah opsi muncul **cap**: bingkai persegi panjang bersudut tumpul, miring −3°, huruf mesin tik: `COCOK DENGAN KARTU` atau `BELUM COCOK DENGAN KARTU`, lalu teks kunci. Tepat di atas teks kunci tampil **salinan ringkas kartu penentu** (kepala + isi, paling banyak dua kartu), supaya mata tidak perlu menggulir 1,6 layar untuk mencocokkan. Sesudah dikunci, opsi yang **benar** diberi tanda "✓ yang cocok dengan kartu" berhuruf mesin tik dan garis 2 px `--cocok`; pilihan pemain yang keliru diturunkan ke garis `--tinta-redup`. Benar/belum tidak pernah ditandai warna saja. Cap hanya muncul di sini.
- Panel sumber: lembar bawah di < 640 px. Yang langsung terlihat hanya tiga hal dalam bahasa orang: kalimat resminya, cara menghitungnya (kalau dihitung), dan "Sudah bisa dibaca publik sejak 8 Oktober 2025" — tanggal selalu ditulis seperti di bagian lain, tidak pernah `2025-10-08`. Endpoint, parameter, kode fakta, dan jenis sumber ada di bawah lipatan "Rincian teknis (untuk yang ingin memeriksa)". Saat panel terbuka: fokus masuk ke panel dan terperangkap di dalamnya, latar tidak bisa digulir; saat ditutup (tombol, Escape, ketuk tirai) fokus kembali ke pemicunya.
- Jejak verifikasi di layar pembukaan: satu paragraf pengantar, selebihnya di bawah lipatan yang **tampak** bisa dibuka (penanda segitiga tidak boleh hilang). Angka di dalamnya ditulis seperti di kartu ("4,69 miliar lembar", "10 juta lembar"), bukan `4692137600`.
- Tombol kembali Android/peramban berpindah ke layar sebelumnya di dalam kasus (satu entri riwayat per layar), bukan keluar dari situs dan menghapus sesi.
- Target sentuh ≥ 44 px; fokus papan ketik terlihat (garis `--stempel` 2 px, jarak 2 px).

## Kata-kata di antarmuka

Satu nama untuk satu tindakan, dari awal sampai akhir: **Mulai kasus** → **Kunci jawaban** → **Lanjut ke soal 2** / **Lanjut ke soal 3** → **Lihat yang terjadi sesudahnya** → **Lanjut: tiga pertanyaan singkat** → **Selesai** · **Mau coba kasus lain**. Di layar soal: **Kembali ke kartu**. Kosakata pabrik ("kode fakta", "jenis sumber: turunan", "endpoint", "aturan R6") tidak tampil di luar lipatan rincian teknis. Huruf kalimat, tanpa tanda seru. Umpan balik berbicara tentang kartu, bukan tentang orangnya: "cocok dengan kartu", bukan "kamu hebat".

## Yang sengaja tidak ada

Tombol lipat di kartu; tombol utama dalam keadaan mati; inisial huruf di gelembung; gradasi; bayangan berlapis; efek kaca; emoji sebagai ikon; ilustrasi stok; grafik harga (produk ini bukan tentang menebak harga); angka skor, poin, lencana, papan peringkat; animasi selain yang disebut di atas; huruf serif; latar krem; hitam pekat dengan aksen neon.
