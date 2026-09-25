# Kasus DADA v3 — pesan teman dulu, lalu dokumen, lalu jawaban

Menggantikan bagian layar dan soal di `docs/kasus-dada-v2.md` untuk skema kasus versi 3. Kartu, kartu penentu, opsi, jawaban, fakta turunan, layar pembukaan, dan layar akhir dari v2 **tetap berlaku** kecuali disebut di sini. Rupa layarnya mengikuti `docs/contoh/layar-soal.html`.

Lahir dari uji pemilik di ponsel (21 Sep 2026): layar v2 "ramai, masih terasa AI slop"; label "TEMANMU" tak terbaca; kalimat "Hari ini 8 Oktober…" terbaca sebagai informasi, bukan konteks; kartu dikira pilihan ganda; tiga aturan di layar pertama tidak dibaca. Tentang urutan baru ia berkata: *"orang kasih kabar, kita verify — agar melatih motorik masyarakat untuk selalu verify jika ada informasi masuk."*

## Aturan penulisan tambahan (berlaku untuk semua kasus berikutnya)

1. **Urutan layar soal:** pesan teman → "Betul atau keliru? Cek ke {n} dokumen ini:" (sejak M3.9; dulu "Cek omongan {nama} ke {n} dokumen ini:") → kartu → arti istilah → judul pertanyaan → opsi.
2. **Pesan teman adalah pesan obrolan sungguhan**: nama pengirim, isi paling banyak 220 karakter, jam. Konteks yang dulu ditulis di batang soal ("pegang 10 lot sejak Juli") masuk ke dalam pesannya. Tanggal tidak diulang — keping kalender yang memegangnya.
3. **Jam pesan sesudah bursa tutup pada tanggal T** (sesudah 16.00 WIB), karena pesan-pesan itu membicarakan harga penutupan hari itu.
4. **Tiap soal pengirim berbeda**, supaya terasa grup obrolan dan tidak ada satu nama yang selalu salah. Nama pendek yang umum, tanpa nama tokoh nyata.
5. **Angka di dalam pesan dan opsi adalah ucapan, bukan fakta**: tidak ditebalkan, tidak diwarnai, tidak ditautkan. Angka di lembar tebal dan berwarna tinta stempel.
6. **Judul pertanyaan selalu berbentuk sama:** "Omongan {nama} cocok dengan dokumennya?" — isi jawabannya ada di opsi.
7. **Petunjuk cara main hanya di soal pertama**, satu kalimat, tepat di bawah keping kalender — dan sejak M3.9 **boleh tidak ada**: kedua kasus tidak memakainya, karena layar pertama dan kalimat pengantar sudah mengatakan cara mainnya.
8. Teks kunci menyebut nama pengirimnya, bukan "temanmu".

## Layar pertama (M3.9, varian A uji K-06)

Halaman kalender besar (`OKTOBER 2025` / `8` / `RABU`), lalu:

- Judul (`pembuka.judul`): **Cek omongan saham di grup ke dokumen resminya.**
- Satu contoh gelembung — dibaca dari pesan soal 1, bukan ditulis kedua kali: **Bayu** · *Saham D naik 22 kali! Pasti mau dibeli investor asing, bursa udah umumin.* (tanpa tanggal, tanpa jam, tidak bisa diketuk)
- Ajakan (`pembuka.ajak`): **Betul atau keliru?**
- Tombol: **Mulai simulasi** (M3.12; dulu "Mulai kasus")
- Baris meta di bawah tombol: *3 soal · sekitar 5 menit · tanpa akun, tanpa skor*
- Kaki halaman: tiga kalimat tetap, di bawah lipatan.

"Kita mundur ke Rabu, 8 Oktober 2025." dan kalimat M3.5 dihapus. Kenapa: data alpha 23 Sep 2026 mencatat 13 orang
asing dan nol yang selesai; ±9 sesi masuk soal 1 lalu pergi dalam 1–15 detik tanpa ketukan; tiga orang uji duduk
balik bertanya "ini aplikasi apa?". Di uji K-06 (155 penguji tanpa konteks + 10 penilai buta; pengujinya model
bahasa, derau ±2/5) varian ini menjawab "ini apa" 9/10 (kalimat lama 10/20). Pemilik menyetujui rupanya 24 Sep 2026
dini hari. Patokan gambarnya: `docs/contoh/k06/`.

