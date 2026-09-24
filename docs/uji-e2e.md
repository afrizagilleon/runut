# Uji ujung-ke-ujung di browser yang melukis

`npm run e2e` memainkan Runut di Chromium sungguhan: emulasi ponsel 360 × 640
dengan layar sentuh, mode terang dan gelap, terhadap **build produksi dan
pengumpul peristiwa yang sungguhan** — bukan tiruan.

## Kenapa ini ada

Pemilik menemukan cacat di ponselnya yang lolos dari 611 tes hijau: kaki kartu
tidak bisa menutup. Sebabnya struktural, bukan kelalaian. Repo ini sengaja tanpa
jsdom, jadi tes unit hanya bisa menjaga modul murni; dan panel peramban yang
dipakai reviewer ber-`visibilityState: hidden` dan tidak pernah menghasilkan
frame, sehingga `IntersectionObserver`, animasi CSS, dan gulir **tidak pernah
jalan di sana**. Lima cacat sampai ke tangan pemilik lewat celah itu.

Karena itu berkas tes pertama yang dijalankan adalah `e2e/kenari.spec.ts`: ia
tidak menguji produk sama sekali, ia menguji **alatnya** — bahwa browser uji
benar-benar melukis.

## Aturan repo yang baru

> **Setiap cacat yang ditemukan manusia ditulis dulu sebagai tes e2e yang merah,
> baru diperbaiki.**

Urutannya, tanpa pengecualian:

1. tulis tesnya, jalankan, **tempel keluaran merahnya** di catatan;
2. baru perbaiki kodenya;
3. jalankan lagi; kalau ia hijau tanpa perbaikan, tesnya yang salah.

Dan aturan kedua yang sama pentingnya: **setiap tes harus dibuktikan merah
dengan merusak kode produk**, bukan dengan merusak tesnya. Tes yang tetap hijau
ketika kode yang dijaganya dirusak bukan penjaga — ia hanya hiasan. Beberapa
tes di rangkaian ini lahir salah dan baru ketahuan lewat sabotase; ceritanya ada
di ledger M3.3.

## Menjalankan

```bash
npm run e2e          # semua proyek lokal
npm run e2e:lihat    # --headed, untuk dilihat manusia
```

Keduanya menyalakan servernya sendiri dan mematikannya lagi. Tidak perlu
menjalankan `npm run dev` lebih dulu — justru **jangan**: port yang dipakai e2e
sengaja berbeda supaya server pemilik tidak tertabrak.

| yang dijalankan | port |
|---|---|
| pengumpul peristiwa (`server/kolektor.mjs`) | 8797 |
| `vite` dev | 5183 |
| `vite preview`, build **dengan** pengumpul | 4183 |
| `vite preview`, build **tanpa** pengumpul | 4184 |

Semuanya `--strictPort` di `127.0.0.1`: port yang sudah terpakai gagal terang,
bukan pindah diam-diam. Port 5173, 4173, dan 8787 milik pemilik tidak disentuh.

Menjalankan sebagian:

```bash
npx playwright test --project=ponsel-terang        # satu proyek
npx playwright test buka-tutup                     # satu berkas
npx playwright test --grep "E-04"                  # satu tes
npx playwright test penjelasan-sebaris             # temuan M3.6 D-1
npx playwright show-report .cache/e2e/laporan      # laporan HTML putaran terakhir
```

## Ke mana keluarannya pergi

Semuanya ke `.cache/e2e/`, yang sudah di-gitignore:

| jalur | isi |
|---|---|
| `.cache/e2e/layar/<proyek>/NN-nama.png` | tangkapan layar tiap tahap permainan (kasus bawaan) |
| `.cache/e2e/layar/<proyek>/<kasus>/NN-nama.png` | sama, untuk kasus lain — mis. `ultj/` |
| `.cache/e2e/laporan/` | laporan HTML |
| `.cache/e2e/hasil/` | jejak dan lampiran tes yang gagal |
| `.cache/e2e/data/` | berkas JSONL pengumpul uji (dikosongkan tiap putaran) |
| `.cache/e2e/dist-dengan`, `dist-tanpa` | dua build produksi yang diuji |

`web/dist/` milik `npm run build` tidak pernah tersentuh.

Tangkapan layarnya **bahan review, bukan pembanding**: tidak ada
`toHaveScreenshot` di rangkaian ini, dan tidak ada tes yang bisa merah karena
satu piksel bergeser. Ia ada supaya pemilik dan reviewer bisa melihat apa yang
dilihat browser tanpa membuka browser.

## Proyek

| proyek | server | layar | isi |
|---|---|---|---|
| `ponsel-terang` | build + pengumpul (4183) | 360 × 640 sentuh, DPR 2, terang | seluruh rangkaian |
| `ponsel-gelap` | sama | sama, gelap | seluruh rangkaian |
| `dev` | `vite` dev (5183) | 360 × 640 sentuh | E-01, E-06a, E-10 |
| `tanpa-pengumpul` | preview 4184 | 360 × 640 | E-08 (tanpa) |
| `lebar` | build + pengumpul | 1280 × 800, tanpa sentuh | E-10, E-12d, E-13 |
| `alpha` | **hanya bila `E2E_ALPHA_URL` diset** | 360 × 640 sentuh | E-10 dengan `?k=uji`, kasus bawaan saja |

## Cacat yang pernah lolos → tes yang menjaganya → sabotase yang membuktikannya

