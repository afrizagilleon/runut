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
- **Keberhasilan TIRT-7 diberi konteks sejak detik pertama:** jalan ke-7 dari 7 (29 versi), jalan 1–6 tidak terbit. Di hasil, catatan audit Opus memakai audit satu soal per penguji (M2d-14 mengoreksi angka lama yang dibundel): tanpa kartu omongan 1 1/4, omongan 2 4/4 (tertebak), omongan 3 2/4. Lulus patokan pra-registrasi tidak menjamin tidak tertebak model kuat.
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

## 8. M2d-14 — alur penuh terekam (mode demo)

Kontrak: `.contracts/M-02d14-alur-penuh-terekam.md`. Branch `m2d14-alur`. Isian reviewer: jalan `eval/penyusun/m2d13-opus-2`, draf `akhir`, suntingan omongan 2, pagu uji ulang US$0,15.

### 8.1 Cara menjalankan

```bash
npm run penyusun -- --demo eval/penyusun/m2d13-opus-2 --draf akhir \
  --suntingan alat/penyusun/rekaman/suntingan-m2d13-opus-2.json            # tanpa biaya model
npm run penyusun -- --demo … --suntingan … --pagu-uji-ulang 0.15           # gerbang AI diuji ulang sungguhan
npm run penyusun:rekam-alur -- --demo eval/penyusun/m2d13-opus-2 \
  --suntingan alat/penyusun/rekaman/suntingan-m2d13-opus-2.json            # video ke .context/videos/penyusun/
```

### 8.2 Apa yang hidup, apa yang rekaman

| bagian | sumber | penanda di layar |
|---|---|---|
| Tahap 1–4: kode TIRT → usulan hari dari cache → 33 aturan → paket → perkiraan | hidup, tanpa biaya model, folder sementara (tidak ke `eval/`). Paket hidup harus sama persis (sha256) dengan `paket.json` jalan rekaman; selain itu tidak ada perkiraan dan persetujuan ditolak 409 | bilah menempel **Langsung** · "Tahap 1–4 dijalankan sekarang"; kotak persetujuan: "Mode demo: klik ini tidak memanggil model" |
| Klik setuju | tidak memanggil model; server memeriksa urutan tahap & paket, lalu menutup aliran hidup | baris transisi "Bagian agen diputar dari jalan nyata m2d13-opus-2 (biaya asli US$0,4080)." + bilah **Rekaman jalan m2d13-opus-2, 3 Okt 2026** |
| Tahap agen + hasil + catatan sesudah jalan | baris `aliran.jsonl` apa adanya (dites byte demi byte); tempo demo: rumus jeda M2d-12 dengan min 550 ms, batas 1,25 d; tiap jeda diumumkan "Dipercepat ×N" | bilah tetap **Rekaman** sampai panel penyetuju masuk layar |
| Penyetuju | hidup: tiap suntingan dicatat (dari → ke) dan gerbang KODE diuji ulang langsung | bilah **Langsung** · "Penyetuju bekerja langsung"; catatan siapa memerankan penyetuju |
| Gerbang AI uji ulang | sungguhan dengan `--pagu-uji-ulang` (sekali); hasilnya disimpan (`alat/penyusun/rekaman/uji-ulang/<jalan>/<sidik>.jsonl/.json`) dan diputar tanpa panggilan bila teks omongan sama (sidik sha256) | bilah **Rekaman · Uji ulang gerbang AI sungguhan, <waktu>**; lencana "Rekaman" di tiap blok uji ulang |
| Putusan | hidup: Setujui (hanya bila semua lolos) atau Tolak dengan alasan → satu berkas `eval/penyusun/<jalan>/persetujuan-demo.json` | cap DISETUJUI / TIDAK DISETUJUI (DEMO) + ringkasan alur |

Tanpa `--pagu-uji-ulang` dan tanpa hasil tersimpan, kotak gerbang AI menulis "Gerbang AI belum diuji ulang." dan putusan setuju tidak mungkin.

### 8.3 Gerbang yang diuji ulang

