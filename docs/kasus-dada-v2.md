# Kasus DADA v2 — kartu fakta per soal, bahasa sehari-hari

Menggantikan bagian **Soal** di `docs/kasus-dada.md` untuk skema kasus versi 2. Fakta, pembukaan, temuan verifikasi, dan tiga kalimat tetap di dokumen lama **tetap berlaku**; yang berubah adalah cara fakta dihadapkan ke pemain dan isi soalnya.

Dua masukan pemilik yang melahirkan dokumen ini (21 Sep 2026):
1. Sepuluh fakta sekaligus lalu tiga soal "rasanya menguji kemampuan menghapal".
2. Draf v2 yang formal dan penuh hitungan "seperti soal anak kuliah jurusan ekonomi"; orang membuka kalkulator bahkan untuk hitungan sederhana, lalu berhenti.

## Aturan penulisan soal v2 (berlaku untuk semua kasus berikutnya)

1. Tiap soal membawa **2–4 kartu fakta**, tampil tepat di atas soal. Kartu yang tidak diperlukan dibuang.
2. **Pabrik yang berhitung, pemain yang membaca.** Tidak ada soal yang menuntut hitungan. Hasil hitung tampil sebagai kartu "Dihitung dari…", yaitu fakta turunan biasa dengan `turunan_dari`; yang penasaran bisa membuka hitungannya di panel sumber.
3. **Kartu memakai bahasa sehari-hari**: "pemilik terbesar", bukan "pemegang saham pengendali"; "369,5 juta lembar", bukan "369.500.000"; satu atau dua kalimat. Istilah resmi dan klaim formal tetap ada — di panel sumber.
4. **Bentuk soal: omongan teman yang dicek ke kartu.** Batang soal memuat satu kalimat yang biasa terdengar di grup obrolan; pemain memilih mana yang paling tepat menurut kartu. Dalam satu kasus **minimal satu omongan teman harus betul**, supaya "jawab saja Keliru" tidak menjadi strategi.
5. **Opsi seimbang**: dua "Betul…" dan dua "Keliru…", hampir sama panjang, sama spesifik. Tidak ada opsi kabur ("tidak bisa dinilai") dan tidak ada opsi konyol.
6. **Soal harus mustahil dijawab benar tanpa membaca kartu**, dan batang/opsi sebuah soal tidak boleh memuat fakta yang dibutuhkan soal sesudahnya.
7. Tiap soal boleh membawa paling banyak dua **istilah** berpenjelasan satu baris, tampil di bawah kartu.
8. **Jangkar waktu.** Pemain hidup di 2026, kasusnya di 2025; tanpa pengingat, ia bingung "sekarang" itu kapan. Setiap batang soal dibuka dengan "Hari ini <tanggal T>." dan setiap layar dari pembuka sampai soal terakhir menampilkan penanda tetap "Hari ini: <hari>, <tanggal T>". Layar pembukaan mengganti penanda itu dengan "Waktu berjalan lagi".
9. Teks kunci hanya memakai fakta ≤ T, menunjuk kartu yang menentukan, dan menjelaskan satu salah-kaprah. Nada ke tugas, bukan ke orang: tidak ada "hebat" atau "sayang sekali".

## Layar pertama

**Penanda waktu (tampil besar di atas hook):** Kita mundur ke **Rabu, 8 Oktober 2025**.

**Hook:** Dalam 47 hari bursa, harga saham sebuah perusahaan properti naik dari Rp8 ke Rp178. Grup obrolanmu ramai. Siapa yang omongannya cocok dengan data resmi?

**Aturan main (tiga baris):**
- Waktu dibekukan di 8 Oktober 2025. Kamu hanya melihat apa yang publik tahu hari itu.
- Cek omongan teman ke kartu fakta di atas tiap soal. Ini bukan tebak harga.
- Sesudah tiga soal, kamu melihat apa yang terjadi berikutnya.

Tombol: **Mulai kasus**. Tidak ada pilihan persona, tingkat, atau login. Tiga kalimat tetap tampil di kaki halaman.

---

## Soal 1 — apa kata bursa

**Yang dilihat pemain:**