| cacat yang pernah sampai ke manusia | tes | sabotase yang membuatnya merah |
|---|---|---|
| Halaman putih di `http://` LAN: `crypto.randomUUID` tidak ada di konteks tidak aman | `asal-tidak-aman.spec.ts` E-01 | `Aplikasi.tsx`: `buatIdSesi(...)` → `crypto.randomUUID()` |
| Tombol kembali kedua keluar dari situs | `riwayat.spec.ts` E-02 | `riwayat.ts`: `perintahRiwayat` mengembalikan `'dorong'` untuk layar yang sama; atau `pushState` di dalam penangan `popstate` |
| **C-1** Tombol **maju** tidak menggerakkan layar, lalu kembali pun berhenti bekerja | `riwayat.spec.ts` E-02b, E-02c | `Aplikasi.tsx`: `popstate` dianggap selalu mundur · `alur.ts`: `tujuanRiwayat` tidak memeriksa `pernahSampai` · `riwayat.ts`: `majuPeramban` tidak memindahkan penunjuk |
| Kaki kartu tidak bisa menutup | `buka-tutup.spec.ts` E-03 | `alur.ts`: `sakelar_sumber` hanya membuka |
| Opsi pertama tidak terlihat di 360 px dan pemain tidak tahu harus ke mana | `bilah-bawah.spec.ts` E-04 | `Aplikasi.tsx`: pengamat opsi tidak men-dispatch |
| Sobekan kalender meniadakan dirinya sendiri | `sobekan.spec.ts` E-05 | `Kalender.tsx`: kelas `kalender-jatuh` dihapus |
| `mulai` tidak pernah sampai untuk kunjungan yang ditinggalkan cepat | `mulai-satu.spec.ts` E-06a | `kirim.ts`: `mulai` **dan** `layar_masuk` dikeluarkan dari `PENTING` |
| Ketukan mati tidak terbedakan dari ketukan hidup | `pelacak.spec.ts` E-06b | `pelacak.ts`: `bacaSasaran` selalu `mati: false` |
| Guliran tercatat sebagai ketukan | `pelacak.spec.ts` E-06c | `pelacak.ts`: ambang `GESER_MAKS` dilonggarkan |
| Kedalaman gulir diam-diam nol | `pelacak.spec.ts` E-06d | `alur.ts`: `gulir.maks` selalu 0 |
| "18,6 menit di soal 1, gulir 100 %, nol ketukan" tidak bisa dibedakan dari ponsel yang ditinggal | `pelacak.spec.ts` E-06h | `alur.ts`: `catatAmbangGulir` tidak melahirkan apa pun · penjaga `dilapor >= ambang` dicabut (ambang lahir berulang) |
| Layar yang muat satu jendela terbaca seolah dibaca sampai habis | `pelacak.spec.ts` E-06i | `Aplikasi.tsx`: `tinggi <= 0 ? 100` menjadi `? 0` |
| Peristiwa kembar sesudah `pagehide` | `pelacak.spec.ts` E-06e | (dijaga `saringYangBaru`; urut 1..N diperiksa utuh) |
| Teks pemain bocor ke peristiwa lain | `pelacak.spec.ts` E-06g | `alur.ts`: teks layar akhir ikut ke `tutup` |
| "100+ peserta" menghitung sesi, bukan orang | `pelacak.spec.ts` E-06f | `sesi.ts`: `bacaPengunjung` selalu membuat nomor baru |
| Kartu tercatat nol detik (F-1) | `pengamat-kartu.spec.ts` E-07 | `Aplikasi.tsx`: pengamat kartu tidak men-dispatch |
| Build "tanpa pengumpul" diam-diam menghubungi sesuatu | `jaringan-tanpa.spec.ts` E-08 | `main.tsx`: satu `fetch` ke asal lain |
| `VITE_KOLEKTOR_URL=/e` menjadi `E:/` lewat Git Bash | `jaringan-dengan.spec.ts` E-08 | `kirim.ts`: `ALAMAT` menjadi `'E:/e'` |
| Identitas emiten bocor sebelum pembukaan | `identitas.spec.ts` E-09a | `Aplikasi.tsx`: kode saham ditampilkan di keping kalender |
| **C-3** Kode saham terbaca di "Rincian teknis", dua ketukan dari kartu mana pun | `identitas.spec.ts` E-09a, E-09b | `sumber.ts`: `samarkanBila` mengembalikan teks apa adanya · varian `.JK` dikeluarkan dari daftar · pola dibuat peka huruf besar-kecil |
| **C-2** Tautan angka membuka sesuatu tanpa mengatakannya (`aria-expanded`) | `buka-tutup.spec.ts` E-03a, E-03b | `Teks.tsx`: `aria-expanded` dicabut, atau dibekukan di `false` · `Aplikasi.tsx`: `id` blok penjelasan dihapus |
| **C-4** Sorot ketuk biru bawaan Chromium, bukan umpan tekan dari palet | `umpan-tekan.spec.ts` | `gaya.css`: aturan `:active` dihapus · `-webkit-tap-highlight-color` dihapus · `:active` hanya untuk satu dari tiga kontrol |
| Sesudah salah, pemain tidak tahu mana pilihannya | `umpan-balik.spec.ts` E-11 | `alur.ts`: label "Pilihanmu" dihapus dari opsi keliru |
| Gulir mendatar | `tata-letak.spec.ts` E-12a | `gaya.css`: `.tumpukan { min-width: 700px }` |
| Kepala lembar terpotong | `tata-letak.spec.ts` E-12b | `gaya.css`: kepala lembar `max-width` kecil + `overflow: hidden` |
| Keping menceng di desktop | `tata-letak-lebar.spec.ts` E-12d | `gaya.css`: `.kalender-keping { left: 0; width: 100vw }` |
| Bidang sentuh terlalu pendek | `tata-letak.spec.ts` E-12e | `gaya.css`: `.lembar-kaki` setinggi 20 px |
| Teks redup tidak terbaca | `tata-letak.spec.ts` E-12f | `gaya.css`: `--tinta-redup` dipucatkan |
| Cincin fokus hilang | `papan-ketik.spec.ts` E-13 | `gaya.css`: semua `outline: 2px solid var(--stempel)` → `none` |
| Layar pertama tidak mengatakan berapa soal ("ga tau berapa soalnya") | `permainan.spec.ts` E-10 | `Aplikasi.tsx`: baris `data-uid="meta-pembuka"` dihapus · `pembuka.ts`: jumlah soal ditulis mati `'3 soal'` (tes unit) |
| Pemain tidak tahu chat itu tanggal berapa | `balon-tanggal.spec.ts` E-14 | `Aplikasi.tsx`: baris `.pesan-meta` dihapus · `aria-label` balon dikembalikan ke nama + jam saja · `tanggal.ts`: `BULAN_SINGKAT` diambil dari `BULAN_PENDEK` yang berhuruf kapital (tes unit) |
| Sesudah mengunci, cap dan kartu penentu ada di bawah lipatan dan pemain langsung "next" | `gulir-ke-cap.spec.ts` E-15 | `Aplikasi.tsx`: pemanggilan `scrollIntoView` di `useGulirKeCap` dihapus |
| Gulir halus ikut pindah layar: layar berikutnya lahir sudah tergulir | `gulir-ke-cap.spec.ts` E-15b | `Aplikasi.tsx`: pengulangan `window.scrollTo(0, 0)` di `requestAnimationFrame` dihapus |
| **M3.6-1** Mengetuk "9 Oktober 2025" di paragraf panjang tidak memperlihatkan apa-apa: penjelasannya terbuka 289 px di bawah, di luar layar | `penjelasan-sebaris.spec.ts` E-16a–d | `Teks.tsx`: `selipkanPenjelasan` mengembalikan kalimat terakhir (blok kembali ke ujung paragraf) · daftar `terbuka` ditelusuri dari depan (yang lama menang) · ketukan ganda untuk tautan yang kalah baru dihapus (satu ketukan jadi tanpa akibat) |
| **M3.6-2** Celah antara nama pengirim dan balonnya; jam pernah hilang dari pojok kanan bawah | `balon-tanggal.spec.ts` E-14b | `Aplikasi.tsx`: nama dikeluarkan lagi dari balon · `<time class="pesan-jam">` dihapus · `tanggal.ts`: `tanggalBalon` membawa jam lagi (angka jam jadi dua kali) |
| **M3.6-3** Keping "HARI INI · RABU 8 OKT 2025" tidak pernah dilihat pemain | `titik-keping.spec.ts` E-17a–c | `Aplikasi.tsx`: `berdenyut` diberikan ke semua soal · `gaya.css`: jumlah detak dibuat `infinite` · aturan `prefers-reduced-motion` untuk `.keping-titik-denyut` dihapus |
| **M3.6-4** Sobekan kalender "kurang terasa" | `sobekan.spec.ts` E-05 | `gaya.css`: `animation-delay` sobekan dijadikan 2.000 ms (janji animasi 2.700 ms > batas 1.750 ms) |
| **M3.6-5** "rantai laporan kepemilikan" terdengar seperti rantai komando; "sepuluh aturan" ditulis mati padahal mesin V2 punya 31 | `jejak-verifikasi.spec.ts` E-18 | `jejak.ts`: angka ditulis mati lagi · kata "rantai" dikembalikan · ringkasan lipatan memakai angka lain daripada kalimat pembukanya |
| **F-M36-1** "Langsung ke ringkasan" mendarat 176 px meleset ketika diketuk selagi kalender masih menutup ruangnya | `permainan.spec.ts` E-10 (proyek `lebar`) | `Aplikasi.tsx`: guliran kedua di `gulirKeSasaran()` dihapus |
| Halaman meluap mendatar karena satu label rujukan tidak bisa putus baris; Chromium lalu melebarkan layout viewport dan ketukan mendarat di elemen lain (E-10 menggantung 90 detik) | `tata-letak.spec.ts` E-12a untuk tiap kasus | `factory/kasus/ultj-2026-05-04.ts`: kembalikan label rujukan sepanjang satu klausa · `validator.ts`: `MAKS_LABEL_RUJUKAN` dinaikkan melewati panjang label itu |
| Pemain yang sudah main satu kasus disodori kasus yang sama lagi | `pilih-kasus.spec.ts` E-20a, E-20e, E-20f | `Aplikasi.tsx`: `catatDimainkan` tidak menulis apa-apa · `pilih-kasus.ts`: `pilihKasus` mengabaikan daftar yang sudah dimainkan · `kasusBerikut` selalu `null` |
| `?kasus=` tidak dihormati, sehingga seluruh rangkaian mengukur kasus yang salah | `pilih-kasus.spec.ts` E-20a (tiap kasus), `identitas.spec.ts` E-09b | `Aplikasi.tsx`: `paksa: kodeKasus(...)` menjadi `paksa: null` |
| Pesan penutup ditulis mati di kode, jadi tiap kasus menutup dengan janji yang sama | `pilih-kasus.spec.ts` E-20d | `Aplikasi.tsx`: kalimat penutup lama dikembalikan ke JSX |
| Peristiwa `minat_kasus_lain` hilang ketika kasus berganti di ketukan yang sama | `pilih-kasus.spec.ts` E-20e (tes meja: `bungkus.test.ts`) | `bungkus.ts`: `kasusBaru` membuang antrean lama |
| **M3.7-1** Pesan teman hilang dari layar justru ketika pemain menjawab: gulir balik ke kartu 2,5× di soal 2 (uji duduk 22 Sep) | `balon-melayang.spec.ts` E-19a–g | `Aplikasi.tsx`: ketukan tidak men-dispatch `sakelar_balon` (5 dari 7 merah) · ambang `AMBANG_BALON_MELAYANG` 0,5 → 0,001 (E-19e) · `INTIP_BALON_PX` 28 → 4 (E-19a) · tarikan tidak pernah melewati ambang (E-19c) · `gaya.css`: `overflow: hidden` pada `.melayang` dihapus (E-19a) · aturan `prefers-reduced-motion` balon dihapus (E-19f) |
| **M3.8** Tidak ada yang bisa mengatakan ponsel apa yang dipakai 13 orang asing yang pergi, dibuka di Threads atau di peramban, mode gelap atau terang | `perangkat.spec.ts` E-21a–c | `perangkat.ts`: penanda Threads (`Barcelona`) dicabut → `Expected "threads" Received "lain"` · `Aplikasi.tsx`: `perangkat: null` → tiga medan `null` |
| **M3.8** "Pindah aplikasi lalu kembali" tidak terbedakan dari "pergi" | `tampak.spec.ts` E-22a | `Aplikasi.tsx`: `sembunyi` di-dispatch tanpa `flushSync` → `tampak sembunyi` tidak pernah tiba · `alur.ts`: `ms_sembunyi` selalu 0 |
| **M3.8** Galat JavaScript di ponsel orang tidak terlihat, dan pesannya bisa membawa alamat, token, dan UA | `galat.spec.ts` E-23a–b | `alur.ts`: reducer tidak menyamarkan · galat kembar tidak ditolak · batas lima dicabut · `galat.ts`: tanpa berkas = `aplikasi` · `kirim.ts`: `galat` keluar dari `PENTING` |
| **M3.8** "Halamannya lambat" tidak bisa dibuktikan maupun dibantah | `kinerja.spec.ts` E-24a–b | `alur.ts`: `kinerja` tidak lahir saat tersembunyi · penjaga sekali-per-sesi dicabut · `Aplikasi.tsx`: `ms_ke_tampil` tidak dikirim |
| **M3.8** Pemilik (DADA): buka "laporan 19 Oktober 2025" → buka "laporan 26 Oktober 2025" → tutup 26 → **19 muncul kembali** | `penjelasan-sebaris.spec.ts` E-16e (dan E-16c) | `alur.ts`: `saudara` diabaikan (perilaku M3.6) · `Teks.tsx`: `saudara` tidak dikirim |
| **M3.8 A-1** Sesudah "Kunci jawaban", cap mendarat DI BALIK balon melayang (cap.top 65,5 lawan balon.bottom 92,0) | `cap-di-bawah-balon.spec.ts` E-25a–b (DADA dan ULTJ, `ponsel-terang`) | `gaya.css`: `scroll-margin-top` kembali `64px` · `alur.ts`: kunci tidak mengembalikan balon turun ke intip · `Aplikasi.tsx`: `--tepi-atas` tanpa tinggi balon |
| **M3.8 F-1** `mulai` kasus KEDUA hilang (sesi tak masuk penyebut mana pun); E-20e merah 1–3 dari 8 putaran, sudah sejak `da820db` | `pilih-kasus.spec.ts` E-20e `--repeat-each` (tes meja: `bungkus.test.ts`, urutan terapan-ulang React) | `bungkus.ts`: `bersihkan` kembali membuang MENURUT JUMLAH (`slice(n)`) |
| **M3.8 T-09** E-10 [ULTJ] di proyek `lebar` merah ±1/20: prasyarat "ringkasan di luar layar" diukur selagi sobekan kalender masih menutup ruangnya (judul y ≈ 813–893 selama animasi, ≈ 717 sesudahnya — di DALAM layar 800 px) | `permainan.spec.ts` E-10 (di ponsel prasyaratnya tetap wajib; di `lebar` dicatat sebagai anotasi bila tidak berlaku — tes TIDAK menunggu animasinya, karena justru ketukan di tengah animasi yang dijaga F-M36-1) | — (cacat TES, bukan produk). **Catatan:** sabotase F-M36-1 di baris atas ("guliran kedua dihapus") ternyata HIJAU, juga di `da820db` (6/6) — penjaga itu tidak lagi menggigit di mesin ini; belum diperbaiki di M3.8 |
| **M3.8** INV: UA mentah, perujuk lengkap, atau alamat di pesan galat meninggalkan ponsel | `kiriman-privasi.spec.ts` E-26 (memotret badan tiap kiriman `/e`) | `perangkat.ts`: `peramban_dalam` = UA mentah · `perujuk` = alamat lengkap · `alur.ts`: galat tidak disamarkan — ketiganya `nol "Mozilla"` / `nol "://"` merah |
| **M3.9** 13 orang asing, nol selesai; tiga penguji bertanya "ini aplikasi apa?" — layar pertama tidak mengatakan dirinya | `layar-pertama.spec.ts` E-27a–e (kedua kasus) | `Aplikasi.tsx`: contoh gelembung diganti teks tetap (E-27b) · judul kembali "Kita mundur ke …" (E-27a) · ajakan di atas contoh (E-27c) · `gaya.css`: `min-height` layar pertama dicabut → garis kaki mengintip 21 px di atas tombol (E-27d/e) · kaki tanpa bantalan setinggi bilah (E-27d) |
| **M3.9** Pengantar kartu dan label bilah varian A; soal 1 tanpa petunjuk | `layar-soal-k06.spec.ts` E-28 (kedua kasus) | `alur.ts`: `kalimatAntar` kalimat lama · `LABEL_TURUN` "↓ Jawab di bawah" · `Aplikasi.tsx`: petunjuk cadangan dirender saat `null` (hanya e2e yang merah; Vitest hijau) |
| **M3.9** Keping: bulatan di BAWAH tanggal sejak M3.2 (patokan: satu baris), penanda "sesudahnya" tidak pernah dibangun | `keping-satu-baris.spec.ts` E-29 (tabel kesetiaan dicetak) · `balon-melayang.spec.ts` E-19 | `gaya.css`: keping kembali `baseline` tanpa `space-between` · bulatan dipaksa ke baris kedua · gerigi penanda dicabut · `Aplikasi.tsx`: penanda dicabut · balon memakai tinggi keping lama 62 (E-19a/b/c/f) |
| **M3.9** D-6: sepuluh detik pertama muat di 360 × 640 | `sepuluh-detik.spec.ts` E-30 (kedua kasus) | `factory/kasus/dada-2025-10-08.ts`: urutan kartu soal 1 dikembalikan · `Aplikasi.tsx`: contoh gelembung teks tetap · "Kita mundur ke" kembali · `gaya.css`: `.tanya` didorong 200 px (opsi a > 260 px) |
| **M3.10 K-3** Nama hari di keping tidak merah (desain.md dan patokan: merah kalender); layar soal tanpa merah sama sekali | `keping-merah.spec.ts` E-31 (patokan dimuat lewat `setContent`, warna terhitung dibandingkan) | `gaya.css`: `.kalender-hari-nama` `color: inherit` |
| **M3.10 K-4a** Angka diam di kartu dan tautan angka hanya dibedakan garis titik 1 px; teks kunci punya dua penekanan | `tautan-jelas.spec.ts` E-32 | `gaya.css`: `.rujukan` kembali `dotted` · `.teks-kunci .andaian` dicabut dari aturan `inherit` |
| **M3.10 K-5** "Waktu berjalan lagi": sembilan gaya teks, mesin tik di subjudul dan pintu jejak, kapital ber-spasi ketiga, rata tengah, jarak baris 1,7 | `pembukaan-peran.spec.ts` E-33 (juga mencetak `TINGGI-PEMBUKAAN`) · `periksa:desain` | `gaya.css`: `.bacaan h3` → `var(--mesin)` (gate + E-33) · `.bacaan li` 1,7 · `Aplikasi.tsx`: tanggal garis waktu kembali `penanda().pendek` |
| **M3.10** Bidang sentuh tautan lewat `::after` menjorok ke baris sebelah dan merebut teks tautan lain; teks tautan menembus balon melayang | `pembukaan-peran.spec.ts` E-33b, E-33c (`elementFromPoint`) · `tata-letak.spec.ts` E-12e (menghitung `::after`) | `gaya.css`: `::after` `content: none` (E-33b, E-12e) · `.rujukan-teks` tanpa `z-index` (E-33b) · wadah tanpa `isolation: isolate` (E-33c) |
| **M3.10 K-6** Laptop: tombol Mulai 315 px di bawah ajakan; tautan tanpa pratinjau, tab tanpa ikon, judul tab tak teruji | `tata-letak-lebar.spec.ts` E-12g (`lebar`) · `kepala-halaman.spec.ts` E-35 | `gaya.css`: bilah layar pertama `fixed` lagi di ≥ 768 px · `index.html`: ikon dicabut · `pratinjau.png` dihapus (vite preview menjawab `text/html`) |
| **M3.10 K-7** "Pilihanmu" oranye (warna "belum cocok") sebelum dikunci | `pilihanmu.spec.ts` E-36 | `gaya.css`: `.opsi-dipilih .opsi-tanda-pemain` kembali `--belum-cocok` |
| **M3.10 K-8** Terima kasih: judul di atas kalender, rata kiri; layar akhir: legend 700 dengan garis fieldset menyembul, jangkar mesin tik | `akhir-terima-kasih.spec.ts` E-37 | `gaya.css`: legend tanpa `float` · `.jangkar` mesin tik (gate + E-37) · `Aplikasi.tsx`: judul dipindah ke atas kalender |
| **M3.10 K-10** "›" lembar menyembul di kanan balon yang mengintip | `pita-balon.spec.ts` E-38 (membaca PIKSEL tangkapan layar: pita `pointer-events: none` tidak terlihat `elementFromPoint`) | `gaya.css`: `.melayang-aktif::before` `content: none` |
| **M3.10 K-11** "**Rp13.**", "**1 Agustus,** Rp178", "Rp140 ." | `tanda-baca.spec.ts` E-39 · `Teks.test.ts` (tabel) | `Teks.tsx`: ekor kembali ke dalam `<strong>` · `gaya.css`: `.rujukan` bantalan `0 2px` (celah diukur dari kotak TEKS tautan) · teks tautan ikut `nowrap` |
| **M3.10 K-14** Pegangan balon 2,42:1 (gagal 1.4.11); cincin fokus tombol utama sewarna bidangnya; gaya `:disabled` tertinggal | `aksesibilitas-m310.spec.ts` E-40 | `gaya.css`: `.grip i` 0,55 · `outline-color: var(--stempel)` · `.tombol-utama:disabled` dikembalikan |
| **M3.11 K-1/K-2** Mode gelap berpalet "tema gelap bawaan" (biru-hitam, tombol lavender bertulisan hitam), kalender jadi kotak biru dongker; urutan aturan yang keliru mengembalikan tombol lavender bertulisan putih (2,18:1) atau kalender dongker | `palet-gelap.spec.ts` E-41a (28 pasangan kontras dari warna TERHITUNG, terang + gelap; warna diurai kanvas, transisi ditunggu), E-41b (hue kertas/lembar gelap), E-41c (kalender kertas di layar pertama, sobekan pembukaan, terima kasih; keping `--lembar`) | `gaya.css`: `--stempel-isi` bawaan SESUDAH blok gelap (2,18) · blok kalender gelap dipindah ke blok gelap di puncak (kalah urutan) · `--kertas` gelap `#0f1524` · `--merah-teks` gelap dicabut (E-31) |
| **M3.11 K-4b** Angka tebal ungu di kartu (diam) serupa tautan angka | `angka-kartu.spec.ts` E-42 (soal 1–3, semua kaki terbuka dan sesudah dikunci: tidak ada elemen non-kontrol di `.lembar` yang `--stempel`; kepala tetap `--stempel`) | `gaya.css`: `.angka-lembar` `--stempel` lagi · tebal 400 |
| **M3.11 K-9** Bukti teknis terkuat terkubur di dasar pembukaan; kalimat baru dengan angka diketik tetap (benar untuk DADA, bohong untuk ULTJ) | `jejak-naik.spec.ts` E-43 (angka kalimat = bagian jejak = berkas kasus, DADA ≠ ULTJ; tautan membuka lipatan dan menggulir) · `jejak.test.ts` | `jejak.ts`: n = 10, m = 43 diketik · `Aplikasi.tsx`: tautan tidak membuka `details` · `::after` bidang sentuh dicabut (E-12e) |
| **M3.11 K-12** Lembar putih larut di meja terang; `border-color` kritikus menimpa garis kepala ungu | `tepi-lembar.spec.ts` E-44 (sisi = `--garis-tegas` terang / `--garis` gelap; kepala = `--stempel` = patokan) | `gaya.css`: `border-color` sesudah `border-top` · `--tepi-lembar` terang `--garis` · baris istilah `--garis` |
| **M3.11 R-04** Kaki kartu berupa baris tulisan yang tidak terbaca sebagai pintu (soal 1: 10/27 sesi membukanya) | `kaki-tombol.spec.ts` E-45 (button, tepi tertulis 1,5 px + terhitung = pembanding, `--stempel`, 3 px, lebar ≥ 85 %, jarak 12/12/12, ≥ 44, panah berputar; buka → tutup → buka), E-46 (kaki produk = kaki kedua patokan) | `gaya.css`: `border: 0` · `margin: 0; width: 100%` · tepi 1 px · selektor putar panah · sudut 2 px (E-46) · `sumber.ts`: label lama · patokan: kaki lama / label lama (E-46) |
| **M3.11 D-8** `og:image` relatif (Threads/WhatsApp tanpa gambar), `theme-color` gelap palet lama | `kepala-halaman.spec.ts` E-35 (nilai persis `og:image`, `og:url`, `twitter:card`, theme-color) | `index.html`: `og:image` relatif · `og:url` dicabut · theme-color `#0f1524` · `summary` |

