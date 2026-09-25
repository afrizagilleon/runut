# Arah desain pemain kasus — versi 3

Dokumen ini mengikat, **bersama layar contoh `docs/contoh/layar-soal.html`**. Kalau kata-kata di sini dan contoh itu berbeda, **contoh yang menang**: pemilik menyetujuinya dengan matanya di ponsel (21 Sep 2026) sesudah menolak tiga versi yang ditafsirkan dari dokumen kata-kata. Yang tidak disebut di sini dan tidak ada di contoh tidak ditambahkan.

Patokan kedua `docs/contoh/layar-soal-v3d.html` (22 Sep 2026) mengikat balon melayang dan penanda "sesudahnya" di keping.

**Keputusan rupa M3.11 (24 Sep 2026) — diputuskan reviewer 24 Sep atas penilaian kritikus; pemilik menyerahkan penilaian rupa** (`.contracts/M-0311-kritik-hari-dua.md`, kritik `.contracts/lampiran/M-0310/kritik.md`): palet gelap "kertas di meja pada malam hari" dengan kalender tetap kertas (D-1), angka di kartu berwarna tinta (D-2), satu kalimat jejak verifikasi di bawah "Waktu berjalan lagi" (D-3), tepi lembar terang `--garis-tegas` (D-4), kaki kartu menjadi tombol (D-5), grotesk rapat untuk judul di bawah kalender besar (D-6). Kedua patokan ikut diperbarui untuk nilai gelap dan kaki kartu. D-2 dan D-4 **menimpa** patokan di tempat patokan belum diubah (`.lembar-badan b` ungu dan tepi lembar `--garis` di terang): untuk dua hal itu kalimat di dokumen ini yang berlaku. Patokan ketiga `docs/contoh/k06/` (varian A uji K-06, **disetujui pemilik pada 24 Sep 2026 dini hari**: *"rupanya oke, lanjut varian A ke produk"*) mengikat **isi dan urutan** layar pertama dan soal 1 — tidak mengikat keping; untuk keping, dua patokan pertama yang berlaku.

## Subjek, pembaca, tugas halaman

- **Subjek:** satu hari yang dibekukan di Bursa Efek Indonesia. Seseorang di grup obrolan memberi kabar; pemain memeriksanya ke dokumen resmi. *Orang kasih kabar, kita verify.*
- **Pembaca:** orang Indonesia usia 20-an yang belum pernah membeli saham, membuka tautan dari story Instagram, di ponsel Android, satu tangan, malas berhitung, tidak membaca petunjuk.
- **Tugas tiap layar soal:** pesan teman terbaca lebih dulu, dokumen terbaca sebagai bukti (bukan sebagai pilihan), dan jalan ke jawaban selalu terlihat.
- **Ukuran acuan:** 360 × 640 (area terlihat ponsel dengan bilah browser) dan 375 × 812. Satu kolom, maksimum 560 px di layar lebar; keping kalender sejajar kolom itu.

## Dua bahan, dua suara — kertas bersudut, obrolan membulat

1. **Lembar dokumen** — suara resmi dan suara hitungan kami. Potongan kertas: latar `--lembar`, garis tepi tipis (kiri, kanan, bawah `--garis-tegas` di mode terang, `--garis` di gelap — M3.11 D-4, diputuskan reviewer 24 Sep atas penilaian kritikus; pemilik menyerahkan penilaian rupa), **sudut 2 px**, tanpa bayangan. Garis kepala **utuh** 2 px `--stempel` untuk sumber resmi; **putus-putus** untuk yang kami hitung, dan lembar putus-putus wajib berkepala "Dihitung dari …"; garis kepala tidak ikut menjadi `--garis-tegas`. Kepala lembar ditulis biasa (peran *meta*), bukan kapital. Angka penting di badan lembar **tebal, berwarna tinta** — hanya di lembar (M3.11 D-2, diputuskan reviewer 24 Sep atas penilaian kritikus; pemilik menyerahkan penilaian rupa; sampai M3.10 tebal dan `--stempel`, rupa yang sama dengan tautan angka padahal ia tidak bisa diketuk). Ungu berarti: bisa diketuk, atau garis kepala sumber resmi.
2. **Pesan teman** — suara kabar. Satu-satunya bentuk membulat di layar: nama pengirim berwarna di atas, gelembung `--obrolan` selebar paling banyak 86 %, sudut 4/16/16/16, isi dengan peran *isi*, jam kecil di kanan bawah. Tidak meniru merek aplikasi pesan mana pun: tanpa hijau khas, tanpa centang, tanpa wallpaper.

