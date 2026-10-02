# Pintu penyusun tampil dan terekam (M2d-12)

Kontrak: `.contracts/M-02d12-pintu-penyusun-terekam.md`. Branch `m2d12-penyusun`. Tidak ada panggilan LLM berbayar: semua yang tampil di sini berasal dari log jalan yang sudah terjadi (`eval/penyusun/<id>/aliran.jsonl`), diputar ulang tanpa model.

## 1. Apa yang tampil

Halaman `alat/penyusun/halaman/` (index.html, app.js, ringkas.js, gaya.css) melayani jalan langsung dan tayang ulang dengan jalur yang sama. Peristiwa `tahap` dari `/api/jalan/<id>/aliran` digambar oleh `tampilkanPeristiwa()` yang sama.

Di layar 1920×1080 (layar video) halamannya dua kolom.

**Kiri: aliran peristiwa.** Satu baris = satu peristiwa log, urut seperti terjadi.
- Kolom status berisi "✓ lolos", "✗ ditolak", "ditulis", "✗ tidak terbit", atau "Tahap n" untuk tahap tanpa putusan.
- Label baris berisi "Agen AI · versi n · omongan m · +waktu asli sejak baris sebelumnya". Di bawahnya teks log apa adanya; awalan "versi n · omongan m ·" dibuang karena sudah ada di label.
- Model, biaya langkah, dan total berjalan ikut tampil.
- Ada pembatas tiap versi baru.
- Di bawah aliran: kotak perkiraan biaya dan persetujuan, lalu Hasil (cap DRAF TERBIT / TIDAK TERBIT, draf seperti di layar pemain, catatan sesudah jalan), lalu Penyetuju.

**Kanan: papan yang menempel.** Garis kepalanya putus-putus, karena dalam bahasa desain produk putus-putus berarti "dihitung oleh kami" — papan ini memang dihitung dari log. Isinya:
- Urutan 7 tahap (data → 33 aturan → paket fakta → perkiraan & persetujuan → agen AI menulis, gerbang menguji → hasil → penyetuju), masing-masing "✓", "sekarang", "✗ berhenti (pagu)", "✗ tidak terbit", atau "tidak ada draf".
- Biaya nyata sejauh ini (28 px). Angkanya `total_usd` peristiwa terakhir; di akhir jalan dicocokkan ke `biaya_ledger_usd` peristiwa hasil.
- Pagu jalan, jumlah panggilan model, dan berapa kali ditolak gerbang.
- Tiga omongan: "lolos semua gerbang di versi n", "versi n: ditolak penebak", atau "berhenti di versi 9, belum lolos semua gerbang". Penolakan terakhir tetap tampil sampai omongan dikunci.
- Gerbang versi terkini beserta alasan singkat penolakan.

**Bilah Rekaman (hanya tayang ulang, menempel di atas).** Berisi "Rekaman jalan <id>, <tanggal>", jam WIB, konteks jalan ("jalan 7 dari 7 (1–6 tidak terbit)"), "tanpa panggilan model", dan penanda jeda yang sedang berjalan ("Dipercepat ×37: jeda asli 1 mnt 7 d, diputar 1,8 d").

Huruf: setiap peran teks produk naik satu anak tangga skala di ≥ 1200 px. Isi 20 px, meta 17 px, judul 28 px; teks utama ≥ 20 px CSS pada 1080p. Di ponsel (< 1200 px) satu kolom, papan di atas aliran, ukuran produk (isi 17, meta 14).

Fokus papan ketik terlihat (2 px `--stempel`). Gulir halus mati untuk `prefers-reduced-motion`, dan cap tidak dimiringkan.

## 2. Cara tayang ulang

```bash
npm run penyusun -- --tayang-ulang eval/penyusun/m2d11-tirt-7      # buka http://127.0.0.1:8790/
node alat/penyusun/rekam.mjs --jalan eval/penyusun/m2d11-tirt-7       # video 1920×1080 ke .context/videos/penyusun/
node alat/penyusun/rekam.mjs --jalan eval/penyusun/m2d11-tirt-7 --tangkap   # tangkapan untuk kritikus
```