- **Kode** (`gerbangKodeDemo`): `periksaKodeBebas` — sama persis dengan langkah 1 mesin bebas M2d-13 (validator, gerbang G, gaya, huruf, kembar, penilaian, mirip, artefak, kalender A-2, detektor D1–D9 ambang M2d-11, angka-di-kartu, label & umpan balik, sudut, anti-salin) + validator seluruh draf (di mesin bebas dijalankan sesudah ketiga omongan lolos; di demo lebih dulu karena gratis — urutan tidak mengubah putusan).
- **AI** (`ujiGerbangAi`): tebak rotasi tanpa kartu (24 panggilan) → pembaca kartu r0+r2 → kritikus GLM (tidak menjawab → sekali lagi); berhenti di gerbang pertama yang menolak — urutan dan putusan mesin bebas.
- **Pagu** ditegakkan `PencatatBiaya` sebelum SETIAP panggilan: biaya nyata ledger bertag `m2d14/` + perkiraan maksimum panggilan itu ≤ pagu (≤ US$0,15, juga pagu milestone `m2d14/`), dan ≤ `LLM_PAGU_USD`. Tag `m2d14/` (bukan `penyusun/m2d13-…`) supaya biaya demo tidak masuk laporan M2d-13.
- **Amandemen teknis:** `max_tokens` kritikus 16.000 saat uji ulang demo. Setelan M2d-11 (≈ 40.000 token) membuat perkiraan maksimum SATU panggilan kritikus ≈ US$0,185 > pagu US$0,15, jadi kritikus tidak akan pernah dikirim. 16.000 = 1,7× token keluar kritikus terbesar di jalan ini (9.166). Effort, ambang penalaran, prompt, penyedia tetap. (Di uji ulang nyata, kritikus tidak sempat dipanggil: penebak menolak dulu.)

### 8.4 Suntingan penyetuju dan hasil uji ulang (omongan 2)

Berkas `alat/penyusun/rekaman/suntingan-m2d13-opus-2.json`. Penyetuju diperankan reviewer (agen Claude, mewakili pemilik); suntingan ke-2 dan ke-3 adalah usulan eksekutor (agen Claude) dari alasan gerbang (isian reviewer: maks 2 suntingan tambahan). Semua diketik oleh perekam (blok berubah dipilih, dihapus, lalu diketik huruf demi huruf; ±14 huruf/d).

| putaran | isi | gerbang kode | gerbang AI (sungguhan) |
|---|---|---|---|
| 1 (reviewer) | pesan tanpa Rp48/Rp106; a "kartu hanya mencatat selisih Rp58"; b "kartu hitungan mencatat 2,21 kali lipat" (kunci, tetap b); c "2,21 kali lipat itu dihitung sejak awal tahun"; d "bertahap selama 9 hari bursa" | **ditolak**: ANGKA_TANPA_RUJUKAN & angka-di-kartu (9 tidak ada di kartu omongan ini), D9 (58/2,21/2,21/9 tidak urut), D5 (kunci "pusat": 5 unsur bersama vs 3), validator seluruh draf KUNCI_SERAGAM (b, b, b) | tidak dijalankan (kode dulu) |
| 2 (eksekutor) | b "mencatat" → "menyebut" (D5); d tanpa angka, "bertahap, bukan sekaligus" (angka/D9); tukar isi b ↔ c → kunci c (KUNCI_SERAGAM; menyimpang dari "kunci tetap b" karena gerbang menuntutnya) | lolos | **ditolak penebak**: pesan+pilihan kunci 11/12; pilihan saja DeepSeek & GLM ≥ 3/4 rotasi. US$0,010248 |
| 3 (eksekutor, terakhir) | dua pilihan "Betul" setara, hanya beda tanggal di kartu: b "…dihitung sampai hari ini", c (kunci) "…dihitung sampai kemarin"; umpan balik b dan satu kalimat penjelasan disesuaikan | lolos | **ditolak penebak**: pesan+pilihan 8/12; pilihan saja GLM; pesan+pilihan DeepSeek & GLM ≥ 3/4. US$0,011177 |

**Hasil: omongan 2 MASIH DITOLAK** sesudah semua suntingan yang diizinkan; penyetuju menolak dengan alasan; `persetujuan-demo.json` berisi putusan "ditolak". Tidak ada yang dipasang ke `cases/`.

Biaya: ledger 3.125 → 3.175 baris; kumulatif US$11,246187 → US$11,267611 (+US$0,021425; 50 entri `m2d14/`, semuanya `usage.cost`; perkiraan maksimum per panggilan terbesar US$0,0144).

### 8.5 Koreksi catatan audit (D-3)

`alat/penyusun/rekaman/catatan.json` kini memakai audit satu soal per penguji (`docs/bukti/lingkar-agen-pemula-audit.md` bagian "Ulang"): TIRT-7 omongan 1 1/4, omongan 2 4/4 (tertebak), omongan 3 2/4. Catatan baru m2d13-opus-2: omongan 1 4/4 tertebak (sinyal, bukan patokan), omongan 3 1/4; penilai mutu Opus 8,83 (sekeluarga dengan penulis — disebut). Kalimat lama dari angka dibundel kini terlarang (pola `FRASA_LAMA` di `alat/penyusun/kejujuran.test.ts`; juga diperiksa perekam tiap detik).

