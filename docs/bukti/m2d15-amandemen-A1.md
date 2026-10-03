# Amandemen pra-data M2d-15 A1–A3

Pra-registrasi yang diamandemen adalah `docs/bukti/m2d15-praregistrasi.md` (commit f98427f). Teks pra-registrasi itu **tidak diubah**; berkas ini menimpa tiga butirnya.

- **Waktu:** amandemen diminta reviewer pada 3 Okt, sesudah fase 1 diterima, dan pemilik sudah mengizinkan amandemen.
- **Sebelum data:** amandemen di-commit **sebelum panggilan berbayar pertama M2d-15**. Ledger belum memuat tag `m2d15/` atau `penyusun/m2d15-`; ini dites di `factory/llm/bebas/amandemen-a1.test.ts`.
- **Yang tidak berubah:** semua butir lain pra-registrasi tetap berlaku. Itu mencakup patokan §2 (a) + (b), setelan penulis, aturan versi dan pra-periksa, ramalan, dan batas klaim.

## A1 — Label sudut "terbukti" (menimpa §5)

Label **terbukti** sekarang butuh tiga syarat sekaligus:
- lulus semua gerbang ≥ 1 kali;
- Opus tanpa kartu Σk/Σn ≤ 0,5;
- tertebak penebak / sampai tebak rotasi **≤ 0,5**. Syarat ini baru. Sudut yang belum pernah sampai rotasi tidak bisa terbukti, karena syarat lulus belum terpenuhi.

Aturan **gagal** didahulukan seperti sebelumnya, dan aturan **campuran** serta **belum dicoba** tidak berubah.

**Alasan.** `harga-2025-12-09` berlabel TERBUKTI dengan 1 lulus dari 24 versi, padahal 16 dari 18 versi yang sampai rotasi tertebak penebak tanpa kartu. Label itu akan mendorong penulis ke sudut yang lemah.

**Hasil hitung ulang** (data dan sumber tetap):

| sudut | lulus/dicoba | tertebak/sampai rotasi | Opus tanpa kartu | label lama | label A1 |
|---|---|---|---|---|---|
| volume-2025-12-10 | 1/4 | 0/1 | 1/8 | terbukti | **terbukti** |
| harga-2025-12-09 | 1/24 | 16/18 | 1/4 | terbukti | **campuran** |
| susp-2025-12-10 | 0/12 | 3/4 | 12/20 | campuran | campuran |
| susp-2025-01-21 | 1/10 | 3/4 | 9/12 | gagal | gagal |
| kelipatan-2025-11-26-2025-12-09 | 1/7 | 2/3 | 10/12 | gagal | gagal |
| naik-2025-11-26-2025-12-09 | 0/4 | 0/0 | 7/8 | gagal | gagal |
| hari-naik-beruntun | 1/6 | 5/6 | 4/4 | gagal | gagal |
| 13 fakta lain | — | — | — | belum dicoba | belum dicoba |

Prompt v2 menerima bank yang sudah dihitung ulang. Hash prompt sistem baru dicatat di tiap jalan.

## A2 — Pagu per jalan US$2,00 (menimpa §6)

Pagu jalan = min(**US$2,00**; US$2,70 − biaya nyata jalan M2d-15 sebelumnya), dibulatkan ke bawah 4 desimal.

**Tetap:**
- D-4 ≤ US$2,70 dan pagu milestone US$3,00;
- penilai GLM = US$3,00 − biaya D-4, paling sedikit US$0,30;
- maks 2 jalan dan syarat jalan 2;
- logika cadangan sebelum kirim (`PencatatBiaya`).

Jalan 2 hanya mendapat sisa D-4.

**Alasan.** Satu panggilan Opus effort "medium" dicadangkan ±US$0,41–0,46 sebelum kirim. Dengan pagu US$1,40, versi 3 hampir pasti tidak terjangkau bila ada tulis-ulang pra-periksa. Itu akan menyensor "ruang 3 versi" yang dituju kontrak.

## A3 — Tag `m2d15/` diizinkan di daftar awalan ledger

`m2d15/` ditambahkan ke daftar awalan yang boleh ada di ledger (`AWALAN_BOLEH`) di:
- `factory/llm/kalibrasi-konfig.ts`;
- `factory/llm/patokan/konfig.ts`;
- `factory/llm/templat/konfig.ts`.

Ini sama seperti yang dilakukan M2d-13 dan M2d-14. Tujuannya supaya panggilan penilai GLM D-5 (tag `m2d15/mutu/`) tidak membuat pemeriksaan kesiapan milestone lama berhenti. Tag jalan `penyusun/m2d15-…` sudah tercakup `penyusun/`.