Riwayat: kalimat dan baris meta M3.5 diputuskan sesudah uji duduk 22 Sep: ditanya
"tadi aku minta kamu ngapain?", penguji menjawab *"cari tahu orang ngerti saham
atau enggak"* — "grup obrolanmu" terbaca sebagai kata benda tentang aplikasi,
bukan sebagai orang. Alasan berhenti yang diucapkan: *"ga tau berapa soalnya;
lebih suka soal dikit biar fokus, kalau banyak males"*. Jumlah soal di baris meta
dibaca dari data (`kasus.soal.length`), menitnya dari `kasus.pembuka.menit`.

## Soal 1 — Bayu, 19.38 (M3.9: pemanasan, varian A uji K-06)

Disalin persis dari kontrak M3.9 D-4 dan dijaga huruf demi huruf oleh `factory/kasus/soal1-k06.test.ts`.

**Petunjuk:** tidak ada. **Istilah:** tidak ada.

**Pesan:** Saham D naik 22 kali! Pasti mau dibeli investor asing, bursa udah umumin.

**Pengantar kartu:** Betul atau keliru? Cek ke dua dokumen ini:

**Kartu 1 (penentu) — `susp-2025-06-30`** · *Pengumuman bursa · 30 Jun 2025*
> Bursa menyetop sementara jual-beli saham ini: laporan keuangan tahunannya belum diserahkan. Per **1 Agustus** dibuka lagi.

**Kartu 2 — `kelipatan-2025-08-01-2025-10-08`** (turunan) · *Dihitung dari data harga*
> **Rp8** pada **1 Agustus**, **Rp178** hari ini: naik **22 kali**.

**Judul pertanyaan:** Omongan Bayu cocok dengan dokumennya?

- a. Betul, pengumuman bursanya soal investor asing.
- **b. Keliru, pengumumannya soal laporan keuangan telat.** ← jawaban
- c. Betul, pengumuman itu yang bikin harganya naik 22 kali.
- d. Keliru, pengumumannya soal harga yang naik terlalu cepat.

**Teks kunci:** Bursa memang pernah mengumumkan sesuatu, tetapi isinya lain dari yang dikira Bayu: jual-beli disetop karena laporan keuangan tahunan belum diserahkan. Tidak ada kata "investor asing" di kartu mana pun. Kartu harga hanya memberi tahu bahwa harganya naik 22 kali, bukan kenapa. Salah-kaprah yang umum: menganggap harga yang naik sebagai semacam pengumuman, lalu mencocokkannya dengan kabar yang sedang ramai.

Kenapa berubah: di uji K-06, penguji yang sampai di kartu soal 1 lama "belum tahu harus jawab apa" 10/10; versi ini 3/10, dan kata sebelum opsi pertama turun 116 → 72. Kartu penentu kini pertama, jadi di 360 × 640 ia terlihat utuh tanpa menggulir.

## Soal 2 — Dimas, 19.42

**Pesan:** Gue pegang 10 lot dari Juli. Dividennya receh banget, buat bayar parkir motor aja kurang. Harga setinggi ini jelas bukan karena dividennya.

**Pengantar kartu:** Betul atau keliru? Cek ke dua dokumen ini: (sejak M3.9 sama di semua soal; isi soal 2 tidak berubah)

**Kartu, istilah, opsi, jawaban (a), kartu penentu:** seperti v2.

**Judul pertanyaan:** Omongan Dimas cocok dengan dokumennya?

**Teks kunci:** Kartu kedua sudah menghitungnya: 1.000 lembar × Rp0,14 = Rp140, untuk saham yang nilainya Rp178.000 — kurang dari seperseribu nilainya. Dimas betul, dan karena ia sudah pegang sejak sebelum tanggal ex, ia memang kebagian. Dividen adalah bagian laba yang benar-benar sampai ke pemilik saham; angka ini memperlihatkan bahwa harga Rp178 tidak ditopang pembagian laba. Salah-kaprah yang umum: menghitung dividen per lot, padahal dividen dihitung per lembar; dan mengira tanggal ex menggugurkan hak orang yang sudah lama pegang, padahal yang tidak kebagian hanya pembeli sesudah tanggal itu.

## Soal 3 — Rara, 19.47

