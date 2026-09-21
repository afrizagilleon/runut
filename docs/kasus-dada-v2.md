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

> **Data harga · 1 Agu – 8 Okt 2025**
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

**Kartu:** `kelipatan-2025-08-01-2025-10-08` · `susp-2025-06-30` — **Jawaban:** b

**Teks kunci:** Bursa memang pernah mengumumkan sesuatu, tetapi isinya lain: jual-beli disetop karena laporan keuangan tahunan belum diserahkan. Tidak ada kata "investor asing" atau "akuisisi" di kartu mana pun. Kartu harga hanya memberi tahu *bahwa* harganya naik 22 kali, bukan *kenapa*. Salah-kaprah yang umum: menganggap harga yang naik sebagai semacam pengumuman, lalu mencocokkannya dengan kabar yang sedang ramai.

**Catatan untuk eksekutor:** data tidak memuat tanggal pencabutan penghentian 30 Juni. Kalimat "tanggal pencabutannya tidak ada di data" wajib tampil di panel sumber kartu ini; "Per 1 Agustus sudah diperdagangkan lagi" bersandar pada volume 1 Agustus 2025 = 35.713.500 lembar di deret harian.

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

**Kartu:** `div-2025-09-16` · `andai-10-lot` (turunan baru) — **Jawaban:** a

**Teks kunci:** Kartu kedua sudah menghitungnya: 1.000 lembar × Rp0,14 = Rp140, untuk saham yang nilainya Rp178.000 — kurang dari seperseribu nilainya. Temanmu betul, dan karena ia sudah pegang sejak sebelum tanggal ex, ia memang kebagian. Dividen adalah bagian laba yang benar-benar sampai ke pemilik saham; angka ini memperlihatkan bahwa harga Rp178 tidak ditopang pembagian laba. Salah-kaprah yang umum: menghitung dividen per lot, padahal dividen dihitung per lembar; dan mengira tanggal ex menggugurkan hak orang yang sudah lama pegang, padahal yang tidak kebagian hanya pembeli sesudah tanggal itu.

**Catatan untuk eksekutor:** `andai-10-lot` adalah fakta turunan dari `div-2025-09-16` dan `harga-2025-10-08`, dengan pengandaian 10 lot ditulis di `keterangan`. Hitung ulang 1.000 × 0,14 dan 1.000 × 178. "Kurang dari seperseribu" = 140 ÷ 178.000 = 0,00079.

## Soal 3 — siapa yang menjual

**Yang dilihat pemain:**

> **Laporan pemegang saham · terbit 25 Agu 2025**
> Pemilik terbesar Perusahaan D menjual **369,5 juta lembar** di harga **Rp12–14**.
>
> **Laporan pemegang saham · terbit 1 Sep 2025**
> Ia menjual lagi **50 juta lembar** di harga **Rp15**.
>
> **Laporan pemegang saham · terbit 29 Sep 2025**
> Ia menjual lagi **10 juta lembar** di harga **Rp165**.
>
> **Dihitung dari tiga laporan di atas**
> Dari setiap 100 lembar yang ia jual, **98 lembar** terjual di harga Rp15 ke bawah.
>
> *Istilah — Pemilik terbesar (pemegang saham pengendali):* pihak dengan porsi saham paling besar, yang menentukan arah perusahaan. Setiap jual-belinya wajib dilaporkan dan diumumkan ke publik.
>
> Hari ini 8 Oktober 2025, harganya Rp178. Temanmu bilang: *"Pemilik terbesarnya aja baru jual di Rp165 — berarti harga segitu masih wajar."* Dari kartu di atas, mana yang paling tepat?
>
> a. Betul, hampir semua sahamnya ia jual di sekitar Rp165.
> b. Betul, penjualan pertamanya memang baru terjadi di Rp165.
> c. Keliru, hampir semua sahamnya ia jual di harga belasan rupiah.
> d. Keliru, ia paling banyak menjual justru di atas harga Rp165.

**Kartu:** `fil-2025-08-25` · `fil-2025-09-01` · `fil-2025-09-29` · `porsi-jual-murah` (turunan baru) — **Jawaban:** c

**Teks kunci:** Tiga laporan itu semuanya penjualan, tetapi ukurannya jauh berbeda: 369,5 juta dan 50 juta lembar di Rp12–15, melawan 10 juta lembar di Rp165. Kartu keempat merangkumnya: 98 dari setiap 100 lembar terjual di harga belasan rupiah. Pemilik besar berhak menjual; yang perlu dibaca calon pembeli adalah siapa yang ada di sisi jual. Perhatikan juga tanggalnya: publik baru tahu sebuah transaksi ketika laporannya terbit. Salah-kaprah yang umum: melihat transaksi terakhir lalu mengira semuanya terjadi di harga itu.

**Catatan untuk eksekutor:** `porsi-jual-murah` = 419.500.000 ÷ 429.500.000 = 97,67% → ditulis "98 dari setiap 100"; `turunan_dari` ketiga laporan. Persentase kepemilikan (64,48% → 58,57%) tidak tampil di kartu, hanya di panel sumber, dan di sana ditulis dua desimal secara konsisten (59,375% → 59,38%).

