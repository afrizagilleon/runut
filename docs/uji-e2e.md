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
| `.cache/e2e/layar/<proyek>/NN-nama.png` | tangkapan layar tiap tahap permainan |
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
| `alpha` | **hanya bila `E2E_ALPHA_URL` diset** | 360 × 640 sentuh | E-10 dengan `?k=uji` |

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

## Menambah tes ketika cacat baru ditemukan

1. **Tulis tesnya dulu, dan pastikan ia merah.** Kalau ia langsung hijau,
   cacatnya belum tertangkap — tesnya yang perlu diperbaiki, bukan produknya.
2. Taruh di `e2e/<nama>.spec.ts`. Pembantu ada di `e2e/bantu/`:
   `main.ts` (langkah permainan, ketukan, tangkapan layar, penunggu),
   `peristiwa.ts` (membaca berkas pengumpul), `kasus.ts` (membaca berkas kasus),
   `ukur.ts` (tata letak dan kontras), `bundel.ts` (isi hasil build).
3. Daftarkan berkasnya di proyek yang cocok di `playwright.config.ts`
   (`testMatch` / `testIgnore`).
4. Perbaiki produknya. Jalankan lagi: harus hijau.
5. **Sabotase.** Rusak kode produk yang baru saja diperbaiki, jalankan lagi,
   dan pastikan tesnya merah. Pulihkan dengan `git checkout -- <berkas>` dan
   pastikan `git status --short` bersih.
6. Tambahkan barisnya ke tabel di atas.

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