> **Dihitung dari data harga · 1 Agu – 8 Okt 2025**
> Harga saham Perusahaan D naik dari **Rp8** ke **Rp178** dalam 47 hari bursa — sekarang **22 kali** harga awalnya.
>
> **Pengumuman bursa · 30 Jun 2025**
> Bursa menghentikan sementara jual-beli saham ini karena perusahaan **belum menyerahkan laporan keuangan tahunan yang sudah diaudit**. Per 1 Agustus sahamnya sudah diperdagangkan lagi.
>
> *Istilah — Penghentian sementara (suspensi):* bursa menyetop jual-beli sebuah saham untuk sementara; pemiliknya tetap punya sahamnya, tetapi tidak bisa menjual atau membeli. · *Hari bursa:* hari ketika bursa buka, yaitu Senin–Jumat di luar hari libur.
>
> Hari ini 8 Oktober 2025. Temanmu bilang: *"Naik 22 kali tuh pasti karena mau dibeli investor asing. Bursa juga udah kasih pengumuman soal saham ini."* Dari kartu di atas, mana yang paling tepat?
>
> a. Betul, pengumuman bursa itu memang soal rencana pembelian oleh investor asing.
> b. Keliru, pengumuman bursa itu soal laporan keuangan yang belum diserahkan.
> c. Betul, pengumuman bursa itu menjelaskan kenapa harganya bisa naik 22 kali.
> d. Keliru, pengumuman bursa itu soal harga yang naik terlalu cepat.

**Kartu:** `kelipatan-2025-08-01-2025-10-08` · `susp-2025-06-30` — **Kartu penentu:** `susp-2025-06-30` — **Jawaban:** b

**Teks kunci:** Bursa memang pernah mengumumkan sesuatu, tetapi isinya lain: jual-beli disetop karena laporan keuangan tahunan belum diserahkan. Tidak ada kata "investor asing" atau "akuisisi" di kartu mana pun. Kartu harga hanya memberi tahu *bahwa* harganya naik 22 kali, bukan *kenapa*. Salah-kaprah yang umum: menganggap harga yang naik sebagai semacam pengumuman, lalu mencocokkannya dengan kabar yang sedang ramai.

**Catatan untuk eksekutor:** data tidak memuat tanggal pencabutan penghentian 30 Juni. Kalimat "tanggal pencabutannya tidak ada di data" wajib tampil di panel sumber kartu ini; "Per 1 Agustus sudah diperdagangkan lagi" bersandar pada adanya harga penutupan 1 Agustus 2025 (`harga-2025-08-01`), ditautkan dari teks awam kartu. "22 kali" adalah pembulatan awam dari 22,25; nilai persisnya tampil di panel sumber.

## Soal 2 — dividen untuk pemilik kecil

**Yang dilihat pemain:**

> **Pengumuman dividen · tanggal ex 16 Sep 2025**
> Perusahaan D membagikan dividen tunai **Rp0,14 per lembar** (sebelum pajak).
>
> **Dihitung dari kartu di atas dan harga 8 Okt 2025**
> Untuk **10 lot** (1.000 lembar): dividennya **Rp140**, sedangkan nilai 10 lot itu di harga Rp178 adalah **Rp178.000**.
>
> *Istilah — Lot:* satuan jual-beli saham; 1 lot = 100 lembar. · *Tanggal ex:* mulai tanggal ini pembeli baru tidak lagi kebagian dividen tersebut; yang sudah pegang sebelumnya tetap kebagian.
>
> Hari ini 8 Oktober 2025. Temanmu pegang 10 lot sejak Juli. Ia bilang: *"Dividennya receh banget, buat bayar parkir motor aja kurang. Harga setinggi ini jelas bukan karena dividennya."* Dari kartu di atas, mana yang paling tepat?
>
> a. Betul, ia kebagian dividen dan jumlahnya cuma Rp140.
> b. Betul, malah ia tidak kebagian karena tanggal ex-nya.
> c. Keliru, ia kebagian Rp14.000 untuk 10 lot miliknya.
> d. Keliru, Rp140 itu sudah besar dibanding nilai sahamnya.

**Kartu:** `div-2025-09-16` · `andai-10-lot-dividen` (turunan baru) — **Kartu penentu:** `andai-10-lot-dividen` — **Jawaban:** a

