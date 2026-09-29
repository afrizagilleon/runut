# Rencana audit gudang (M4a) — ditulis sebelum data diambil

Berkas ini dan `docs/bukti/audit-rencana.json` di-commit **sebelum satu pun data emiten baru
diambil**. Aturan di bawah tidak diubah sesudah melihat hasil; emiten tidak ditambah atau
dibuang sesudah melihat hasil. Emiten yang gagal diambil dicatat alasannya dan tidak diganti.

Kode aturannya: `alat/audit-rencana.ts` (murni, dites di `alat/audit-rencana.test.ts`).
Penjalannya: `npm run sectors:ambil -- --audit <rencana|daftar|data|ringkas>` (`alat/audit-ambil.ts`).

## Kenapa

Bukti bahwa data resmi tidak selalu benar sampai sekarang berasal dari 15 emiten yang dipilih
tangan. Audit ini menjalankan aturan verifikasi yang sama atas emiten yang dipilih dengan
aturan tetap, dalam dua kelompok, supaya angkanya punya penyebut dan bisa dibandingkan: apakah
data yang bertentangan hanya muncul di saham yang pernah disuspensi, atau juga di saham lain.

## Kelompok (a) — suspensi: 28 emiten

Aturan: emiten yang muncul di `.cache/sectors/suspensions-all.json` dengan tanggal suspensi
2025-01-01 s.d. 2026-12-31, **belum ada di gudang**, diurutkan menurut simbol, diambil 28 dari
atas.

"Belum ada di gudang" = tidak punya satu pun berkas miliknya sendiri di `.cache/sectors/`.
Emiten yang hanya muncul sebagai baris di daftar suspensi (`suspensions-all.json`,
`dada-suspensions.json`) atau di berkas kalender (`kalender-*.json`) dihitung belum ada.
Gudang lama (15 emiten): AGII, ARNA, BIRD, COCO, DADA, FOLK, HITS, KRYA, MERK, MLPT, MTLA, RAJA,
RLCO, TIRT, ULTJ.

Kandidat: 270 emiten. Yang terambil (28):

AGAR, AHAP, AIMS, AKKU, ALII, ALKA, ALTO, AMMS, APEX, ARCI, AREA, ARGO, ARKO, ARTA, ASHA,
ASLC, ASLI, ASPI, ASPR, ATAP, AYAM, AYLS, BAIK, BAJA, BAPA, BBRM, BBSS, BCIC.

## Kelompok (b) — pembanding: 14 emiten

Aturan: satu panggilan daftar perusahaan Sectors, `GET /v2/companies/?limit=200` (1 kredit;
urutan bawaan endpoint = simbol, batas 200 baris per panggilan). Dari baris itu dibuang:

1. simbol yang pernah muncul di `suspensions-all.json` (tahun berapa pun) atau
   `dada-suspensions.json`;
2. simbol gudang lama.

Sisanya diurutkan menurut `sha256(simbol)` (heksadesimal, simbol huruf besar tanpa `.JK`)
menaik, diambil 14 dari atas. Hasil penerapan aturan ini ditulis ke `audit-rencana.json`
(`kelompok_pembanding`) oleh langkah `--audit daftar`, dan di-commit **sebelum** langkah
`--audit data` mengambil data emiten mana pun.

Perbandingan 28 : 14 = 2 : 1, dan paketnya sama, jadi anggarannya juga 2 : 1.

### Batas yang diakui

- Kontrak hanya membolehkan satu panggilan daftar, dan satu panggilan paling banyak 200 baris.
  Karena itu kerangka sampel kelompok (b) adalah **200 simbol pertama menurut abjad**, bukan
  seluruh ±950 emiten. Kelompok (a) juga diambil dari atas menurut abjad (AGAR–BCIC), jadi
  kedua kelompok berasal dari wilayah abjad yang sama. Huruf awal simbol tidak kami anggap
  berhubungan dengan mutu data, tetapi itu asumsi, bukan hasil ukur.
- "Tidak pernah disuspensi" berarti tidak ada di daftar suspensi cache, yang mencakup
  2024-02-01 s.d. 2026-09-17 (556 baris). Suspensi sebelum Februari 2024 tidak terlihat.

## Paket panggilan per emiten (sama untuk semua)