Tiga tes lama ikut berubah di M3.9, dan ketiganya dibuktikan masih menggigit:
`umpan-tekan.spec.ts` (C-4) kini mencari soal beristilah dari berkas kasus — soal 1
pemanasan tidak punya baris istilah — dan menekan kontrolnya di tengah layar,
bukan di balik bilah bawah; `pelacak.spec.ts` E-06i pindah ke 360 × 1250 karena
layar pertama varian A sengaja tidak pernah muat sejendela (kaki di bawah
lipatan), dan layar terpendek kini soal 1; `riwayat.spec.ts`, `permainan.spec.ts`,
dan `asal-tidak-aman.spec.ts` mengenali layar pertama dari judulnya di berkas
kasus, bukan dari kalimat "Kita mundur ke".

Dua tes lama ikut berubah di M3.10, dengan alasannya di komentar tesnya:
`sobekan.spec.ts` E-05 membaca tanggal garis waktu yang kini berhuruf kalimat
("9 Okt 2025", peran meta) dan tetap menuntut tanggal yang terurai dan > T;
`bantu/ukur.ts` E-12e menghitung bidang sentuh sebagai kotak **ditambah**
`::after` absolut yang menjorok (tautan angka tidak lagi berbantalan sebaris) —
tanpa `::after` hitungannya kembali ke kotak dan tesnya merah lagi.

