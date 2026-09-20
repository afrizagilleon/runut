# Bukti regresi M1

Dijalankan 20 September 2026 pada Node v24.11.0, branch `m1-kasus-bisa-dimainkan`.
Semua keluaran di bawah disalin apa adanya, dipangkas hanya pada bagian yang berulang.

## Gate

```
$ npm run typecheck ; echo "exit=$?"
> tsc -p tsconfig.json --noEmit
exit=0

$ npm test
 Test Files  5 passed (5)
      Tests  77 passed (77)
exit=0

$ npm run build ; echo "exit=$?"
dist/index.html                  0.48 kB │ gzip:  0.31 kB
dist/assets/index-KtySQAS2.css   4.97 kB │ gzip:  1.66 kB
dist/assets/index-RP-dEM7v.js  204.90 kB │ gzip: 57.76 kB
exit=0

$ npm run build:case -- dada-2025-10-08 ; echo "exit=$?"
Kasus dada-2025-10-08 dibangun dan lolos validator.
exit=0

$ git diff --exit-code cases/ ; echo "exit=$?"
exit=0
```

## Data mentah dan catatan pribadi tidak ikut repo

```
$ git diff --stat c790937..HEAD -- .env .cache .contracts .plans .context .research
(kosong)

$ git log --stat c790937..HEAD | grep -E "^\s(\.context|\.research|\.cache|\.contracts|\.plans|\.env)" ; echo "exit=$?"
exit=1
```

## Bite-test wajib: satu angka fakta diubah

Harga penutupan 8 Oktober 2025 diubah dari Rp178 menjadi Rp179 di
`.cache/sectors/dada-daily-2025q3.json`, lalu kasus dibangun ulang.

```
sebelum: {"date":"2025-10-08","close":178,"open":162,"high":178,"low":162,...}
sesudah: close 179

$ npm run build:case -- dada-2025-10-08
Kasus dada-2025-10-08 dibangun dan lolos validator.

$ git diff --stat cases/
 cases/dada-2025-10-08.json | 10 +++++-----
 1 file changed, 5 insertions(+), 5 deletions(-)

-      "klaim": "Harga penutupan 8 Oktober 2025 adalah Rp178 per lembar.",
-      "nilai": 178,
+      "klaim": "Harga penutupan 8 Oktober 2025 adalah Rp179 per lembar.",
+      "nilai": 179,
-      "klaim": "Harga penutupan naik 22,25 kali lipat, dari Rp8 menjadi Rp178.",
+      "klaim": "Harga penutupan naik 22,38 kali lipat, dari Rp8 menjadi Rp179.",
```

Berkas kasus ikut berubah, termasuk angka turunannya (kelipatan kenaikan dihitung
ulang dari data, bukan disalin). Data cache lalu dikembalikan dan dicek ulang:

```
$ md5sum -c cache.md5
.cache/sectors/dada-daily-2025q3.json: OK
$ npm run build:case -- dada-2025-10-08 ; git diff --exit-code cases/ ; echo "exit=$?"
exit=0
```

## Tes dibuktikan bisa merah, satu per satu

Yang dirusak adalah kodenya, bukan tesnya; setiap kali hanya satu perubahan, lalu
dikembalikan dan `git diff` dipastikan kosong.

```
R3 dimatikan  (cariBlokUlangan berhenti melaporkan blok berulang)
 × menemukan laporan ganda R3: 6 transaksi, 586.000.000 lembar, 7,89 persen
 × menghasilkan empat temuan: tiga yang diminta kontrak ditambah lompatan 25 Agu
 × fixture negatif > membuang enam laporan ulangan dan menyisakan 38 laporan
 × membangun ulang kasus dari cache > menghasilkan berkas yang sama persis
      Tests  4 failed | 73 passed (77)

R2 dimatikan  (selisih saldo antar laporan diabaikan)
 × menemukan lompatan R2 +79.272.900 lembar pada 19 Okt malam
 × menemukan lompatan R2 −1.660.008.900 lembar pada 19 Okt tengah malam
 × menemukan satu lompatan lagi yang tidak disebut kontrak: −10.000.000 lembar
 × menghasilkan empat temuan
 × membangun ulang kasus > menghasilkan berkas yang sama persis
 × membangun ulang kasus > menandai fakta yang tersangkut temuan sebagai KONFLIK
      Tests  6 failed | 71 passed (77)

Validator berhenti memeriksa fakta sesudah tanggal T
 × menolak fakta yang baru tersedia sesudah tanggal T di bagian pemain
 × gagal menyebut fact_id kalau fakta sesudah T ditaruh di bagian pemain
      Tests  2 failed | 75 passed (77)

Pemuat memakai tanggal transaksi, bukan tanggal laporan
 × memakai tanggal laporan, bukan tanggal transaksi, sebagai tanggal ketersediaan
 × menghasilkan rantai yang sama persis dengan fixture yang ikut repo
 × mencatat berkas cache yang benar untuk laporan di halaman kedua
 × (5 tes pembangun kasus ikut merah)
      Tests  8 failed | 69 passed (77)

Status KONFLIK berhenti menular ke fakta gabungan
 × menandai fakta yang tersangkut temuan sebagai KONFLIK, termasuk gabungannya
 × menghasilkan berkas yang sama persis dengan yang ikut repo
      Tests  2 failed | 75 passed (77)

Sesudah semuanya dikembalikan:
 Test Files  5 passed (5)
      Tests  77 passed (77)
```

## Satu commit per task

```
$ git log --oneline c790937..HEAD
d006da7 Tambah aplikasi pemain: fakta, tiga soal, pembukaan, jejak verifikasi   (T-06)
3290c74 Bangun berkas kasus DADA beku 8 Oktober 2025 dari cache                 (T-05)
c2237f0 Tambah pemuat fakta DADA dari cache beserta jejak sumbernya             (T-04)
1977019 Tambah mesin verifikasi R1-R10 beserta fixture rantai DADA              (T-03)
20a7cd2 Tambah skema fakta dan kasus beserta validatornya                       (T-02)
67d4f83 Siapkan pondasi: TypeScript strict, Vitest, Vite + React, empat skrip   (T-01)

$ git status --short
(kosong)
```

## Yang belum diuji

Aplikasi web tidak punya tes otomatis; RQ-05 sampai RQ-08 diukur dengan tangan dan
hasilnya ada di `docs/bukti/360px.md`, termasuk dua hal yang masih butuh tangan
manusia: penekanan Enter/spasi pada tombol (G-1) dan tangkapan layar 360px (G-2).