**Pesan:** Harganya udah Rp178 lho. Pemilik terbesarnya aja tenang-tenang, nggak kedengeran jual. Berarti dia yakin harganya masih bakal naik.

**Pengantar kartu:** Betul atau keliru? Cek ke empat dokumen ini: (sejak M3.9 sama di semua soal; isi soal 3 tidak berubah)

**Kartu, istilah, opsi, jawaban (c), kartu penentu:** seperti v2.

**Judul pertanyaan:** Omongan Rara cocok dengan dokumennya?

**Teks kunci:** Ketiga laporan itu penjualan, bukan pembelian: 70 juta, 179,5 juta, dan 50 juta lembar — 299,5 juta lembar, semuanya di Rp13–Rp15, jauh di bawah harga hari ini. Perhatikan juga tanggalnya: transaksinya 12–14 Agustus, tetapi publik baru bisa membacanya pada 25 Agustus dan 1 September, ketika laporannya terbit. Pemilik besar berhak menjual; yang perlu dibaca calon pembeli adalah siapa yang ada di sisi jual. Salah-kaprah yang umum: menganggap "nggak kedengeran jual" sama dengan "tidak menjual".

## Kaki lembar: apa yang terbuka di tempat

- Lembar bersumber resmi — kaki **"Lihat sumbernya"**: (1) *Kalimat resminya* = klaim formal fakta itu; (2) "Sudah bisa dibaca publik sejak {tanggal}. Asalnya: {nama sumber dalam bahasa orang, mis. 'data aksi korporasi Sectors'}"; (3) lipatan kecil "Rincian teknis" berisi endpoint, parameter, dan kode fakta.
- Lembar hitungan — kaki **"Lihat cara menghitungnya"**: (1) hitungannya, baris demi baris, dengan tanggal ditulis biasa; (2) "Dihitung dari {kepala awam fakta asalnya}"; (3) lipatan "Rincian teknis".
- Baris **"Arti istilah: … ›"** membuka arti tiap istilah di bawahnya.

## Layar akhir dan pesan penutup

Seperti v2, dengan dua perubahan:
- Kalimat di bawah tombol Selesai (diperbarui M3.8 D-9, karena yang dicatat bertambah): *Kami mencatat apa yang diketuk, seberapa jauh layar digulir, kapan halaman ditinggalkan, dan kesalahan teknisnya; juga jenis perangkat dan pengaturan tampilan secara garis besar, jam setempat, dan asal tautan — tanpa alamat IP dan tanpa identitas. Kami menyimpan satu nomor acak di browsermu supaya tahu kalau kamu kembali. Bukan nama, bukan akun; tidak dibagikan ke siapa pun. Teks yang kamu ketik tidak dicatat, kecuali kotak masukan ini.* Layar terima kasih: "Jawabanmu tercatat tanpa nama dan tanpa akun." Klaim "tanpa cookie" tidak dipakai di mana pun: nomor acak itu memang bukan cookie, tetapi janji tidak boleh terdengar lebih bersih dari kenyataannya.
- Pesan penutup (M4): **Tidak semua saham seperti ini.** Simulasi berikutnya: perusahaan yang membagi dividen tiap tahun. Selamat belajar membaca data. (M3.12: dulu "Kasus berikutnya: … membaca data, folks.") Sejak M4 ia tinggal di medan `penutup` berkas kasus, bukan di kode komponen, dan hanya tampil ketika tidak ada lagi kasus yang belum dimainkan — kalau masih ada, tombol "Coba simulasi lain" langsung membukanya.
- Pembukaan (M3.12, lewat `factory/kasus/dada-2025-10-08.ts`): "tanggal kasus" → **tanggal simulasi** di tiga kalimat (`paragraf[1]` "Sehari sesudah tanggal simulasi, …", `paragraf[2]` "… yang terbit sesudah tanggal simulasi …", `bisa_dibaca[2]` "… sebelum tanggal simulasi …"); "Harga tertinggi kasus ini" → **Harga tertinggi di simulasi ini**; "jejak verifikasi kasus ini" → **jejak verifikasi simulasi ini**; `paragraf[3]` "Rantai laporan itu sendiri tidak bersih." → **Laporan-laporan itu sendiri tidak bersih.** Teks soal 1–3 tidak berubah.