- Server hanya membaca `aliran.jsonl`, `keadaan.json`, dan `paket.json` (keberadaan `hasil.json` dan `jejak-agen.json` dilaporkan). Ia memakai mesin pengganti yang tidak pernah memanggil apa pun.
- Semua POST (siapkan, mulai, sunting, uji ulang, setujui, tolak, ambil data) dan semua API selain status, potret jalan, dan aliran ditolak dengan 409 "Mode tayang ulang: ini rekaman …".
- Folder jalan tidak berubah; tes membandingkan sidik SHA-256 folder sebelum dan sesudah.
- Muat ulang halaman = putar dari awal. Tiap sambungan SSE diputar sendiri, dan `Last-Event-ID` melanjutkan dari nomor itu.

**Kesetiaan.** Baris `data:` setiap `event: tahap` adalah baris log itu sendiri, byte demi byte. Ia tidak diurai lalu disusun ulang, tidak diurutkan ulang, dan tidak ada angka yang dihitung ulang. Jeda diumumkan lewat peristiwa terpisah `event: tayang` (`menuju`, `asli_ms`, `putar_ms`, `jenis`, `faktor`), jadi isi peristiwa tidak tersentuh. Tesnya (`alat/penyusun/tayang-ulang.test.ts`):
- isi SSE = berkas untuk kedua jalan;
- sabotase salinan log ("panggilan":25 → 26) membuat pembanding menunjuk "baris 10 berbeda";
- sabotase kode: isi peristiwa 20 diubah → 3 merah; urutan dibalik → 5 merah.

**Catatan sesudah jalan** (`alat/penyusun/rekaman/catatan.json`) bukan bagian log. Halaman menampilkannya terpisah dengan judul "Catatan sesudah jalan (bukan bagian log ini)" dan menyebut sumbernya. Isinya: konteks jalan, siapa yang mengirim persetujuan, dan temuan sesudah jalan (audit Opus TIRT-7). Semua fakta dicek ke `keadaan.json` ketujuh jalan M2d-11 dan ketiga jalan M2d-10, serta ke `docs/bukti/lingkar-agen-pemula-audit.md` dan `docs/bukti/lingkar-agen-templat.md`.

## 3. Rumus jeda (tertulis, dites)

```
asli_i  = waktu_i − waktu_(i−1)               (stempel `waktu` log)
putar_i = min(1 800 ms, max(700 ms, asli_i / 12))
sesudah peristiwa `perkiraan`: putar = max(putar, 3 500 ms)   (kotak persetujuan sempat terbaca)
peristiwa pertama: 1 500 ms sesudah halaman tersambung
putar < asli → "Dipercepat ×round(asli/putar)";  putar > asli → "Diperlambat agar terbaca"
```

| jalan | peristiwa | waktu asli | waktu putar | jeda dipercepat |
|---|---:|---:|---:|---:|
| m2d11-tirt-7 (draf terbit, versi 8) | 47 | 11 mnt 25 d | 57,1 d | 30 (paling besar ×51); 16 diperlambat agar terbaca |
| m2d10-tirt-a2 (tidak terbit, versi 9) | 47 | 19 mnt 52 d | 54,4 d | 29 (paling besar ×118); 17 diperlambat agar terbaca |

## 4. Batas kejujuran

- **Penulis.** Draf disebut "ditulis agen AI (Runut Agent)". Tidak ada label yang menyebut manusia sebagai penulis; tes memindai halaman, catatan, dan kode server. "Manusia" hanya muncul untuk penyetuju dan suntingan, seperti di log.
- **Jalan yang tidak terbit** (m2d10-tirt-a2) tampil dengan:
  - cap TIDAK TERBIT;
  - langkah agen "✗ berhenti (pagu)", langkah hasil "✗ tidak terbit", langkah penyetuju "tidak ada draf";
  - baris henti "✗ berhenti — sebab: pagu";
  - angka pagu yang diurai dari log: "pagu milestone (semua jalan penyusun) US$1,5800; sudah terpakai US$1,4458 + panggilan berikutnya maks US$0,1845".

  Tes memastikan tidak ada "lulus" dan setiap "terbit" didahului "tidak". Teks log M2d-11 sendiri memakai "lulus" untuk gerbang rotasi; teks itu hanya ada di jalan yang terbit dan ditampilkan apa adanya.