Dua tes lama ikut berubah di M3.11, dengan alasannya di komentar tesnya:
`keping-merah.spec.ts` E-31 membandingkan nama hari dengan `--merah-teks`
(mode gelap kini punya merah teks sendiri, `#F0707A`; patokan gelap ikut
diperbarui, jadi perbandingan dengan patokan tetap berdampingan);
`kepala-halaman.spec.ts` E-35 menuntut `og:image`/`og:url` absolut dan
theme-color gelap `#191816` (gambarnya tetap diperiksa dari build lokal);
tidak ada ambang posisi yang diubah — kaki kartu menambah tepat 12,0 px per
lembar dan E-30/E-25/E-19/E-38 tetap hijau dengan angka lamanya.

**Tepi 1,5 px di Chromium.** Chromium membulatkan lebar tepi antara 1 dan 2 px
CSS ke bawah menjadi 1 px (terhitung dan terlukis). E-45 karena itu memeriksa
nilai yang DITULIS di lembar gaya (CSSOM, singkatan `border`) dan menuntut
nilai terhitung sama dengan pembanding ber-tepi 1,5 px di halaman yang sama.

### Tangkapan layar untuk pemilik (M3.10 D-10) dan arsip reviewer (M3.11 D-7)

```bash
node e2e/bantu/potret.ts              # -> .cache/e2e/layar-m310/
node e2e/bantu/potret.ts layar-m311   # -> .cache/e2e/layar-m311/
```