Baris istilah, opsi, dan tombol ikut keluarga kertas: sudut 2–3 px. Lingkaran hanya untuk huruf opsi dan titik kemajuan.

Apa pun yang merupakan suara *kami* di luar kartu (temuan jejak verifikasi, kalimat jejak di bawah "Waktu berjalan lagi", pesan penutup, catatan) ditulis langsung di atas kertas dengan garis kiri tipis, bukan sebagai lembar.

## Tanda tangan: kalender sobek

Tidak berubah dari versi 2 dan sudah terbukti di ponsel pemilik: halaman kalender besar bergerigi di layar pertama; keping bergerigi yang menempel di layar soal ("HARI INI · RABU 8 OKT 2025", nama hari berwarna `--merah-kalender`) — **satu baris: tanggal di kiri, bulatan kemajuan di kanan** (seperti patokan; sejak M3.2 sampai M3.9 produk keliru menaruh bulatan di bawah tanggal), dan di kanan bulatan satu **penanda "sesudahnya"**: kotak 10 × 8 bertepi atas bergerigi, halaman kalender yang belum disobek, bernama "Lalu apa yang terjadi sesudahnya"; sobekan 700 ms di layar pembukaan yang mulai 250 ms sesudah layar tampil; kalender "Kamu kembali ke hari ini" di layar terima kasih; pergantian langsung untuk `prefers-reduced-motion`. **Di mode gelap halaman kalender tetap kertas terang** — `#E9EBEE`, angka `#14213D`, nama hari `#4A5670`, pita `#D7263D` bertulisan putih — di layar pertama, sobekan pembukaan, dan terima kasih; keping di layar soal tetap `--lembar` gelap, nama harinya `--merah-teks` (M3.11 D-1, diputuskan reviewer 24 Sep atas penilaian kritikus; pemilik menyerahkan penilaian rupa). Kertas tidak berubah warna di malam hari, hanya lampunya yang redup. **Keping kalender adalah satu-satunya tulisan kapital ber-spasi di layar soal sebelum dikunci**; sesudah dikunci ia ditemani cap umpan balik, dan hanya itu.

## Empat peran teks — tidak ada yang kelima

| peran | nilai | dipakai untuk |
|---|---|---|
| **judul** | 600, 20 px / 1,3 | satu judul per layar: pertanyaan, "Waktu berjalan lagi", judul layar akhir |
| **isi** | 400, 17 px / 1,45 | pesan teman, kalimat lembar, teks kunci, garis waktu |
| **meta** | 400, 14 px / 1,35, `--tinta-redup` (≥ 4,5:1) | kepala lembar, pengantar kartu, petunjuk, jam, keterangan |
| **aksi** | 500, 16 px / 1,4 | opsi, kaki lembar, baris istilah, tautan tindakan; tombol utama 600, 17 px |

Ditambah dua pemakaian khusus kalender: angka tanggal 72 px dan keping 12 px mesin tik. Layar yang tidak ada di patokan memakai peran yang sama (M3.10): di pembukaan tanggal garis waktu adalah *meta* berhuruf kalimat ("9 Okt 2025"), judul bagian adalah *judul*, subjudul dan penekanan adalah *isi* 600; di layar akhir judulnya *judul* 20 px dan pertanyaannya *isi* 600. Skala ukuran yang sah: **12 · 14 · 16 · 17 · 20 · 28 · 72**. Satu teknik penekanan per elemen: tebal **atau** warna **atau** ukuran — tanpa kecuali sejak M3.11 D-2 (angka di lembar kini tebal saja, berwarna tinta). Tidak ada tebal, warna, atau tautan di dalam pesan teman dan opsi.

Huruf: tumpukan sistem untuk membaca; grotesk rapat hanya untuk kalender dan **judul yang berdiri tepat di bawah kalender besar** — layar pertama, pembukaan ("Waktu berjalan lagi"), terima kasih ("Terima kasih.") — rata tengah, 28 px (M3.11 D-6, diputuskan reviewer 24 Sep atas penilaian kritikus; pemilik menyerahkan penilaian rupa; kritik K-5 opsi ii: judul itu satu-satunya huruf berkarakter di produk, dan layar pembukaan adalah bab penutup); mesin tik hanya untuk keping kalender dan rincian teknis. `npm run periksa:desain` menjaga daftarnya: sejak M3.10 tidak ada lagi pengecualian untuk layar pembukaan dan layar akhir; yang tersisa di luar kalender dan rincian teknis hanya cap umpan balik (warisan, rupanya belum diputuskan). Layar tanpa kalender besar (layar akhir, soal) memakai peran *judul* 20 px.

