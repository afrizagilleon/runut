# Runut

> Nama kerja. Bisa berubah sebelum submit.

Latihan membaca dokumen pasar modal Indonesia lewat kasus nyata yang dibekukan pada satu tanggal.

Pemain melihat hanya fakta yang sudah tersedia untuk publik sampai tanggal T: laporan keuangan, pengumuman bursa, laporan transaksi pemegang saham, jadwal RUPS. Pemain menjawab pertanyaan tentang **membaca data dan hak pemegang saham** — bukan menebak harga, bukan memutuskan beli atau jual. Setelah menjawab, data sesudah T dibuka.

Setiap angka di dalam soal bisa ditelusuri ke sumbernya: panggilan Sectors API, PDF keterbukaan informasi IDX, atau dokumen KSEI.

**Ini bukan nasihat investasi.** Data menggambarkan keadaan pada tanggal tertentu di masa lalu dan bukan kondisi perusahaan sekarang. Produk ini tidak pernah menyarankan membeli atau menjual efek apa pun.

## Status

Dibangun untuk Sectors Hackathon 2026, Track 01 (AI Agents & Assistants). Prototipe.

## Menjalankan

```bash
npm install
npm run build:case -- dada-2025-10-08   # bangun berkas kasus dari data (butuh .cache/)
npm run dev                             # pemain di http://localhost:5173
```

Perintah lain: `npm test`, `npm run typecheck`, `npm run build`, `npm run preview`.

Berkas kasus sudah ikut di repo, jadi `npm run dev` jalan tanpa `build:case`.

## Apa yang dicatat

Secara baku **tidak ada apa pun yang dikirim ke mana pun.** Aplikasi yang
dibangun tanpa `VITE_KOLEKTOR_URL` tidak memuat satu pun alamat untuk dihubungi;
itu diperiksa dari isi `web/dist/`, bukan dari membaca kode.

Kalau alamat pengumpul diisi saat build — yang hanya dilakukan untuk uji coba
terbatas — yang tercatat adalah perilaku di halaman, bukan orangnya:

| dicatat | artinya |
|---|---|
| `mulai` | permainan dibuka, beserta lebar layar |
| `layar_masuk` | pindah ke layar mana |
| `kartu_buka` | kartu fakta atau panel sumbernya dibuka |
| `pilih` | pilihan jawaban dipindah, dan sudah berapa kali |
| `kunci_jawaban` | jawaban dikunci: pilihannya, benar atau tidak, lama di soal itu, berapa kartu dibuka sebelumnya |
| `lihat_balik` | kembali melihat soal yang sudah dikunci |
| `pembukaan_masuk`, `pembukaan_selesai` | sampai ke layar pembukaan, lama membacanya, seberapa jauh menggulir |
| `minat_kasus_lain` | tombol "Mau coba kasus lain" ditekan |
| `akhir_kirim` | isian tiga pertanyaan dan kotak teks di layar akhir |
| `tutup` | tab ditutup, di layar mana |

Yang **tidak** ada, dan tidak akan ditambahkan:

- tidak ada akun, login, atau nama;
- tidak ada cookie dan tidak ada `localStorage` untuk identitas;
- tidak ada sidik jari perangkat;
- pengumpul **tidak menulis alamat IP maupun User-Agent** ke berkas — tidak ada
  header apa pun yang disimpan;
- id sesi adalah angka acak yang hidup di memori tab saja dan hilang saat tab
  ditutup.

Daftar peristiwa di atas tertutup: pengumpul menolak apa pun di luarnya.

## Susunan

| Folder | Isi |
|---|---|
| `factory/` | Pabrik puzzle: agent yang memilih kasus, menarik data Sectors, membaca PDF resmi, memverifikasi, lalu menyusun soal |
| `cases/` | Hasil pabrik: kasus terverifikasi beserta jejak verifikasinya (JSON, ikut di-commit) |
| `web/` | Aplikasi pemain: statis, tanpa login, membaca `cases/` |
| `server/` | Pengumpul peristiwa alpha: Node bawaan saja, nol dependensi |
| `alat/` | Perkakas: ringkasan data alpha menjadi tabel Markdown |
| `deploy/` | Berkas dan skrip untuk menerbitkan alpha; tidak pernah dijalankan otomatis |
| `docs/` | Catatan arsitektur, aturan verifikasi, dan sumber |

## Sumber data

- Sectors Financial API v2 (sumber inti; tanpa Sectors tidak ada kasus)
- Dokumen resmi IDX dan KSEI sebagai pemutus ketika data berkonflik

## Lisensi

MIT (menyusul).