### 8.6 Kritikus (subagent Opus terpisah, hanya membaca; lembar kontak + bingkai penuh + transkrip)

Selera diputuskan kritikus + alasan tertulis; pemilik tidak diminta menilai.

**Putaran 1 (ambilan r1, 139,3 d) — sutradara: tidak siap; juri Track 01: tidak siap.**

| temuan | dari | keputusan dan alasan |
|---|---|---|
| 33–41 d penanda sudah "Langsung" padahal layar masih log/hasil/catatan rekaman (P1) | keduanya | **Diterima.** Bilah tetap "Rekaman … Log selesai diputar." sampai panel penyetuju masuk layar (IntersectionObserver); perekam memeriksa fase "hasil" wajib penanda Rekaman. Ini persis kegagalan yang disebut kontrak. |
| Hasil uji ulang tersimpan tampil di bawah "Langsung"; label kecil (P1/P2) | keduanya | **Diterima.** Bilah khusus uji ulang (hanya data uji itu) + lencana "Rekaman · Uji ulang n · waktu" ukuran isi di tiap blok. |
| "Penyetuju manusia" padahal suntingan dari reviewer/eksekutor agen, diketik otomatis (P1) | juri | **Diterima.** Judul halaman (mode demo), panel penyetuju, dan berkas suntingan menyebut agen Claude & "diketik otomatis oleh perekam". |
| Akhir terlihat sebagai kegagalan; perlu kartu penutup (P1) | juri | **Diterima.** "Ringkasan alur ini" dari log/catatan/keadaan: jalan agen (biaya asli, 0 dari 6 jalan M2d-13 terbit), putaran penyetuju, penolakan gerbang, biaya uji ulang, putusan. |
| Panel kanan basi (gerbang versi 2 · omongan 3 hijau) di fase penyetuju (P2) | keduanya | **Diterima.** "Penyetuju · omongan 2" (kode, AI, putusan) + baris biaya uji ulang. |
| Dropdown bawaan terbuka; klik tak terlihat; layar melompat sesudah simpan (P2) | sutradara | **Diterima.** Nilai pilihan diganti lewat kode + cincin penunjuk 52 px; jangkar gulir; pilihan "Bagian" diingat. |
| Jeda alasan tolak dan 11/12 terlalu pendek; log agen terlalu cepat (P2) | keduanya | **Diterima sebagian.** +1,4 d / +1,5 d; tempo log min 550 ms, batas 1,25 d. Tidak lebih lambat lagi: batas 150 d. |
| Alasan berhenti kabur (pagu jalan vs milestone) (P2) | juri | **Diterima.** Langkah 5 "✗ berhenti (pagu milestone)". |
| Teks terpotong "meng"; markup mentah; id jalan bertanggal UTC; potongan penyetuju mulai terlalu awal (P3) | keduanya | **Diterima.** Potong di batas kata; pratinjau "Tampil ke pemain"; kalimat folder sementara; potongan mulai saat panel masuk layar. |
| Pilih semua lalu ketik ulang (P3) | sutradara | **Ditolak.** Menambah ±25 d (batas 150 d) dan menyembunyikan apa yang benar-benar diubah; mengetik per blok berubah = diff yang dicatat. |

**Putaran 2 (ambilan r2, 144,5 d) — sutradara: SIAP; juri Track 01: SIAP.** Tidak ada P1. Sisa P2/P3, semuanya diterima untuk ambilan akhir:
- pemilih tukar tampil a ↔ c saat klik → pilihan tukar diingat, diisi terlihat ≥ 1 d sebelum klik (sutradara);
- hasil uji ulang teks lama tampak berlaku untuk teks baru → panel kanan "belum diuji ulang untuk teks ini"; blok lama diberi keterangan "untuk teks sebelumnya (sudah diganti)" (sutradara);
- "Tiga omongan" basi untuk omongan 2 → "disunting penyetuju: …" (keduanya); ikon netral "—" (sutradara);
- ringkasan terlalu singkat → 8 d (juri);
- kalimat putusan menyiratkan gerbang menangkap semua → baris "Batas gerbang: omongan 1 lolos semua gerbang, tetapi Opus tetap menebak kuncinya tanpa kartu 4/4" dari `catatan.json` (juri);
- "(diperankan agen Claude)" dan total biaya model alur US$0,4294 di ringkasan (juri);
- langkah 7 "draf tidak terbit" (juri; kata "tidak ada draf terbit" ditolak tes kejujuran karena "terbit" tanpa "tidak" di depannya).