## Warna

Token versi 2 tetap (`--kertas`, `--lembar`, `--tinta`, `--tinta-redup`, `--stempel`, `--merah-kalender`, `--obrolan`, `--cocok` `#177052`, `--belum-cocok`), ditambah `--nama` (`#1F6B45` terang) untuk nama pengirim dan `--garis-kontrol` = `--tinta` 50 % (≥ 3:1) untuk tepi opsi dan kotak teks. Merah hanya di kalender. Setiap pasangan teks/latar ≥ 4,5:1, dihitung. Cadangan `rgba()` sebelum `color-mix()`.

**Mode gelap: "kertas di meja pada malam hari"** (M3.11 D-1, diputuskan reviewer 24 Sep atas penilaian kritikus; pemilik menyerahkan penilaian rupa; kritik K-1: latar biru-hitam `#0F1524` dengan tombol lavender bertulisan hitam adalah palet "tema gelap bawaan"). Meja arang netral-hangat, lembar sedikit lebih terang, tinta tetap tinta: `--kertas #191816` · `--lembar #23221F` · `--tinta #E6E3DC` · `--tinta-redup #ADA99F` · `--stempel #B1A8E6` (teks, tautan, garis kepala) · `--stempel-isi #6A5FD0` (hanya bidang tombol utama, bertulisan putih 5,05:1; di terang = `--stempel`) · `--merah-kalender #D7263D` · `--merah-teks #F0707A` (nama hari di keping; di terang = `--merah-kalender`) · `--obrolan #22332A` · `--nama #8FD1A8` · `--cocok #6FCB9F` · `--belum-cocok #E2A857` · `--di-atas-pekat #FFFFFF` (tulisan tombol dan pita, putih di kedua mode) · `--garis` 16 % · `--garis-tegas` 28 % · `--garis-kontrol` 50 % tinta. Baris bawaan `--stempel-isi` terang ditulis SEBELUM blok gelap (kekhususan sama; urutan terbalik = tombol lavender bertulisan putih 2,18:1). Tidak ada warna bernada biru-dongker (hue 215–235°, saturasi > 30 %) di `--kertas`/`--lembar` gelap. Ke-28 pasangan kontras terhitung dijaga e2e (E-41). `--tepi-lembar` = `--garis-tegas` di terang, `--garis` di gelap (D-4).

## Afordans — tidak ada yang diam-diam bisa diketuk

- **Satu pintu per lembar, di kakinya:** **tombol garis tepi** 1,5 px `--stempel`, sudut 3 px, di dalam lembar 12 px dari tepi kiri, kanan, dan bawah (selebar lembar − 24 px), ≥ 44 px, "Buka dokumennya ›" (lembar dokumen) atau "Lihat hitungannya ›" (lembar hitungan bergaris putus-putus), tulisan `--stempel` 500 14 px, panah "›" di kanan yang berputar 90° saat terbuka, `:active` berlatar `--garis` (M3.11 D-5, diputuskan reviewer 24 Sep atas penilaian kritikus; pemilik menyerahkan penilaian rupa; usulan uji duduk 22 Sep R-04: baris tulisan "Lihat sumbernya ›" tidak terbaca sebagai pintu — di soal 1 hanya 10/27 sesi membukanya; Chromium melukis tepi 1,5 px sebagai 1 px CSS, nilai yang ditulis tetap 1,5 px seperti "↓ Pilih jawaban"). Isinya **terbuka di tempat**, di dalam lembar itu. Tidak ada laci, dialog, atau lembar bawah.
- **Baris istilah:** "Arti istilah: lot · tanggal ex ›" — berbingkai, kata bergaris bawah, panah; artinya terbuka di bawahnya.
- **Opsi:** berbentuk tombol selebar kolom, ≥ 56 px, tepi `--garis-kontrol`; terpilih = tepi 2 px `--stempel` dan huruf opsi terisi.
- **Bilah bawah selalu membawa satu tindakan yang masuk akal:** opsi belum terlihat → tombol garis tepi "↓ Pilih jawaban"; opsi terlihat dan belum memilih → bilah tidak ada; sudah memilih → "Cek jawabanku"; sesudah dikunci → "Lanjut ke soal n" / "Lihat yang terjadi sesudahnya". Tombol utama tidak pernah tampil mati.
- **Tautan angka** (teks kunci, pembukaan): tebal 600, `--stempel`, garis bawah **utuh** 1,5 px berjarak 4 px; bidang sentuhnya ≥ 44 px lewat `::after`, bukan bantalan, jadi tanda baca menempel dan jarak baris tetap 1,45. Di teks kunci hanya tautan yang tebal.
- Yang bukan kontrol tidak boleh tampak seperti kontrol: tidak ada panah, garis bawah, atau warna tautan pada benda yang diam.
- Umpan tekan (`:active`) pada semua kontrol; fokus papan ketik 2 px `--stempel` (tombol utama: `--tinta`, karena bidangnya sendiri `--stempel`; M3.10).

