# Arah desain pemain kasus — versi 3

Dokumen ini mengikat, **bersama layar contoh `docs/contoh/layar-soal.html`**. Kalau kata-kata di sini dan contoh itu berbeda, **contoh yang menang**: pemilik menyetujuinya dengan matanya di ponsel (21 Sep 2026) sesudah menolak tiga versi yang ditafsirkan dari dokumen kata-kata. Yang tidak disebut di sini dan tidak ada di contoh tidak ditambahkan.

## Subjek, pembaca, tugas halaman

- **Subjek:** satu hari yang dibekukan di Bursa Efek Indonesia. Seseorang di grup obrolan memberi kabar; pemain memeriksanya ke dokumen resmi. *Orang kasih kabar, kita verify.*
- **Pembaca:** orang Indonesia usia 20-an yang belum pernah membeli saham, membuka tautan dari story Instagram, di ponsel Android, satu tangan, malas berhitung, tidak membaca petunjuk.
- **Tugas tiap layar soal:** pesan teman terbaca lebih dulu, dokumen terbaca sebagai bukti (bukan sebagai pilihan), dan jalan ke jawaban selalu terlihat.
- **Ukuran acuan:** 360 × 640 (area terlihat ponsel dengan bilah browser) dan 375 × 812. Satu kolom, maksimum 560 px di layar lebar; keping kalender sejajar kolom itu.

## Dua bahan, dua suara — kertas bersudut, obrolan membulat

1. **Lembar dokumen** — suara resmi dan suara hitungan kami. Potongan kertas: latar `--lembar`, garis tepi tipis, **sudut 2 px**, tanpa bayangan. Garis kepala **utuh** 2 px `--stempel` untuk sumber resmi; **putus-putus** untuk yang kami hitung, dan lembar putus-putus wajib berkepala "Dihitung dari …". Kepala lembar ditulis biasa (peran *meta*), bukan kapital. Angka penting di badan lembar **tebal dan berwarna `--stempel`** — hanya di lembar.
2. **Pesan teman** — suara kabar. Satu-satunya bentuk membulat di layar: nama pengirim berwarna di atas, gelembung `--obrolan` selebar paling banyak 86 %, sudut 4/16/16/16, isi dengan peran *isi*, jam kecil di kanan bawah. Tidak meniru merek aplikasi pesan mana pun: tanpa hijau khas, tanpa centang, tanpa wallpaper.

Baris istilah, opsi, dan tombol ikut keluarga kertas: sudut 2–3 px. Lingkaran hanya untuk huruf opsi dan titik kemajuan.

Apa pun yang merupakan suara *kami* di luar kartu (temuan jejak verifikasi, pesan penutup, catatan) ditulis langsung di atas kertas dengan garis kiri tipis, bukan sebagai lembar.

## Tanda tangan: kalender sobek

Tidak berubah dari versi 2 dan sudah terbukti di ponsel pemilik: halaman kalender besar bergerigi di layar pertama; keping bergerigi yang menempel di layar soal ("HARI INI · RABU 8 OKT 2025", nama hari berwarna `--merah-kalender`); sobekan 700 ms di layar pembukaan yang mulai 250 ms sesudah layar tampil; kalender "Kamu kembali ke hari ini" di layar terima kasih; pergantian langsung untuk `prefers-reduced-motion`. **Keping kalender adalah satu-satunya tulisan kapital ber-spasi di layar soal sebelum dikunci**; sesudah dikunci ia ditemani cap umpan balik, dan hanya itu.

## Empat peran teks — tidak ada yang kelima

| peran | nilai | dipakai untuk |
|---|---|---|
| **judul** | 600, 20 px / 1,3 | satu judul per layar: pertanyaan, "Waktu berjalan lagi", judul layar akhir |
| **isi** | 400, 17 px / 1,45 | pesan teman, kalimat lembar, teks kunci, garis waktu |
| **meta** | 400, 14 px / 1,35, `--tinta-redup` (≥ 4,5:1) | kepala lembar, pengantar kartu, petunjuk, jam, keterangan |
| **aksi** | 500, 16 px / 1,4 | opsi, kaki lembar, baris istilah, tautan tindakan; tombol utama 600, 17 px |

Ditambah dua pemakaian khusus kalender: angka tanggal 72 px dan keping 12 px mesin tik. Skala ukuran yang sah: **12 · 14 · 16 · 17 · 20 · 28 · 72**. Satu teknik penekanan per elemen: tebal **atau** warna **atau** ukuran — kecuali angka di lembar (tebal + `--stempel`), keputusan pemilik. Tidak ada tebal, warna, atau tautan di dalam pesan teman dan opsi.

Huruf: tumpukan sistem untuk membaca; grotesk rapat hanya untuk kalender dan judul layar pertama; mesin tik hanya untuk keping kalender dan rincian teknis.

## Warna