- **Persetujuan dalam rekaman.** Tombol "Setujui dan jalankan agen", "Setujui draf ini", input pagu, dan panel penyetuju tetap di tempatnya seperti aslinya (D-1). Dalam tayang ulang semuanya tidak aktif: `disabled`, `aria-disabled`, garis putus abu-abu tanpa isian ungu, dan label "Rekaman, tidak aktif: …". Di sebelahnya ada "Rekaman jalan <id>, <tanggal>: persetujuan ini sudah tercatat di log …". Catatan juga menyebut bahwa di kedua jalan persetujuan dikirim oleh skrip jalan (`patokan:jalan`, `templat:jalan`) lewat API yang sama, bukan klik di halaman. Di panel penyetuju tertulis tebal "Belum ada putusan penyetuju manusia."
- **Keberhasilan TIRT-7 diberi konteks sejak detik pertama:** jalan ke-7 dari 7 (29 versi), jalan 1–6 tidak terbit. Di hasil, audit Opus mencatat: tanpa kartu pun Opus memilih kunci 4/4 di ketiga omongan, jadi lulus patokan pra-registrasi tidak berarti tidak tertebak model kuat.
- **Biaya.** "Biaya nyata sejauh ini" = `total_usd` dari log, dan di akhir dicocokkan ke biaya ledger yang tercatat di peristiwa hasil. Tayang ulang tidak membaca ledger mesin ini dan tidak menampilkan kunci maupun pagu milik pemilik saat ini.
- **Yang bukan isi log:**
  - jeda putar (diumumkan);
  - papan (dihitung dari peristiwa, bergaris putus-putus);
  - catatan sesudah jalan (berlabel dan bersumber);
  - tata letak.

## 5. Kritikus desain

Kritikus adalah subagent Opus terpisah, yang hanya membaca. Ia menerima tangkapan 1920×1080 (dsf 1) dan 375 px (dsf 2) kedua jalan, ditambah brief kontrak, `docs/desain.md`, dan `web/src/gaya.css`. Keputusan rupa mengikuti kritikus ditambah alasan tertulis; pemilik tidak diminta menilai.

**Ronde 1 — tidak siap direkam (7 P1, 3 P2, 2 P3).** Semua diterima, kecuali P1-5 yang diterima sebagian.

| butir | temuan kritikus | keputusan dan alasan |
|---|---|---|
| P1-1/2 | Jalan B tidak terbit, tetapi langkah agen ✓ hijau dan "tidak ada draf" hijau. | Diterima. Langkah agen "✗ berhenti (pagu)", hasil "✗ tidak terbit", penyetuju redup. Centang hijau di jalan gagal menyesatkan. |
| P1-3 | Gerbang versi 9 hijau semua di samping "tidak terbit". | Diterima dengan perubahan: baris henti dari peristiwa hasil. Kritikus tidak disebut "tidak dipanggil", karena log hanya menyatakan panggilan berikutnya tidak dikirim. |
| P1-4 | Keberhasilan TIRT-7 tampil tanpa 6 jalan gagal sebelumnya. | Diterima. Konteks dari `catatan.json` tampil sejak detik pertama (dicek ke `keadaan.json` jalan 1–7). |
| P1-5 | Tombol ungu aktif bisa terbaca sebagai klik manusia; kritikus ingin tombol tidak dirender. | Diterima sebagian. Kontrak D-1 mewajibkan tombol dan panel penyetuju "tetap tampil seperti aslinya", jadi tombol tetap di tempatnya tetapi `disabled`, bergaris putus abu-abu, dan berlabel "Rekaman, tidak aktif: …". Sunting dan tolak diganti kalimat. Kritikus menerima ini di ronde 2 dengan dua syarat (`aria-disabled`; kalimat "Belum ada putusan penyetuju manusia." di atas tombol); keduanya dipenuhi. |
| P1-6 | Penanda "dipercepat" kecil dan redup. | Diterima. Ukuran isi, tebal, faktor di depan. Ini penanda kejujuran, jadi harus terbaca dari jarak video. |
| P1-7 | Penolakan hilang dari papan begitu versi baru mulai. | Diterima. Baris "terakhir ditolak" per omongan tetap ada sampai omongan dikunci. |
| P2-8 | "Berhenti karena pagu" bertentangan dengan US$0,1195 dari pagu US$0,25. | Diterima di ronde 2: angka pagu milestone diurai dari kalimat log. |
| P2-9 | Cap "TERBIT" bisa terbaca sudah dipasang. | Diterima: "DRAF TERBIT". |
| P2-10, P3-11/12 | Pembatas versi isi 600, "Tahap n", "✓ kunci", glyph pensil, kepala ungu `.bagian`, ukuran kontrol, catatan teks log apa adanya, `scroll-margin-top`. | Diterima semua. Kepala ungu utuh berarti sumber resmi menurut `docs/desain.md`, jadi bagian alat memakai `--garis-tegas`. |