## Urutan layar pertama

Varian A uji K-06 (M3.9, disetujui pemilik 24 Sep 2026 dini hari): halaman kalender besar → **judul** (`pembuka.judul`, grotesk rapat 28 px, satu-satunya judul layar ini) → **satu contoh gelembung** — nama pengirim dan isi pesan soal 1 (dibaca dari `soal[0].pesan`, tidak ditulis kedua kali), tanpa tanggal, tanpa jam, tidak bisa diketuk → **ajakan** (`pembuka.ajak`, peran *isi*) → bilah bawah "Mulai simulasi" + baris meta. "Kita mundur ke …" tidak ada lagi di layar ini; tanggalnya dibawa kalender dan kaki. Di 360 × 640 keempatnya terlihat tanpa menggulir. Kaki tiga kalimat selalu di bawah lipatan (layar ini setinggi jendela) dan bantalan bawahnya setinggi bilah terukur, supaya garisnya tidak mengintip di atas tombol dan kalimat terakhirnya bisa digulir ke atas bilah. Di layar ≥ 768 px (laptop) bilah layar ini ikut aliran tepat sesudah ajakan, bukan menempel di dasar jendela (M3.10).

## Urutan layar soal

Keping kalender → pesan teman → "Betul atau keliru? Cek ke {n} dokumen ini:" ({n} dieja: dua/tiga/empat; sama di semua soal) → lembar-lembar (di soal 1, **kartu penentu lebih dulu**) → baris istilah → judul pertanyaan → opsi → "↑ Kembali ke dokumen". Soal 1 adalah pemanasan: tanpa baris petunjuk (medan `petunjuk` tetap ada di skema dan tidak dirender bila kosong) dan tanpa istilah di DADA. Kaki halaman tiga kalimat hanya di layar pertama dan layar akhir.

## Sesudah dikunci

Cap miring "COCOK DENGAN KARTU" / "BELUM COCOK DENGAN KARTU" tetap seperti versi 2: cap karet memang berhuruf kapital, dan tinta stempel adalah bahan palet ini. Karena itu tulisan kapital ber-spasi yang sah di seluruh aplikasi tepat **dua**: keping kalender dan cap umpan balik. Opsi pemain berlabel "Pilihanmu"; opsi benar "✓ yang cocok dengan kartu"; salinan ringkas kartu penentu (bahan lembar) tepat di atas teks kunci.

## Kata-kata

**Mulai simulasi** → **↓ Pilih jawaban** (sejak M3.9; dulu "↓ Jawab di bawah") → **Cek jawabanku** → **Lanjut ke soal 2 / 3** → **Lihat yang terjadi sesudahnya** → **Langsung ke ringkasan ↓** → **Lanjut: tiga pertanyaan singkat** → **Selesai** · **Coba simulasi lain**. Di layar pertama: judul **Cek omongan saham di grup ke dokumen resminya.** dan ajakan **Betul atau keliru?** (keduanya dari berkas kasus). Di atas kartu: **Betul atau keliru? Cek ke {n} dokumen ini:**. Di lembar: **Buka dokumennya ›**, **Lihat hitungannya ›** (M3.11 D-5, diputuskan reviewer 24 Sep atas penilaian kritikus; pemilik menyerahkan penilaian rupa; dulu "Lihat sumbernya", "Lihat cara menghitungnya"); di soal: **Arti istilah**, **↑ Kembali ke dokumen**. Di pembukaan, tepat di bawah "Waktu berjalan lagi" (M3.11 D-3, diputuskan reviewer 24 Sep atas penilaian kritikus; pemilik menyerahkan penilaian rupa): **Sebelum jadi kartu, laporan di simulasi ini diperiksa {n} pemeriksaan otomatis; {m} angka dibuang.** (bila m = 0: **…; tidak ada angka yang dibuang.**) **Lihat pemeriksaannya ›** — n = aturan yang benar-benar **dijalankan** (bukan yang terdaftar; yang dilewati dieja di kaki lipatan "… tidak bisa dijalankan atas simulasi ini: 1 dari 10"; M3.11 amandemen A-1) dan m dari sumber yang sama dengan bagian "Jejak verifikasi" di dasar layar, tidak pernah diketik; tautannya menggulir ke bagian itu dan membuka lipatannya. Kata-kata varian A sudah diuji tebak buta (K-05/K-06); satu frasa yang diubah bisa membalik hasilnya, jadi ia tidak dirapikan atas selera. Huruf kalimat, tanpa tanda seru. Umpan balik berbicara tentang kartu, bukan orangnya. Kosakata pabrik hanya di dalam "Rincian teknis".