**Teks kunci:** Kartu kedua sudah menghitungnya: 1.000 lembar × Rp0,14 = Rp140, untuk saham yang nilainya Rp178.000 — kurang dari seperseribu nilainya. Temanmu betul, dan karena ia sudah pegang sejak sebelum tanggal ex, ia memang kebagian. Dividen adalah bagian laba yang benar-benar sampai ke pemilik saham; angka ini memperlihatkan bahwa harga Rp178 tidak ditopang pembagian laba. Salah-kaprah yang umum: menghitung dividen per lot, padahal dividen dihitung per lembar; dan mengira tanggal ex menggugurkan hak orang yang sudah lama pegang, padahal yang tidak kebagian hanya pembeli sesudah tanggal itu.

**Catatan untuk eksekutor:** satu fakta membawa satu nilai, jadi kartu kedua adalah fakta `andai-10-lot-dividen` (Rp140; turunan dari `div-2025-09-16`) yang teks awamnya menautkan "Rp178.000" ke fakta turunan kedua, `andai-10-lot-nilai` (turunan dari `harga-2025-10-08`). Pengandaian 10 lot ditulis di `keterangan` keduanya. Fakta yang hanya ditautkan dari teks awam kartu tidak wajib masuk `fakta_terlihat`, tetapi wajib TERVERIFIKASI dan tersedia ≤ T. Hitung ulang 1.000 × 0,14 dan 1.000 × 178. "Kurang dari seperseribu" = 140 ÷ 178.000 = 0,00079.

## Soal 3 — siapa yang menjual

**Hanya laporan yang lolos pemeriksaan yang boleh menjadi kartu.** Dua laporan dari periode ini tidak lolos dan karena itu **tidak** dipakai: rangkaian empat laporan 25 Agustus kehilangan 10.000.000 lembar di antara dua laporannya (temuan R2; dua dari empat laporannya berstatus KONFLIK), dan laporan 29 September menyebut harga Rp165 pada hari ketika harga pasar hanya bergerak Rp135–Rp163 (temuan R6). Tiga laporan di bawah ini berstatus TERVERIFIKASI dan saldo lembarnya bersambung persis: 4.662.137.600 → 4.592.137.600 → 4.412.637.600 → 4.362.637.600.

**Yang dilihat pemain:**

> **Laporan pemegang saham · terbit 25 Agu 2025**
> Pemilik terbesar Perusahaan D menjual **70 juta lembar** di harga **Rp13**. Transaksinya 12 Agustus.
>
> **Laporan pemegang saham · terbit 25 Agu 2025**
> Ia menjual lagi **179,5 juta lembar** di harga **Rp14**. Transaksinya 13 Agustus.
>
> **Laporan pemegang saham · terbit 1 Sep 2025**
> Ia menjual lagi **50 juta lembar** di harga **Rp15**. Transaksinya 14 Agustus.
>
> **Dihitung dari tiga laporan di atas**
> Tiga penjualan itu berjumlah **299,5 juta lembar**, semuanya di harga Rp15 ke bawah.
>
> *Istilah — Pemilik terbesar (pemegang saham pengendali):* pihak dengan porsi saham paling besar, yang menentukan arah perusahaan. Setiap jual-belinya wajib dilaporkan dan diumumkan ke publik.
>
> Hari ini 8 Oktober 2025, harganya Rp178. Temanmu bilang: *"Pemilik terbesarnya tenang-tenang aja tuh, nggak kedengeran jual. Berarti dia yakin harganya masih bakal naik."* Dari kartu di atas, mana yang paling tepat?
>
> a. Betul, laporannya menunjukkan ia membeli lagi di harga belasan rupiah.
> b. Betul, laporannya menunjukkan ia membeli lagi di harga ratusan rupiah.
> c. Keliru, laporannya menunjukkan ia menjual banyak di harga belasan rupiah.
> d. Keliru, laporannya menunjukkan ia menjual banyak di harga ratusan rupiah.