Terang dan gelap, 360 × 640 dan 1280 × 800, kedua kasus, tujuh layar (pertama,
soal 1 dibuka, soal 1 dikunci, pembukaan atas, pembukaan penuh, akhir, terima
kasih) → `.cache/e2e/<folder>/<skema>-<lebar>/<kasus>/NN-nama.png`. Folder itu
**tidak** dikosongkan `globalSetup` (yang dikosongkan hanya `layar/` dan
`data/`). Tanpa server dan tanpa jaringan: build tanpa pengumpul ke
`.cache/e2e/dist-potret`, semua permintaan dipenuhi dari cakram lewat
`page.route`, yang lain dibatalkan dan dilaporkan. Gambar pratinjau tautan
dibuat dengan cara yang sama oleh `node alat/buat-pratinjau.ts`.

## Menambah tes ketika cacat baru ditemukan

1. **Tulis tesnya dulu, dan pastikan ia merah.** Kalau ia langsung hijau,
   cacatnya belum tertangkap — tesnya yang perlu diperbaiki, bukan produknya.
2. Taruh di `e2e/<nama>.spec.ts`. Pembantu ada di `e2e/bantu/`:
   `main.ts` (langkah permainan, ketukan, tangkapan layar, penunggu),
   `peristiwa.ts` (membaca berkas pengumpul), `kasus.ts` (membaca berkas kasus),
   `ukur.ts` (tata letak dan kontras), `bundel.ts` (isi hasil build),
   `png.ts` (membaca piksel tangkapan layar tanpa dependensi).