### 8.7 Rekaman (`.context/videos/penyusun/`, tidak di-commit)

Perekam `npm run penyusun:rekam-alur` (`alat/penyusun/rekam-alur.mjs`): server demo `--jam-virtual` TANPA `--pagu-uji-ulang` (tidak mungkin ada panggilan berbayar), satu Chromium 1920×1080 dsf 1, tiap bingkai = jam maju tepat 1/30 d, PNG → ffmpeg libx264 CRF 16 yuv420p 30 fps. Ketikan per huruf (±14 huruf/d), blok yang berubah dipilih lalu dihapus (diff token, rujukan `[[…]]` utuh). Cincin penunjuk = alat bantu perekam (bukan isi halaman). Pemeriksaan kejujuran tiap detik video: penanda Langsung/Rekaman terlihat; fase agen & hasil wajib "Rekaman jalan …" + kalimat transisi; uji ulang tersimpan tidak di bawah "Langsung"; tanpa "ditulis manusia", tanpa kalimat audit lama, tanpa "draf terbit".

| berkas | durasi | ffprobe |
|---|---:|---|
| `penyusun-alur-penuh.mp4` (ambilan akhir) | **148,53 d** (4.456 bingkai, 1.631 potret unik) | h264 High yuv420p 1920×1080, r = avg = 30/1, CRF 16 (SEI x264), 34,0 MB |
| `penyusun-alur-penuh-input.mp4` | 15,30 d (0 → klik setuju +1 d) | sama, CRF 16 |
| `penyusun-alur-penuh-agen.mp4` | 29,37 d (13,8 → 43,1 d: transisi, log, hasil, catatan) | sama |
| `penyusun-alur-penuh-penyetuju.mp4` | 105,40 d (43,1 d → akhir) | sama |

- Transkrip per detik untuk penulis naskah: `alur-penuh-waktu.json` (detik → peristiwa di layar, termasuk tiap baris log yang muncul dan teks gerbang).
- Lembar kontak: `kontak-penyusun-alur-penuh/lembar-01…05.png`; ffprobe: `*.ffprobe.json`; log perekam: `log-rekam-alur-penuh.txt` (kejujuran: bersih; galat halaman: tidak ada).
- Ambilan kritikus: `penyusun-alur-penuh-r1.mp4` (139,27 d), `penyusun-alur-penuh-r2.mp4` (144,47 d) + `bingkai-r1/`, `bingkai-r2/`.
- Bingkai akhir dicek mata (`periksa-bingkai-alur/`: 3, 16, 30, 40, 47, 90,5, 92, 96, 128, 146 d): teks tajam, bilah Langsung/Rekaman utuh, tidak ada yang terpotong; tukar b ↔ c terlihat sebelum klik.
- Setiap ambilan menulis ulang `eval/penyusun/m2d13-opus-2/persetujuan-demo.json`; yang di-commit = ambilan akhir (putusan "ditolak", semua suntingan sesuai berkas, biaya uji ulang tersimpan US$0,021425).

### 8.8 Batas dan catatan

- Demo hanya memutar jalan mesin bebas yang punya `hasil.json` (`versi`, `akhir`) dan paket yang bisa dibangun ulang sama persis dari gudang lokal (`.cache/sectors`, tidak di-commit). Di mesin tanpa cache TIRT tahap 1 berhenti di perkiraan kredit (pengambilan data ditolak 409 di mode demo).
- Bagian agen tetap rekaman; tidak ada klaim "langsung" untuknya.
- Tempo demo (min 550 ms, batas 1,25 d) lebih cepat dari tayang ulang M2d-12; rumusnya tertulis di `RUMUS_JEDA_DEMO` dan setiap jeda diumumkan.
- `max_tokens` kritikus 16.000 hanya untuk uji ulang demo (amandemen teknis, §8.3); di uji ulang nyata kritikus tidak sampai dipanggil.
- Dua tes lama bergantung pada ledger hidup dan kini merah karena panggilan berbayar M2d-14 yang diizinkan (jalur di luar batas kontrak ini, tidak diubah): `factory/llm/kalibrasi-probe.test.ts` (daftar awalan tag ledger belum memuat `m2d14/`; perbaikan satu baris di `factory/llm/kalibrasi-konfig.ts` `AWALAN_BOLEH`) dan `factory/llm/bebas/laporan-penulis.test.ts` (baris "Kumulatif ledger" laporan M2d-13; `npm run penulis:laporan` memperbaruinya ke US$11,2676 / 3.175 entri).