Token versi 2 tetap (`--kertas`, `--lembar`, `--tinta`, `--tinta-redup`, `--stempel`, `--merah-kalender`, `--obrolan`, `--cocok` `#177052`, `--belum-cocok`), ditambah `--nama` (`#1F6B45` terang, `#7FD6A6` gelap) untuk nama pengirim dan `--garis-kontrol` = `--tinta` 50 % (≥ 3:1) untuk tepi opsi dan kotak teks. Merah hanya di kalender. Setiap pasangan teks/latar ≥ 4,5:1, dihitung. Cadangan `rgba()` sebelum `color-mix()`.

## Afordans — tidak ada yang diam-diam bisa diketuk

- **Satu pintu per lembar, di kakinya:** baris setinggi ≥ 44 px, "Lihat sumbernya ›" atau "Lihat cara menghitungnya ›", berwarna `--stempel`, panah berputar saat terbuka. Isinya **terbuka di tempat**, di dalam lembar itu. Tidak ada laci, dialog, atau lembar bawah.
- **Baris istilah:** "Arti istilah: lot · tanggal ex ›" — berbingkai, kata bergaris bawah, panah; artinya terbuka di bawahnya.
- **Opsi:** berbentuk tombol selebar kolom, ≥ 56 px, tepi `--garis-kontrol`; terpilih = tepi 2 px `--stempel` dan huruf opsi terisi.
- **Bilah bawah selalu membawa satu tindakan yang masuk akal:** opsi belum terlihat → tombol garis tepi "↓ Jawab di bawah"; opsi terlihat dan belum memilih → bilah tidak ada; sudah memilih → "Kunci jawaban"; sesudah dikunci → "Lanjut ke soal n" / "Lihat yang terjadi sesudahnya". Tombol utama tidak pernah tampil mati.
- Yang bukan kontrol tidak boleh tampak seperti kontrol: tidak ada panah, garis bawah, atau warna tautan pada benda yang diam.
- Umpan tekan (`:active`) pada semua kontrol; fokus papan ketik 2 px `--stempel`.

## Urutan layar soal

Keping kalender → (soal 1 saja: satu kalimat petunjuk) → pesan teman → "Cek omongan {nama} ke {n} dokumen ini:" → lembar-lembar → baris istilah → judul pertanyaan → opsi → "↑ Kembali ke dokumen" (mendarat di kalimat pengantar, tidak tertutup keping). Kaki halaman tiga kalimat hanya di layar pertama dan layar akhir.

## Sesudah dikunci

Cap miring "COCOK DENGAN KARTU" / "BELUM COCOK DENGAN KARTU" tetap seperti versi 2: cap karet memang berhuruf kapital, dan tinta stempel adalah bahan palet ini. Karena itu tulisan kapital ber-spasi yang sah di seluruh aplikasi tepat **dua**: keping kalender dan cap umpan balik. Opsi pemain berlabel "Pilihanmu"; opsi benar "✓ yang cocok dengan kartu"; salinan ringkas kartu penentu (bahan lembar) tepat di atas teks kunci.

## Kata-kata

**Mulai kasus** → **↓ Jawab di bawah** → **Kunci jawaban** → **Lanjut ke soal 2 / 3** → **Lihat yang terjadi sesudahnya** → **Langsung ke ringkasan ↓** → **Lanjut: tiga pertanyaan singkat** → **Selesai** · **Mau coba kasus lain**. Di lembar: **Lihat sumbernya**, **Lihat cara menghitungnya**; di soal: **Arti istilah**, **↑ Kembali ke dokumen**. Huruf kalimat, tanpa tanda seru. Umpan balik berbicara tentang kartu, bukan orangnya. Kosakata pabrik hanya di dalam "Rincian teknis".

## Yang sengaja tidak ada

Label kapital ber-spasi selain keping kalender dan cap umpan balik; peran teks kelima; sudut membulat besar pada kertas; laci/dialog sumber; tombol utama yang tampil mati; inisial huruf di gelembung; angka tebal atau berwarna di pesan dan opsi; tiga aturan di layar pertama; gradasi; bayangan; efek kaca; emoji sebagai ikon; grafik harga; skor, poin, lencana, papan peringkat; animasi selain sobekan kalender dan transisi 120–160 ms; huruf serif; latar krem; hitam pekat beraksen neon; strip warna di tepi kiri kartu; kartu di dalam kartu.

## Sebelum sebuah layar dianggap selesai

1. Dilihat di 360 × 640, terang dan gelap, mode dev dan build. 2. Uji sipit: kalau dikaburkan, masih ada satu bentuk yang dominan? 3. Hitung gaya teks yang terlihat: ≤ 4 (+ keping). 4. Setiap benda yang bisa diketuk punya isyarat; setiap benda berisyarat memang bisa diketuk. 5. `npm run periksa:desain` keluar 0. 6. Nilai terhitung peran teks dan bahan sama dengan layar contoh.
