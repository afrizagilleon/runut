# Arah desain pemain kasus

Dokumen ini mengikat. Setiap warna, huruf, dan gerak di `web/` diturunkan dari sini; yang tidak disebut di sini tidak ditambahkan.

## Subjek, pembaca, tugas halaman

- **Subjek:** satu hari yang dibekukan di Bursa Efek Indonesia. Di satu sisi ada omongan grup obrolan; di sisi lain ada dokumen resmi. Pemain menempelkan yang pertama ke yang kedua.
- **Pembaca:** orang Indonesia usia 20-an yang belum pernah membeli saham, membuka tautan dari story Instagram, di ponsel Android, satu tangan, malas berhitung.
- **Tugas tunggal tiap layar soal:** membuat kartu fakta terbaca *sebelum* jempol sampai ke opsi.

## Dua bahan, dua suara

Seluruh antarmuka hanya punya dua bahan, dan bedanya membawa arti:

1. **Lembar dokumen** — suara resmi. Kartu fakta tampak seperti potongan surat: baris kepala berhuruf mesin tik (jenis sumber · tanggal terbit), lalu satu-dua kalimat. Lembar dari sumber resmi punya **garis kepala utuh** berwarna tinta stempel; lembar "Dihitung dari…" punya **garis kepala putus-putus**. Garis itu bukan hiasan: ia memberi tahu pemain mana yang diumumkan pihak lain dan mana yang kami hitung.
2. **Gelembung obrolan** — suara teman. Omongan teman di batang soal tampil sebagai gelembung pesan dengan inisial pengirim. Tidak ada elemen lain yang berbentuk gelembung.

## Tanda tangan: kalender sobek

Satu-satunya tempat desain ini berani. Penanda waktu beku berwujud **halaman kalender sobek** — benda yang ada di hampir setiap rumah dan warung di Indonesia: pita nama bulan di atas, angka tanggal sangat besar, nama hari di bawahnya.

- **Layar pertama:** halaman kalender besar di tengah — `OKTOBER 2025` / `8` / `RABU` — di atas kalimat "Kita mundur ke Rabu, 8 Oktober 2025."
- **Layar soal:** kalender mengecil menjadi keping yang **menempel di atas layar** dan tetap terlihat saat menggulir: `RABU · 8 OKT 2025`, dengan kata "Hari ini".
- **Layar pembukaan:** satu-satunya gerak yang diatur di seluruh aplikasi — halaman kalender **tersobek** (berputar sedikit, jatuh, memudar; 600 ms), lalu muncul "Waktu berjalan lagi" dan kejadian sesudahnya tersusun sebagai garis waktu berkeping tanggal (9 Okt, 10 Okt, 22 Okt, … 16 Jul 2026). Di sini urutan memang informasi, jadi penanda urutan dipakai; di tempat lain tidak.
- Dengan `prefers-reduced-motion`, sobekan diganti pergantian langsung.

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
| `--cocok` | `#1B7F5C` | `#5FD3A6` | umpan balik: jawaban cocok dengan kartu |
| `--belum-cocok` | `#8A5300` | `#F0B45A` | umpan balik: belum cocok — **kuning tua, bukan merah**; nadanya ke tugas, bukan menghukum |

Setiap pasangan teks/latar wajib ≥ 4,5:1; rasio dihitung dan dilaporkan, bukan dikira-kira. Benar/belum selalu disertai ikon dan kata, tidak pernah warna saja.

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
┌───────────────────────────────┐
│ ▣ HARI INI  RABU · 8 OKT 2025 │ ← keping kalender, menempel
│ ● ○ ○                         │ ← tiga titik: memang tiga soal berurutan
├───────────────────────────────┤
│ ┌───────────────────────────┐ │
│ │▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔│ │ garis kepala utuh = sumber resmi
│ │ PENGUMUMAN BURSA · 30 JUN │ │ mesin tik
│ │ Bursa menghentikan …      │ │ baca
│ └───────────────────────────┘ │
│ ┌───────────────────────────┐ │
│ │╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌│ │ putus-putus = kami yang menghitung
│ │ DIHITUNG DARI …           │ │
│ └───────────────────────────┘ │
│ istilah · istilah             │ kecil, redup
│                               │
│ (A)  ╭─────────────────────╮  │
│      │ "Naik 22 kali tuh … │  │ gelembung obrolan
│      ╰─────────────────────╯  │
│ Dari kartu di atas, mana …?   │
│ ┌───────────────────────────┐ │
│ │ a  Betul, …               │ │ baris opsi selebar layar, ≥ 56 px
│ └───────────────────────────┘ │
│ …                             │
├───────────────────────────────┤
│ [      Kunci jawaban        ] │ ← menempel di bawah
└───────────────────────────────┘
```

- Kartu: sudut 6 px, garis tepi 1 px `--tinta` 12 %, tanpa bayangan. Kartu bertumpuk dengan jarak 8 px — tumpukan kertas, bukan galeri.
- Sesudah jawaban dikunci, di bawah opsi muncul **cap**: bingkai persegi panjang bersudut tumpul, miring −3°, huruf mesin tik: `COCOK DENGAN KARTU` atau `BELUM COCOK DENGAN KARTU`, lalu teks kunci. Kartu yang menentukan diberi garis tepi `--stempel` 2 px supaya mata kembali ke sumbernya. Cap hanya muncul di sini.
- Panel sumber: lembar bawah di < 640 px; memuat klaim formal, hitungan (untuk kartu "Dihitung dari…"), endpoint atau berkas asal, dan tanggal tersedia.
- Target sentuh ≥ 44 px; fokus papan ketik terlihat (garis `--stempel` 2 px, jarak 2 px).

## Kata-kata di antarmuka

Satu nama untuk satu tindakan, dari awal sampai akhir: **Mulai kasus** → **Kunci jawaban** → **Lanjut ke soal 2** / **Lanjut ke soal 3** → **Lihat yang terjadi sesudahnya** → **Selesai** · **Mau coba kasus lain**. Huruf kalimat, tanpa tanda seru. Umpan balik berbicara tentang kartu, bukan tentang orangnya: "cocok dengan kartu", bukan "kamu hebat".

## Yang sengaja tidak ada

Gradasi; bayangan berlapis; efek kaca; emoji sebagai ikon; ilustrasi stok; grafik harga (produk ini bukan tentang menebak harga); angka skor, poin, lencana, papan peringkat; animasi selain yang disebut di atas; huruf serif; latar krem; hitam pekat dengan aksen neon.