3. Daftarkan berkasnya di proyek yang cocok di `playwright.config.ts`
   (`testMatch` / `testIgnore`).
4. Perbaiki produknya. Jalankan lagi: harus hijau.
5. **Sabotase.** Rusak kode produk yang baru saja diperbaiki, jalankan lagi,
   dan pastikan tesnya merah. Pulihkan dengan `git checkout -- <berkas>` dan
   pastikan `git status --short` bersih.
6. Tambahkan barisnya ke tabel di atas.

### Tes yang menunggu berkas pengumpul bisa merah untuk alasan yang salah (M3.8)

Pengumpul SKEMA 3 menolak kiriman yang membawa bahan mentah (pertahanan
kedua). Tes privasi yang MENUNGGU berkas pengumpul akan merah karena
"peristiwa tidak tiba" — dan asersi yang sebenarnya dituju tidak pernah
berjalan. E-26 karena itu menunggu **antrean kirimannya sendiri**
(`page.route('**/e')`, lalu `rute.continue()`), dan asersi INV berada di
depan asersi lain. Badan kiriman `tutup` (lahir di `pagehide`) tidak bisa
dipotret dengan cara ini — halamannya sudah pergi — jadi `tutup` diperiksa
lewat berkas pengumpul.

### Halaman tersembunyi ditirukan, bukan dilakukan (M3.8)