**Kartu:** `fil-2025-08-25-03` · `fil-2025-08-25-04` · `fil-2025-09-01-01` · `jumlah-jual-terverifikasi` (turunan baru) — **Kartu penentu:** `jumlah-jual-terverifikasi` — **Jawaban:** c

> Kartu ketiga memakai laporan aslinya (`fil-2025-09-01-01`, sumber API), bukan fakta gabungan `fil-2025-09-01` (turunan): hanya laporan asli yang boleh bergaris kepala utuh.

**Teks kunci:** Ketiga kartu laporan itu penjualan, bukan pembelian: 70 juta, 179,5 juta, dan 50 juta lembar — 299,5 juta lembar, semuanya di Rp13–Rp15, jauh di bawah harga hari ini. Perhatikan juga tanggalnya: transaksinya 12–14 Agustus, tetapi publik baru bisa membacanya pada 25 Agustus dan 1 September, ketika laporannya terbit. Pemilik besar berhak menjual; yang perlu dibaca calon pembeli adalah siapa yang ada di sisi jual. Salah-kaprah yang umum: menganggap "nggak kedengeran jual" sama dengan "tidak menjual".

**Catatan untuk eksekutor:** `jumlah-jual-terverifikasi` = 70.000.000 + 179.500.000 + 50.000.000 = 299.500.000 lembar; `turunan_dari` ketiga laporan itu, sehingga statusnya TERVERIFIKASI. Persentase kepemilikan tidak tampil di kartu. "Rp178" di batang soal menunjuk `harga-2025-10-08`.

---

## Layar pembukaan

**Penanda waktu berganti:** "Waktu berjalan lagi — inilah yang terjadi sesudah 8 Oktober 2025."

Isi pembukaan lama dipertahankan (suspensi 9 Okt, 10 Okt buka Rp177 → tertinggi Rp240 → tutup Rp152, 22 Okt Rp50, laporan penjualan Rp220–232 dan Rp51–56, RUPS 16 Jul 2026 gagal kuorum 22,32%), ditulis dengan gaya bahasa yang sama dengan kartu, ditambah satu bagian sesudahnya:

**Apa yang bisa dan tidak bisa dibaca pada 8 Oktober**
- Bisa dibaca: pemilik terbesarnya sudah menjual ratusan juta lembar di harga belasan rupiah; dividennya sangat kecil dibanding harga; satu-satunya pengumuman bursa berbicara tentang laporan keuangan yang terlambat, bukan akuisisi.
- Tidak bisa dibaca: kapan harga berbalik, atau sampai berapa. Tidak satu pun kartu memuat itu, dan produk ini tidak pernah memintamu menebaknya.
- Yang kami singkirkan dari kartu: dua laporan resmi dari periode yang sama tidak lolos pemeriksaan kami — satu rangkaian laporan kehilangan 10 juta lembar di tengah jalan, dan satu laporan menyebut harga Rp165 pada hari ketika harga pasar hanya bergerak Rp135–Rp163. Dokumen resmi pun perlu dihitung ulang; rinciannya ada di jejak verifikasi.
- Nama aslinya: PT Diamond Citra Propertindo Tbk (DADA).

## Layar akhir — tiga ketukan dan satu kotak

Judul: **Tiga pertanyaan singkat**. Anak judul: "Semuanya boleh dilewati. Di bawahnya ada kotak kalau kamu mau menulis." Tombol dari layar pembukaan ke sini berbunyi **Lanjut: tiga pertanyaan singkat**.

1. "Seberapa layak kasus ini kamu bagikan ke teman?" — 1 sampai 5, dengan jangkar di kedua ujung: **1 = tidak akan kubagikan · 5 = langsung kubagikan**.
2. "Kasus tadi terasa seperti…" — ujian hafalan · membaca data · menebak harga.
3. "Kamu paling sering menjawab dari…" — kartu fakta · ingatan atau pengetahuan sendiri · tebakan.
4. Kotak teks opsional: "Ada yang membingungkan atau ingin kamu sampaikan?" (boleh kosong)

Semua opsional; tombol **Selesai** selalu aktif. Di bawahnya satu tombol lagi: **"Mau coba kasus lain"** — untuk alpha ia menampilkan pesan di bawah ini, dan ketukannya dicatat sebagai ukuran minat.