**Satuan permainan disebut "simulasi", bukan "kasus"** (M3.12, keputusan pemilik 25 Sep 2026: "kasus" menjurus ke kecelakaan, perbuatan keji, tindak kriminal — terasa berat; "simulasi" menurut KBBI adalah pelatihan yang meragakan sesuatu dalam bentuk tiruan yang mirip keadaan sesungguhnya — satu hari bursa nyata yang dibekukan). Tombol kunci **Cek jawabanku**, bukan "Kunci jawaban" ("kunci jawaban" di sekolah = lembar jawaban ujian). Lama → baru:

| Lama | Baru |
|---|---|
| Mulai kasus | Mulai simulasi |
| Kunci jawaban | Cek jawabanku |
| Mau coba kasus lain | Coba simulasi lain |
| Seberapa layak kasus ini kamu bagikan ke teman? | Seberapa layak simulasi ini kamu bagikan ke teman? |
| Kasus tadi terasa seperti… | Simulasi tadi terasa seperti… |
| Sebelum jadi kartu, laporan kasus ini diperiksa … | Sebelum jadi kartu, laporan di simulasi ini diperiksa … |
| Aturan yang tidak bisa dijalankan atas kasus ini: … | Aturan yang tidak bisa dijalankan atas simulasi ini: … |
| Kode saham disamarkan sampai kasus selesai. | Kode saham disamarkan sampai simulasi selesai. |
| (meta/og) Kasus nyata dari bursa. 3 soal, sekitar 5 menit, tanpa akun. | Simulasi dari kejadian nyata di bursa. 3 soal, sekitar 5 menit, tanpa akun. |

Isi berkas simulasi ikut (pembukaan dan penutup, lihat `docs/kasus-dada-v3.md` dan `docs/kasus-ultj-v1.md`); "Rantai laporan" menjadi "Laporan-laporan" (pemilik 22 Sep: "rantai" terasa seperti rantai komando), dan "folks" — satu-satunya kata Inggris — dibuang. Kata **soal** dan **omongan** tetap: pengganti yang pas belum ditemukan. Gerbangnya `web/src/kata-ringan.test.tsx`: setiap layar kedua simulasi dirender dan teks tampil serta `aria-label`/`title` tidak boleh memuat kata utuh "kasus". Nama berkas, `data-uid`, nama peristiwa (`minat_kasus_lain`), dan identifier kode tidak berubah — data lama dan baru tetap tersambung.

## Yang sengaja tidak ada

Label kapital ber-spasi selain keping kalender dan cap umpan balik; peran teks kelima; sudut membulat besar pada kertas; laci/dialog sumber; tombol utama yang tampil mati; inisial huruf di gelembung; angka tebal atau berwarna di pesan dan opsi; tiga aturan di layar pertama; gradasi; bayangan; efek kaca; emoji sebagai ikon; grafik harga; skor, poin, lencana, papan peringkat; animasi selain sobekan kalender dan transisi 120–160 ms; huruf serif; latar krem; hitam pekat beraksen neon; strip warna di tepi kiri kartu; kartu di dalam kartu.

## Sebelum sebuah layar dianggap selesai

1. Dilihat di 360 × 640, terang dan gelap, mode dev dan build. 2. Uji sipit: kalau dikaburkan, masih ada satu bentuk yang dominan? 3. Hitung gaya teks yang terlihat: ≤ 4 (+ keping). 4. Setiap benda yang bisa diketuk punya isyarat; setiap benda berisyarat memang bisa diketuk. 5. `npm run periksa:desain` keluar 0. 6. Nilai terhitung peran teks dan bahan sama dengan layar contoh.