Chromium headless tidak pernah menyembunyikan halamannya. E-22/E-24/E-26
menimpa `document.visibilityState` di halaman lalu menyalakan
`visibilitychange` — urutan persis yang dilihat pendengar aplikasi di ponsel.
Lama tersembunyi yang diasersikan diukur dari jam halaman sendiri, dan
selangnya ditunggu ≥ 400 ms lewat `expect.poll` atas `Date.now()` halaman —
bukan `waitForTimeout`: yang diukur memang waktu, jadi waktu harus lewat.

### Aturan menulis tes di sini

- **Jangan pernah `waitForTimeout` atau `setTimeout` sebagai penunggu.** Pakai
  `expect()` yang menunggu sendiri, `expect.poll`, atau penunggu berbasis
  frame (`tungguGulirBerhenti`). `retries: 0`, jadi tes yang menunggu jam akan
  hijau di satu mesin dan merah di mesin lain.
- **Menunggu gulir halus: pegang elemennya sekali.** Pencarian selektor yang
  berulang **membatalkan** gulir halus Chromium — terukur di mesin ini, dan
  hampir membuat saya melaporkan cacat produk yang tidak ada. Pakai
  `tungguMasukLayar()` di `bantu/main.ts`, yang memegang elemennya lewat
  `elementHandle()` lebih dulu.
- **Selektor:** `getByRole` dan `getByText` dulu, lalu `data-uid`. Kelas CSS
  tidak pernah dipakai untuk *menemukan* elemen yang akan diketuk — hanya untuk
  *mengukur* gaya.
- **Ketukan sungguhan di proyek sentuh:** `ketuk()` memakai `locator.tap()`,
  bukan `click()`. Cacat kaki lembar lolos justru karena yang diuji "ketuk
  sekali", bukan jari yang mengetuk dua kali.
- **Tiap tes menyebut kasusnya.** Sejak ada lebih dari satu kasus, `/` memilih
  **acak**, dan seluruh rangkaian ini menyandingkan apa yang tampil di layar
  dengan isi berkas kasus. `buka()` karena itu menambahkan
  `&kasus=dada-2025-10-08` secara bawaan; `bukaTanpaKasus()` ada untuk tes yang
  justru ingin melihat keacakannya, dan `tandaiDimainkan()` untuk tes yang
  butuh keadaan akhir yang pasti (pesan penutup hanya tampil ketika tidak ada
  lagi kasus yang menunggu).
- **Sesi dikenali lewat penanda.** Tiap tes membuka `/?k=<8 karakter acak>`,
  lalu `tungguSatuSesi(penanda)` menemukan id sesinya dari peristiwa `mulai` di
  berkas pengumpul. Karena itu tes boleh berjalan paralel.