> **Tidak semua saham seperti ini.** Kasus berikutnya adalah perusahaan yang sehat — sedang kami siapkan. Selamat belajar membaca data, folks.

(Sengaja tanpa "happy trading/investing": produk ini tidak pernah mengajak bertransaksi, INV-5.)

## Riwayat uji

- **Review + kritik desain (21 Sep malam).** Kartu harga soal 1 memang hasil hitungan kami, jadi kepalanya kini berbunyi "Dihitung dari data harga …"; kartu ketiga soal 3 memakai laporan asli, bukan fakta gabungan; tiap soal punya satu kartu penentu yang disalin ringkas di atas teks kunci.

- **Temuan eksekutor (21 Sep sore) — kesalahan penulis kontrak.** Soal 3 versi sebelumnya memakai `fil-2025-08-25` dan `fil-2025-09-29` sebagai kartu, padahal keduanya berstatus KONFLIK di pabrik kita sendiri; produk akan menyodorkan "Rp165" sebagai fakta sementara jejak verifikasinya menyebut harga itu janggal. Soal 3 ditulis ulang memakai tiga laporan TERVERIFIKASI; dua laporan yang disingkirkan kini muncul di layar pembukaan sebagai pelajaran. Bentuk soal 3 yang baru **belum** diuji ke manusia maupun model.

- **Uji model tanpa kartu / dengan kartu (21 Sep, tiga putaran atas draf formal).** Draf pertama gagal telak (soal 1 tertebak benar dengan keyakinan 88% dari pola opsi dan bocoran antar-soal). Pelajaran yang dibawa ke bentuk sekarang: opsi seimbang, tanpa bocoran antar-soal, istilah dijelaskan, kartu suspensi harus menjelaskan bahwa saham sudah diperdagangkan lagi, pengecoh lahir dari salah baca nyata. Batasnya: satu model, satu sampel; berguna menemukan bocoran, bukan mengukur kesulitan — dan **sama sekali tidak mengukur apakah pemula mau mengerjakannya**, yang justru menjadi cacat terbesar draf itu.
- **Uji pemilik atas bentuk sekarang (21 Sep):** soal 3, lalu soal 1 dan 2, semuanya dijawab benar dalam sekali lihat, tanpa mengandalkan ingatan penjelasan malam sebelumnya. Temuan pemilik: "sekarang tahun 2026 — saya sempat bingung"; lahir aturan 8 (jangkar waktu).
- **Uji model berperan pemula atas bentuk sekarang, dengan kartu (21 Sep):** ketiganya benar tanpa ambiguitas, kira-kira 25 + 30 + 45 detik (draf formal: 3,5–4 menit). Dua masukan diterapkan: opsi soal 2 yang "cuma beda jumlah nol, menguji ketelitian mata" diganti sehingga tanggal ex dan perbandingan nilai ikut menentukan; "hari bursa" diberi penjelasan. Satu masukan **tidak** diterapkan: soal 3 disebut terasa padat angka — bentuk itu sudah dijawab benar dalam sekali lihat oleh manusia sungguhan, dan penilaian manusia mengalahkan persona model. Dipantau lewat durasi soal 3 di data alpha.
- **Uji model tanpa kartu atas bentuk sekarang (21 Sep):** penebak mahir menjawab **3 dari 3 benar** (keyakinan 70%, 55%, 78%) — bentuk obrolan lebih mudah ditebak daripada draf formal. Tiga bocoran yang bisa dijelaskan, semuanya diperbaiki: istilah "suspensi" mematikan opsi "bursa belum pernah mengumumkan apa pun" (opsi diganti alasan tandingan yang masuk akal); opsi soal 2 yang angkanya tidak membalik vonis (opsi sudah diganti); opsi soal 3 yang labelnya bertabrakan dengan isinya ("Betul, ia malah menambah"). **Bentuk sesudah perbaikan tidak diuji ulang ke model.** Keputusan sadar: penebak mahir bukan pengguna kita; yang dijaga adalah tidak adanya bocoran murahan, dan ukuran sebenarnya adalah perilaku manusia di alpha — kartu dibuka sebelum menjawab, dan jawaban "menjawab dari kartu" di layar akhir.