---

## Layar pembukaan

**Penanda waktu berganti:** "Waktu berjalan lagi — inilah yang terjadi sesudah 8 Oktober 2025."

Isi pembukaan lama dipertahankan (suspensi 9 Okt, 10 Okt buka Rp177 → tertinggi Rp240 → tutup Rp152, 22 Okt Rp50, laporan penjualan Rp220–232 dan Rp51–56, RUPS 16 Jul 2026 gagal kuorum 22,32%), ditulis dengan gaya bahasa yang sama dengan kartu, ditambah satu bagian sesudahnya:

**Apa yang bisa dan tidak bisa dibaca pada 8 Oktober**
- Bisa dibaca: pemilik terbesarnya sedang menjual, hampir semuanya di harga belasan rupiah; dividennya sangat kecil dibanding harga; satu-satunya pengumuman bursa berbicara tentang laporan keuangan yang terlambat, bukan akuisisi.
- Tidak bisa dibaca: kapan harga berbalik, atau sampai berapa. Tidak satu pun kartu memuat itu, dan produk ini tidak pernah memintamu menebaknya.
- Nama aslinya: PT Diamond Citra Propertindo Tbk (DADA).

## Layar akhir — tiga ketukan dan satu kotak

1. "Seberapa layak kasus ini kamu bagikan ke teman?" — 1 sampai 5.
2. "Kasus tadi terasa seperti…" — ujian hafalan · membaca data · menebak harga.
3. "Kamu paling sering menjawab dari…" — kartu fakta · ingatan atau pengetahuan sendiri · tebakan.
4. Kotak teks opsional: "Ada yang membingungkan atau ingin kamu sampaikan?" (boleh kosong)

Semua opsional; tombol **Selesai** selalu aktif. Di bawahnya satu tombol lagi: **"Mau coba kasus lain"** — untuk alpha ia menampilkan pesan di bawah ini, dan ketukannya dicatat sebagai ukuran minat.

> **Tidak semua saham seperti ini.** Kasus berikutnya adalah perusahaan yang sehat — sedang kami siapkan. Selamat belajar membaca data, folks.

(Sengaja tanpa "happy trading/investing": produk ini tidak pernah mengajak bertransaksi, INV-5.)

## Riwayat uji

- **Uji model tanpa kartu / dengan kartu (21 Sep, tiga putaran atas draf formal).** Draf pertama gagal telak (soal 1 tertebak benar dengan keyakinan 88% dari pola opsi dan bocoran antar-soal). Pelajaran yang dibawa ke bentuk sekarang: opsi seimbang, tanpa bocoran antar-soal, istilah dijelaskan, kartu suspensi harus menjelaskan bahwa saham sudah diperdagangkan lagi, pengecoh lahir dari salah baca nyata. Batasnya: satu model, satu sampel; berguna menemukan bocoran, bukan mengukur kesulitan — dan **sama sekali tidak mengukur apakah pemula mau mengerjakannya**, yang justru menjadi cacat terbesar draf itu.
- **Uji pemilik atas bentuk sekarang (21 Sep):** soal 3, lalu soal 1 dan 2, semuanya dijawab benar dalam sekali lihat, tanpa mengandalkan ingatan penjelasan malam sebelumnya. Temuan pemilik: "sekarang tahun 2026 — saya sempat bingung"; lahir aturan 8 (jangkar waktu).
- **Uji model berperan pemula atas bentuk sekarang, dengan kartu (21 Sep):** ketiganya benar tanpa ambiguitas, kira-kira 25 + 30 + 45 detik (draf formal: 3,5–4 menit). Dua masukan diterapkan: opsi soal 2 yang "cuma beda jumlah nol, menguji ketelitian mata" diganti sehingga tanggal ex dan perbandingan nilai ikut menentukan; "hari bursa" diberi penjelasan. Satu masukan **tidak** diterapkan: soal 3 disebut terasa padat angka — bentuk itu sudah dijawab benar dalam sekali lihat oleh manusia sungguhan, dan penilaian manusia mengalahkan persona model. Dipantau lewat durasi soal 3 di data alpha.
- **Uji model tanpa kartu atas bentuk sekarang (21 Sep):** penebak mahir menjawab **3 dari 3 benar** (keyakinan 70%, 55%, 78%) — bentuk obrolan lebih mudah ditebak daripada draf formal. Tiga bocoran yang bisa dijelaskan, semuanya diperbaiki: istilah "suspensi" mematikan opsi "bursa belum pernah mengumumkan apa pun" (opsi diganti alasan tandingan yang masuk akal); opsi soal 2 yang angkanya tidak membalik vonis (opsi sudah diganti); opsi soal 3 yang labelnya bertabrakan dengan isinya ("Betul, ia malah menambah"). **Bentuk sesudah perbaikan tidak diuji ulang ke model.** Keputusan sadar: penebak mahir bukan pengguna kita; yang dijaga adalah tidak adanya bocoran murahan, dan ukuran sebenarnya adalah perilaku manusia di alpha — kartu dibuka sebelum menjawab, dan jawaban "menjawab dari kartu" di layar akhir.