- **Angka penanda bukan pengukuran.** Jangan bandingkan `-1` yang berarti
  "elemennya tidak ada" dengan ambang seolah ia hasil ukur; periksa
  keberadaannya terpisah. Ini pernah membuat satu tes hijau atas halaman yang
  sudah rusak.
- **Mengaduk banyak kontrol: pegang, jangan menomori.** Kalau sebuah tes membuka
  banyak lipatan sekaligus, pakai `elementHandles()` dan periksa-lalu-ketuk
  lewat pegangan yang **sama**. `locator.nth(n)` menyelesaikan selektornya ulang
  di tiap pemanggilan, dan daftarnya tumbuh saat lipatan terbuka — indeks ke-n
  pada pembacaan pertama bukan elemen yang sama dengan indeks ke-n berikutnya.
  Itu hipotesis terkuat untuk satu kegagalan E-09a yang tidak terulang.
- **Asersi yang tidak pernah bisa gagal lebih buruk daripada tidak ada asersi.**
  Sebelum percaya sebuah penjaga, rusak kode yang dijaganya dan pastikan ia
  merah. `keping.top === 0` pernah lolos sebagai penjaga "gambar diambil saat
  halaman diam" — padahal keping itu `position: sticky; top: 0` dan selalu 0.
- **Kalau tes butuh viewport lain, ukur dulu, jangan cari angka yang hijau.**
  E-06i menguji layar yang muat satu jendela. Di 360 × 640 tidak ada satu pun:
  tinggi dokumennya 670 · 1491 · 1304 · 1635 · 2873 · 1261 px, dan layar
  pertama meleset 30 px. Tes itu memakai 360 × 760 — ukuran Android yang biasa —
  dan menyebutkan pengukurannya di komentar, supaya pembaca berikutnya tahu
  angka itu dari mana. Ia juga menuntut ada layar yang **tidak** muat di
  viewport yang sama, sehingga subyek dan pembandingnya ada di satu tes, dan
  merah kalau tidak ada satu pun layar yang muat — hijau atas nol subyek adalah
  hiasan, bukan penjaga.
- **Gulir halus yang belum selesai adalah keadaan, bukan kedipan.** E-15b lahir
  karena menekan "Lanjut" *selagi* layar masih meluncur membawa sisa luncuran
  itu ke layar berikutnya. Sisanya kecil di mesin yang lengang (4–69 px
  terukur) dan besar di bawah beban — satu putaran penuh membuka layar
  pembukaan tepat di ringkasannya. Tes yang menunggu gulirnya selesai lebih
  dulu tidak akan pernah melihatnya; E-15b sengaja **tidak** menunggu.
- **Halaman yang animasinya belum selesai belum boleh diukur.** Layar pembukaan
  menutup ruang sobekan kalender setinggi 176 px (`tutup-ruang`). Mengukur
  posisi gulir sebelum itu selesai memberi dua jawaban berbeda untuk keadaan
  yang sama — terukur 401 px dan 227 px di mesin ini, selisihnya persis 176.
  Yang ditunggu animasinya (`Promise.all` atas `getAnimations()`), bukan jamnya.
- **`tap()` menggulir halamannya sendiri sebelum mengetuk.** Ia memusatkan
  sasarannya, dan berapa jauh berbeda tiap putaran. Tes yang bertanya "apakah
  ini terlihat dari tempat pemain mengetuk" harus mengembalikan posisi gulirnya
  lebih dulu; kalau tidak, yang diukur adalah guliran alat uji.
- **Ambang yang dibaca dari produk menjaga kesepakatan, bukan nilainya.**
  `bantu/ambang.ts` membaca konstanta dari teks sumber supaya tes dan produk
  tidak bisa berselisih tentang di mana batasnya. Tetapi tes yang **menghitung
  titik ujinya** dari angka itu akan ikut berpindah ketika angkanya berpindah:
  mengubah ambang balon melayang dari 0,5 menjadi 0,001 membuat E-19e tetap
  hijau, karena ia menggeser sendiri posisi gulirnya. Terukur waktu sabotase.
  Jadi setiap ambang yang dibaca begitu butuh **dua** penjaga: satu baris yang
  memaku nilainya ke angka patokan, dan satu asersi perilaku dengan pecahan
  tetap yang tidak bertanya kepada produk sama sekali.
- **Kotak yang bertindih belum tentu berarti tertutup.** "Balon tidak menutupi
  keping" diuji dengan `elementFromPoint` di beberapa titik di dalam keping,
  bukan dengan membandingkan kotak. Perbandingan kotak tetap hijau ketika
  guntingnya dicabut; yang menjawab "apa yang benar-benar ada di titik ini"
  tidak.
- **Tangkapan layar diambil saat halaman diam.** `simpanLayar()` menunggu
  gulirnya berhenti dan memeriksa `scrollY` tidak berubah selama gambarnya
  diambil. Gambar bahan review yang menyesatkan membuat orang mengejar cacat
  yang tidak ada.

## Cara reviewer menjalankan proyek `alpha`

Proyek `alpha` menjalankan satu permainan penuh terhadap **server alpha yang
sungguhan**. Ia tidak membaca berkas pengumpul mana pun dan memakai penanda
`?k=uji`, yang sudah dikecualikan dari ringkasan pemilik sehingga sesi reviewer
tidak ikut terhitung sebagai peserta.

Ia **tidak terdaftar sama sekali** kecuali alamatnya diberikan:

```bash
npx playwright test --list                     # tidak ada satu pun baris "alpha"
E2E_ALPHA_URL=https://alpha.example npx playwright test --project=alpha
```

Jalankan **hanya dengan izin pemilik**: di ujung alamat itu ada server yang
mengumpulkan data sungguhan, dan setiap putaran menambah satu sesi ke sana.