Urutan dijalankan, dengan biaya dihitung sebelum memanggil:

| # | panggilan | kredit |
|---|---|---:|
| 1 | `/v2/company/corporate-actions/{S}/` — sekaligus pemeriksa simbol: kalau 404, sisa paket tidak dikirim | 1 |
| 2 | `/v2/filings/?symbol={S}&start=2025-01-01&end=2026-09-28&limit=30` | 1 |
| 3 | `/v2/company/report/{S}/?sections=ownership` | 1 |
| 4 | `/v2/company/report/{S}/?sections=overview,financials` | 2 |
| 5 | halaman kedua filings (`&offset=30`), **hanya bila** halaman pertama `has_next` | 0–1 |
| 6 | harga harian `/v2/daily/{S}/?start=…&end=…`, 1–4 jendela 90 hari (batas endpoint) | 1–4 |

Pagu per emiten: **10 kredit**, ditegakkan dari buku kas sebelum setiap panggilan (tahan jalan
ulang). Tidak ada halaman filings ketiga: emiten dengan lebih dari 60 laporan di rentang audit
tercatat tidak lengkap, dan aturan R25 sudah menolak bukti negatif dari daftar yang belum
terbukti habis.

### Jendela harga harian (aturan tetap, masukannya data emiten itu sendiri)

Tanggal penting dalam rentang 2025-01-01 s.d. 2026-09-28, tiga tingkat:

1. tanggal suspensi emiten itu (dari cache, diketahui sebelum mengambil);
2. tanggal terbit tiap laporan kepemilikan dan tanggal tiap butir transaksinya (dari filings);
3. tanggal ex dividen, tanggal pemecahan saham, tanggal ex right issue, tanggal saham bonus
   (dari aksi korporasi).

Tingkat demi tingkat, tanggal terawal yang belum tertutup jendela membuka jendela baru:
mulai 14 hari sebelum tanggal itu (supaya ada hari "sebelum"), lebar 90 hari (mulai + 89),
dijepit ke rentang audit. Paling banyak 4 jendela. Tanpa satu pun tanggal penting: satu jendela
90 hari terakhir (2026-07-01 s.d. 2026-09-28).

Tujuannya: harga menutup tanggal transaksi laporan (R17B), masa suspensi (R18a, R10, R19),
dan tanggal aksi korporasi (R28, R29, R34) — pada emiten yang sama, dengan aturan yang sama.

## Anggaran

- Terburuk: 1 (daftar) + 42 × 10 = **421 kredit** ≤ 450. Cadangan sampai pagu 500 hanya
  untuk pengambilan ulang, bukan untuk emiten tambahan.
- Perkiraan: paket tetap 5, halaman kedua filings jarang, harga harian 1–4 → sekitar 6–9 per
  emiten, **±250–380 kredit** total.
- Pagu keras di kode: `SECTORS_KREDIT_PAGU` bawaan 613 = saldo pembuka 113 + 500. Panggilan
  yang akan melewatinya tidak dikirim.
- Urutan ambil berselang 2 : 1 (a, a, b, a, a, b, …), jadi kalau pagu habis di tengah jalan
  kedua kelompok terpotong dengan perbandingan yang sama.

## Aturan berhenti

- 2xx → berkas ditulis apa adanya ke `.cache/sectors/{S}-m4a-*.json`; berkas yang ada tidak
  pernah ditimpa.
- 404 → dicatat (ditagih 1 kredit menurut changelog Sectors); untuk panggilan pertama, sisa
  paket emiten itu tidak dikirim.
- 429 → tunggu, satu kali coba lagi.
- Selain itu (401/403 = kunci tidak sah atau kuota habis, 400, 5xx, galat jaringan, pagu) →
  **seluruh pengambilan berhenti** dan dilaporkan; tidak ada kunci lain yang dicari.

## Apa yang tidak dilakukan audit ini

- Kode aturan verifikasi tidak diubah untuk menjalankan audit (`npm run verifikasi:gudang` apa
  adanya). Perbaikan hanya bila penguji independen menunjukkan bug aturan, dengan tes merah dulu.
- Kasus yang sedang tayang (`cases/*.json`, DADA dan ULTJ) tidak boleh berubah satu byte pun.
