# Runut

> Nama kerja. Bisa berubah sebelum submit.

Latihan membaca dokumen pasar modal Indonesia lewat kasus nyata yang dibekukan pada satu tanggal.

Pemain melihat hanya fakta yang sudah tersedia untuk publik sampai tanggal T: laporan keuangan, pengumuman bursa, laporan transaksi pemegang saham, jadwal RUPS. Pemain menjawab pertanyaan tentang **membaca data dan hak pemegang saham** — bukan menebak harga, bukan memutuskan beli atau jual. Setelah menjawab, data sesudah T dibuka.

Setiap angka di dalam soal bisa ditelusuri ke sumbernya: panggilan Sectors API, PDF keterbukaan informasi IDX, atau dokumen KSEI.

**Ini bukan nasihat investasi.** Data menggambarkan keadaan pada tanggal tertentu di masa lalu dan bukan kondisi perusahaan sekarang. Produk ini tidak pernah menyarankan membeli atau menjual efek apa pun.

## Status

Dibangun untuk Sectors Hackathon 2026, Track 01 (AI Agents & Assistants). Prototipe.

## Susunan

| Folder | Isi |
|---|---|
| `factory/` | Pabrik puzzle: agent yang memilih kasus, menarik data Sectors, membaca PDF resmi, memverifikasi, lalu menyusun soal |
| `cases/` | Hasil pabrik: kasus terverifikasi beserta jejak verifikasinya (JSON, ikut di-commit) |
| `web/` | Aplikasi pemain: statis, tanpa login, membaca `cases/` |
| `docs/` | Catatan arsitektur, aturan verifikasi, dan sumber |

## Sumber data

- Sectors Financial API v2 (sumber inti; tanpa Sectors tidak ada kasus)
- Dokumen resmi IDX dan KSEI sebagai pemutus ketika data berkonflik

## Lisensi

MIT (menyusul).