**Ronde 2 — tidak siap (2 P1: B1 papan jalan B terpotong di 1080; B2 kata "ditolak" dipakai untuk berhenti karena pagu).** Diterima semua:
- papan diringkas: "terakhir ditolak" dibuang bila omongan sudah berhenti, dikunci, atau mengulang baris utama; alasan satu baris; baris "ditulis" digabung;
- status "✗ tidak terbit" dan "✗ berhenti";
- konteks singkat di bilah Rekaman yang menempel;
- angka pagu dari log;
- garis kiri netral (strip warna dilarang);
- "✓ draf terbit";
- `input.masukan-rekaman` bergaris putus.

**Ronde 3 — siap direkam di 1920×1080, tanpa P1.** Dua P3 tersisa:
1. Ellipsis CSS di papan memotong di tengah kata. Pemotong JS memotong di batas kata, tetapi CSS `text-overflow` memotong menurut lebar piksel. Tidak diubah; teks lengkap ada di aliran.
2. Di 375 px konteks singkat ikut tersembunyi. Sudah diperbaiki (`.rekaman-konteks` tidak disembunyikan), tetapi tidak dicek ulang lewat ronde kritikus.

## 6. Rekaman

Perekam `node alat/penyusun/rekam.mjs --jalan <folder jalan>` menjalankan server tayang ulang dengan `--jam-virtual` dan satu Chromium (`launchServer`, PID dicatat). Viewport 1920×1080, deviceScaleFactor 1, mode terang. Tiap bingkai:
1. `POST /api/tayang/maju` sebesar tepat 1/30 detik;
2. tunggu halaman menggambar peristiwa yang jatuh tempo (dataset `nomor`, permintaan berjalan = 0, dua requestAnimationFrame);
3. potret PNG. Bila tanda halaman (nomor, gulir, tinggi, teks jeda) tidak berubah, potret sebelumnya dipakai ulang.

PNG dialirkan ke ffmpeg (`libx264 -preset slow -crf 16 -pix_fmt yuv420p -r 30`). Karena waktu tidak berjalan sendiri, laptop yang lambat tidak menghilangkan bingkai. Gulir dikendalikan perekam: halaman memberi tanda `PENYUSUN_GULIR_LUAR`, dan perekam menggulir mengikuti dasar bagian tahapan, lalu sesudah tayang menelusuri Hasil sampai Penyetuju. Pemeriksaan kejujuran berjalan tiap detik video: penanda Rekaman terlihat, tanpa frasa penulis manusia, dan tanpa "lulus"/"terbit" tanpa "tidak" di jalan yang tidak terbit.

| berkas (`.context/videos/penyusun/`, tidak di-commit) | durasi | bingkai | potret unik | ffprobe |
|---|---:|---:|---:|---|
| `penyusun-m2d11-tirt-7.mp4` | 80,43 d (tayang 57,1 d) | 2.413 | 1.160 | h264 High, yuv420p, 1920×1080, avg 30/1, CRF 16 (SEI x264), 13,2 MB |
| `penyusun-m2d10-tirt-a2.mp4` | 72,33 d (tayang 54,4 d) | 2.170 | 1.008 | h264 High, yuv420p, 1920×1080, avg 30/1, CRF 16, 12,9 MB |

- Lembar kontak: `kontak-penyusun-<id>/lembar-01…03.png` (tiap 2 d, 4×4, 480×270, cap waktu Consolas, seperti `pasca.sh`). Ringkasan ffprobe: `penyusun-<id>.ffprobe.json`.
- Bingkai dicek mata di 3, 30, 56, 62, 72, 79 d (TIRT-7) dan 20, 50, 66, 71 d (A-2) (`periksa-bingkai/`): teks tajam, bilah Rekaman utuh, tidak ada yang terpotong.
- Satu cacat kosmetik: di ±2 d terakhir rekaman A-2, papan menempel ikut naik di dasar halaman, sehingga baris "1 Data dimuat" tersembunyi di bawah bilah.
- Naskah bagian pemilik (mengetik kode dan menyetujui, ≤ 60 d, klik demi klik, dengan pilihan palsu/sungguhan): `.context/videos/penyusun/naskah-pemilik.md`.

Pilihan jalan (b): `m2d10-tirt-a2`, bukan jalan pemanasan. Soal pemanasan M2d-11 ditulis lewat `patokan:pemanasan`, bukan lewat pintu, jadi tidak punya `aliran.jsonl`. Sebaliknya, A-2 memperlihatkan paling banyak putaran ditolak→diperbaiki:
- 6 penolakan penebak di omongan 2, rencana diganti dua kali;
- versi 8 ditolak gerbang kode (ANGKA_TANPA_RUJUKAN), versi 9 lolos;
- berakhir TIDAK TERBIT karena pagu, yang sekaligus menguji tampilan jujur jalan yang gagal.

## 7. Gerbang dan batas

- Tes baru:
  - `alat/penyusun/tayang-ulang.test.ts` (11): tes kesetiaan, sabotase, jam virtual, dan penjaga 409;
  - `alat/penyusun/kejujuran.test.ts` (11): tes kejujuran atas `ringkas.js` dan kedua log;
  - `server.test.ts` menyesuaikan modul ES dan `ringkas.js`.
- Gerbang akhir: §9 kontrak.
- `npm run periksa:desain` (gerbang produk, `web/src/gaya.css`) bersih. Bila dijalankan atas `alat/penyusun/halaman/gaya.css`, ia melaporkan 30 `SKALA_HURUF` dan 1 `MESIN_TIK_DI_LUAR_DAFTAR`, dan ini dicatat, bukan disembunyikan:
  - `SKALA_HURUF` muncul karena pemeriksa tidak mengurai `var(--isi/--meta/--judul)`. Nilainya 14/17/20/28, semuanya di skala.
  - Mesin tik dipakai untuk kode aturan dan id model (rincian teknis).
  - Pemeriksa ada di `alat/periksa-desain.ts`, di luar jalur boleh, jadi tidak diubah.
- Skrip npm `penyusun:rekam` tidak ditambahkan. Daftar skrip dijaga `factory/pondasi.test.ts`, yang ada di jalur terlarang; perekam dijalankan dengan `node alat/penyusun/rekam.mjs`.
- Batas:
  - E2E `e2e/penyusun.spec.ts` (E-60) tidak dijalankan di laptop tua. Selektornya dipertahankan, tetapi perlu dijalankan reviewer.
  - Tayang ulang hanya untuk jalan yang punya `aliran.jsonl`.
  - Rumus jeda adalah pilihan tampilan, bukan data.
  - Papan adalah ringkasan hitungan dari log. Bila format judul peristiwa berubah, `uraiJudulAgen` perlu ikut diubah; judul yang tidak dikenali tetap tampil apa adanya di aliran.
