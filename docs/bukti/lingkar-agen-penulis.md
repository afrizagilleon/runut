# Lingkar agen M2d-13 — keluarga penulis × penguji (H1–H4)

> Laporan ini dibangun skrip (`npm run penulis:laporan`, `factory/llm/bebas/laporan-penulis.ts`) dari keluaran tersimpan (`eval/penyusun/m2d13-*/`, `eval/keluaran-m2d13/`) dan ledger OpenRouter. Kalimat bertanda **Tafsiran** adalah bacaan eksekutor. Pra-registrasi: `docs/bukti/m2d13-praregistrasi.md` (commit 15c3766, sebelum panggilan berbayar pertama; dites). **H4 diuji pada effort penalaran "low" untuk ketiga penulis.**

## Ringkasan

- **Jalan D-B:** 6 dari 6 slot (m2d13-opus-1 (tersensor), m2d13-haiku-1, m2d13-deepseek-1, m2d13-opus-2 (tersensor), m2d13-haiku-2, m2d13-deepseek-2). Biaya nyata D-B US$1.0050 dari pagu US$2.1000; penilai GLM US$0.3254 dari US$0.4000; total milestone US$1.3304 dari US$2.5000.
- **Omongan lulus (≤ 3 versi):** Opus 5.5 2/6 · Haiku 4.5 0/6 · DeepSeek V4.1 Flash 0/6; simulasi terbit: Opus 5.5 0 · Haiku 4.5 0 · DeepSeek V4.1 Flash 0.
- **Penyimpangan yang memengaruhi bacaan (bukan perubahan pra-registrasi):** (1) jalan Opus tersensor 2/2 — pagu jalan US$0,60 tidak memuat versi 3 (perkiraan maksimum panggilan penulis Opus ≈ US$0,25 dicek sebelum kirim); (2) penulis DeepSeek: 12/12 panggilan habis di max_tokens 8.000 seluruhnya penalaran walau effort "low" → semua versi tulis-gagal; (3) penilai GLM pra-registrasi (effort "medium") nyaris tidak berpikir → amandemen teknis effort "high" (lihat §3).

## 1. D-A — analisis gratis data M2d-11 (eksploratif)

Rincian: `eval/keluaran-m2d13/analisis-lama/ringkasan.md`. Atribusi bank 33: soal tayang Opus+pemilik 6, DeepSeek 21 (jejak M2d-3…M2d-8), templat M2d-10 6; + 23 versi jalan TIRT M2d-11 (templat). Prior huruf (semua butir): Haiku b 42 % (n 400), DeepSeek b 35 % (n 441), GLM b 33 % (n 443). Δ sekeluarga bank 33 (GLM kendali): pilihan-saja Δ_DS -0,25, Δ_H 0,35; pesan+pilihan Δ_DS -0,06, Δ_H 0,27.

**Pembaur:** butir DeepSeek lama sudah lolos penebak DeepSeek/GLM di lingkar asalnya (seleksi); jenis soal, masa pembuatan, dan host berbeda; soal tayang ditulis bersama manusia. Dicatat sebagai petunjuk, bukan putusan.

## 2. D-B — jalan tiga penulis

Paket TIRT-7 apa adanya (sha256 f7cabc6b…), satu prompt sistem yang sama (sha256 e2d4457eca89…, sama di semua jalan), penulis `reasoning.effort: "low"`, `max_tokens` 8.000, suhu 1,0; urutan bergiliran; pagu jalan Opus US$0.6000, Haiku US$0.3000, DeepSeek US$0.2200.

| jalan | putaran | terbit | versi per omongan (berhenti) | biaya penulis | biaya gerbang | total | berhenti |
|---|---|---|---|---|---|---|---|
| m2d13-opus-1 | 1 | tidak | o1: penebak→penebak; o2: penebak→kode; o3: kode→kode | US$0.3433 | US$0.0312 | US$0.3744 | terpotong pagu: PaguMilestoneTercapai: Pagu milestone tercapai: biaya milestone (tag penyusun/*) US$2.258749 + perkiraan maksimum US$0.249672 untuk anthropic/claude-opus-5.5 > pagu milestone US$2.49. Panggilan tidak diki |
| m2d13-haiku-1 | 1 | tidak | o1: kode→kode→penebak; o2: kode→kode→kode; o3: kode→kode→kode | US$0.0836 | US$0.0157 | US$0.0993 | omongan tidak lulus dalam 3 versi: 1, 2, 3; simulasi tidak terbit |
| m2d13-deepseek-1 | 1 | tidak | o1: tulis-gagal→tulis-gagal→tulis-gagal; o2: tulis-gagal→tulis-gagal→tulis-gagal; o3: tulis-gagal→tulis-gagal→tulis-gagal | US$0.0250 | US$0.0000 | US$0.0250 | omongan tidak lulus dalam 3 versi: 1, 2, 3; simulasi tidak terbit |
| m2d13-opus-2 | 2 | tidak | o1: kartu→lolos; o2: penebak→kode; o3: kode→lolos | US$0.3083 | US$0.0997 | US$0.4080 | terpotong pagu: PaguMilestoneTercapai: Pagu milestone tercapai: biaya milestone (tag penyusun/*) US$2.791140 + perkiraan maksimum US$0.248080 untuk anthropic/claude-opus-5.5 > pagu milestone US$2.99. Panggilan tidak diki |
| m2d13-haiku-2 | 2 | tidak | o1: kode→kode→kode; o2: kode→kode→kode; o3: kode→kode→kode | US$0.0778 | US$0.0000 | US$0.0778 | omongan tidak lulus dalam 3 versi: 1, 2, 3; simulasi tidak terbit |
| m2d13-deepseek-2 | 2 | tidak | o1: tulis-gagal→tulis-gagal→tulis-gagal; o2: tulis-gagal→tulis-gagal→tulis-gagal; o3: tulis-gagal→tulis-gagal→tulis-gagal | US$0.0204 | US$0.0000 | US$0.0204 | omongan tidak lulus dalam 3 versi: 1, 2, 3; simulasi tidak terbit |

<details><summary>m2d13-opus-1: alasan penolakan per versi</summary>

| omongan | versi | berhenti | alasan |
|---|---|---|---|
| 1 | 1 | penebak | tebak rotasi gagal: pesan-pilihan: kunci 5/12 (5,0/12); pesan-pilihan: deepseek/deepseek-v4.1-flash memilih isi kunci di ≥ 3/4 rotasi [pilihan-saja: claude-haiku-4.5 isi opsi asal a, deepseek-v4.1-flash isi opsi asal a, glm-5.3 isi opsi asal a; pesan-pilihan: claude-haiku-4.5 isi opsi asal a, deepseek-v4.1-flash isi opsi asal b, glm-5.3 isi -] — kunci = pilihan b; tanpa kartu, penebak memilih isi kunci terlalu sering |
| 2 | 1 | penebak | tebak rotasi gagal: pesan-pilihan: kunci 11/12 (11,0/12); pilihan-saja: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi; pilihan-saja: deepseek/deepseek-v4.1-flash memilih isi kunci di ≥ 3/4 rotasi; pilihan-saja: z-ai/glm-5.3 memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: deepseek/deepseek-v4.1-flash memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: z-ai/glm-5.3 memilih isi kunci di ≥ 3/4 rotasi [pilihan-saja: claude-haiku-4.5 isi opsi asal a, deepseek-v4.1-flash isi opsi asal a, glm-5.3 isi opsi asal  |
| 3 | 1 | kode | pemeriksa: G-satu-klausa: koma kedua memulai klausa baru (",  …") · detektor D9 (urutan numerik; pilihan): nilai angka opsi a=178100, b=0, c=1461200 tidak urut; opsi a, b, c |
| 1 | 2 | penebak | tebak rotasi gagal: pesan-pilihan: kunci 2/12 (2,0/12); pilihan-saja: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi; pilihan-saja: deepseek/deepseek-v4.1-flash diabaikan (huruf "b" di ≥ 3/4 rotasi) [pilihan-saja: claude-haiku-4.5 isi opsi asal b, deepseek-v4.1-flash isi - (diabaikan), glm-5.3 isi opsi asal a; pesan-pilihan: claude-haiku-4.5 isi -, deepseek-v4.1-flash isi opsi asal a, glm-5.3 isi opsi asal a] — kunci = pilihan b; tanpa kartu, penebak memilih isi kunci terlalu sering |
| 2 | 2 | kode | pemeriksa: ANGKA_TANPA_RUJUKAN: Penjelasan memuat angka di luar rujukan: 106, 48. Tulis tiap angka sebagai [[fact_id/teks]]. · pemeriksa: G-angka-cukup: Pilihan kunci d bisa dihitung dari angka yang sudah ada di pesan dan pilihan, tanpa kartu: "58" = 106 − 48 = 58. Penebak akan menghitungnya. Jangan taruh di pesan dan pilihan semua angka yang dibutuhkan untuk menghitung klaim kunci — biarkan angka penentunya hanya ada di kartu. · M2d-13: angka-di-kartu: penjelasan: angka di luar rujukan kartu: Rp106, Rp48 · M2d-13: angka-di-kartu: umpan balik a: angka di luar rujukan kartu: Rp48 |
| 3 | 2 | kode | pemeriksa: G-pilihan-kembar: pilihan c dan d isinya sama (kemiripan 1,00) |

</details>

<details><summary>m2d13-haiku-1: alasan penolakan per versi</summary>

| omongan | versi | berhenti | alasan |
|---|---|---|---|
| 1 | 1 | kode | pemeriksa: ANGKA_TANPA_RUJUKAN: Penjelasan memuat angka di luar rujukan: 26, 9. Tulis tiap angka sebagai [[fact_id/teks]]. · pemeriksa: G-panjang: 12 kata; paling banyak 11 · pemeriksa: G-satu-klausa: koma kedua memulai klausa baru (", mirip …") · M2d-13: angka-di-kartu: penjelasan: angka di luar rujukan kartu: 26, 9 · M2d-13: angka-di-kartu: umpan balik d: "1.461.200 lembar" merujuk volume-2025-12-09, yang bukan kartu omongan ini (kartu: susp-2025-12-10, hari-naik-beruntun) · M2d-13: angka-di-kartu: umpan balik d: angka di luar rujukan kartu: 9 · M2d-13: umpan balik: umpan balik b: harus memu |
| 2 | 1 | kode | pemeriksa: G-satu-klausa: koma kedua memulai klausa baru (", serupa …") · M2d-13: angka-di-kartu: umpan balik d: angka di luar rujukan kartu: 2 · M2d-13: label pengecoh: pengecoh d: jenis "percaya-omongan-tanpa-cek" bukan salah satu dari salah-periode, salah-entitas, nyaris-benar-angka, pertanyaan-lain, sebagian-benar, percaya-otoritas · M2d-13: umpan balik: umpan balik a: harus memuat nama jenis kesalahannya "sebagian benar" · M2d-13: umpan balik: umpan balik a: 201 karakter, lebih dari 200 · M2d-13: umpan balik: umpan balik c: harus memuat nama jenis kesalahannya "salah entitas" · M2d-13: um |
| 3 | 1 | kode | pemeriksa: ANGKA_TANPA_RUJUKAN: Pilihan a memuat angka di luar rujukan: 58, 26, 25. Tulis tiap angka sebagai [[fact_id/teks]]. · pemeriksa: ANGKA_TANPA_RUJUKAN: Pilihan b memuat angka di luar rujukan: 58. Tulis tiap angka sebagai [[fact_id/teks]]. · pemeriksa: ANGKA_TANPA_RUJUKAN: Pilihan d memuat angka di luar rujukan: 58. Tulis tiap angka sebagai [[fact_id/teks]]. · pemeriksa: ANGKA_TANPA_RUJUKAN: Penjelasan memuat angka di luar rujukan: 58,, 26, 9, 26, 9, 58, 9. Tulis tiap angka sebagai [[fact_id/teks]]. · pemeriksa: G-panjang: 16 kata; paling banyak 11 · pemeriksa: G-panjang: 12 kata; pali |
| 1 | 2 | kode | M2d-13: umpan balik: umpan balik d: harus menyebut "kartu 2" (nomor urut rujukan hari-naik-beruntun) |
| 2 | 2 | kode | pemeriksa: G-satu-klausa: koma kedua memulai klausa baru (", sama …") · M2d-13: angka-di-kartu: pertanyaan cek memuat angka ("Alasan penghentian 21 Januari apa, dan alasan penghentian 10 Desember apa?"); pertanyaan cek harus bisa dipakai lagi tanpa angka · M2d-13: label pengecoh: pengecoh d: percaya-otoritas hanya sah bila pengecoh berawalan "Betul" dan kunci berawalan "Keliru" (pengecoh membenarkan teman yang salah) · M2d-13: umpan balik: umpan balik a: harus menyebut "kartu 1" (nomor urut rujukan susp-2025-01-21) · M2d-13: umpan balik: umpan balik d: harus memuat nama jenis kesalahannya "per |
| 3 | 2 | kode | pemeriksa: ANGKA_TANPA_RUJUKAN: Penjelasan memuat angka di luar rujukan: 48, 106,. Tulis tiap angka sebagai [[fact_id/teks]]. · pemeriksa: G-panjang: 12 kata; paling banyak 11 · pemeriksa: G-panjang: 14 kata; paling banyak 11 · pemeriksa: G-satu-klausa: koma kedua memulai klausa baru (", harga …") · gerbang artefak: meresmikan: pilihan kunci "Betul, dari 26 November sampai 9 Desember, harga naik Rp58 per lembar." mengulang "november", "naik" dari pesan yang TIDAK muncul di pengecoh mana pun — pembaca tanpa kartu cukup memilih pilihan yang "meresmikan" omongan teman. · detektor D2 (spesifisitas |
| 1 | 3 | penebak | tebak rotasi gagal: pesan-pilihan: kunci 0/8 (0,0/12); pilihan-saja: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi; pilihan-saja: deepseek/deepseek-v4.1-flash diabaikan (huruf "d" di ≥ 3/4 rotasi); pilihan-saja: z-ai/glm-5.3 diabaikan (huruf "d" di ≥ 3/4 rotasi); pesan-pilihan: z-ai/glm-5.3 diabaikan (huruf "b" di ≥ 3/4 rotasi) [pilihan-saja: claude-haiku-4.5 isi opsi asal a, deepseek-v4.1-flash isi - (diabaikan), glm-5.3 isi - (diabaikan); pesan-pilihan: claude-haiku-4.5 isi opsi asal d, deepseek-v4.1-flash isi opsi asal d, glm-5.3 isi - (diabaikan)] — kunci = pilihan a; tanpa  |
| 2 | 3 | kode | pemeriksa: G-panjang: 13 kata; paling banyak 11 · pemeriksa: G-satu-klausa: koma kedua memulai klausa baru (", tidak …") · M2d-13: label pengecoh: pengecoh d: percaya-otoritas hanya sah bila pengecoh berawalan "Betul" dan kunci berawalan "Keliru" (pengecoh membenarkan teman yang salah) |
| 3 | 3 | kode | pemeriksa: ANGKA_TANPA_RUJUKAN: Penjelasan memuat angka di luar rujukan: 48, 106. Tulis tiap angka sebagai [[fact_id/teks]]. · pemeriksa: G-panjang: 12 kata; paling banyak 11 · M2d-13: angka-di-kartu: penjelasan: angka di luar rujukan kartu: Rp48, Rp106 · M2d-13: angka-di-kartu: umpan balik b: "kartu 3" merujuk kelipatan-2025-11-26-2025-12-09, yang bukan kartu omongan ini (kartu: harga-2025-11-26, harga-2025-12-09, naik-2025-11-26-2025-12-09) · M2d-13: angka-di-kartu: umpan balik d: "pengumuman penghentian hari ini" merujuk susp-2025-12-10, yang bukan kartu omongan ini (kartu: harga-2025-11-26 |

</details>

<details><summary>m2d13-deepseek-1: alasan penolakan per versi</summary>

| omongan | versi | berhenti | alasan |
|---|---|---|---|
| 1 | 1 | tulis-gagal | keluaran penulis tak terbaca dua kali |
| 2 | 1 | tulis-gagal | keluaran penulis tak terbaca dua kali |
| 3 | 1 | tulis-gagal | keluaran penulis tak terbaca dua kali |
| 1 | 2 | tulis-gagal | keluaran penulis tak terbaca dua kali |
| 2 | 2 | tulis-gagal | keluaran penulis tak terbaca dua kali |
| 3 | 2 | tulis-gagal | keluaran penulis tak terbaca dua kali |
| 1 | 3 | tulis-gagal | keluaran penulis tak terbaca dua kali |
| 2 | 3 | tulis-gagal | keluaran penulis tak terbaca dua kali |
| 3 | 3 | tulis-gagal | keluaran penulis tak terbaca dua kali |

</details>

<details><summary>m2d13-opus-2: alasan penolakan per versi</summary>

| omongan | versi | berhenti | alasan |
|---|---|---|---|
| 1 | 1 | kartu | pembaca yang memegang kartu tidak memilih kunci di kedua rotasi (pilihan diputar): r0: memilih b (kunci b); r2: memilih c (kunci d) — Kartu 2 menyebut penghentian sementara karena bursa menilai ada keraguan atas kelangsungan usaha perseroan, sesuai omongan Sinta. |
| 2 | 1 | penebak | tebak rotasi gagal: pesan-pilihan: kunci 7/12 (7,0/12); pilihan-saja: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: deepseek/deepseek-v4.1-flash memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: z-ai/glm-5.3 memilih isi kunci di ≥ 3/4 rotasi [pilihan-saja: claude-haiku-4.5 isi opsi asal c, deepseek-v4.1-flash isi opsi asal b, glm-5.3 isi -; pesan-pilihan: claude-haiku-4.5 isi opsi asal b, deepseek-v4.1-flash isi opsi asal c, glm-5.3 isi opsi asal c] — kunci = pilihan c; tanpa kartu, penebak memilih isi kunci terlalu sering |
| 3 | 1 | kode | detektor D9 (urutan numerik; pilihan): nilai angka opsi a=1461200, b=0, c=1461200, d=0 tidak urut; opsi a, b, c, d |
| 1 | 2 | lolos |  |
| 2 | 2 | kode | pemeriksa: G-angka-cukup: Pilihan kunci b bisa dihitung dari angka yang sudah ada di pesan dan pilihan, tanpa kartu: "2,21" = 106 ÷ 48 = 2,21. Penebak akan menghitungnya. Jangan taruh di pesan dan pilihan semua angka yang dibutuhkan untuk menghitung klaim kunci — biarkan angka penentunya hanya ada di kartu. · pemeriksa: G-satu-klausa: koma kedua memulai klausa baru (", belum …") · detektor D2 (spesifisitas unik; pilihan): token dokumen hanya ada di satu opsi (b = kunci); harus di 0 atau ≥ 2 opsi; opsi b · detektor D9 (urutan numerik; pilihan): nilai angka opsi a=58, b=2.21, c=2.21, d=58 tidak  |
| 3 | 2 | lolos |  |

</details>

<details><summary>m2d13-haiku-2: alasan penolakan per versi</summary>

| omongan | versi | berhenti | alasan |
|---|---|---|---|
| 1 | 1 | kode | pemeriksa: ANGKA_TANPA_RUJUKAN: Penjelasan memuat angka di luar rujukan: 21. Tulis tiap angka sebagai [[fact_id/teks]]. · pemeriksa: HURUF_PILIHAN: Penjelasan merujuk huruf pilihan ("Opsi b", "Opsi d"). Huruf kunci diatur ulang kode, jadi urutan pilihan bisa berubah: sebut ISI pilihannya, bukan hurufnya. · detektor D2 (spesifisitas unik; pilihan): token dokumen hanya ada di satu opsi (c = kunci); harus di 0 atau ≥ 2 opsi; opsi c · M2d-13: angka-di-kartu: penjelasan: angka di luar rujukan kartu: (21 · M2d-13: angka-di-kartu: umpan balik b: angka di luar rujukan kartu: (21 · M2d-13: label pengec |
| 2 | 1 | kode | pemeriksa: ANGKA_TANPA_RUJUKAN: Pilihan a memuat angka di luar rujukan: 2025. Tulis tiap angka sebagai [[fact_id/teks]]. · pemeriksa: G-satu-klausa: koma kedua memulai klausa baru (", sama …") · pemeriksa: HURUF_PILIHAN: Penjelasan merujuk huruf pilihan ("Opsi b", "opsi d"). Huruf kunci diatur ulang kode, jadi urutan pilihan bisa berubah: sebut ISI pilihannya, bukan hurufnya. · detektor D2 (spesifisitas unik; pilihan): token dokumen hanya ada di satu opsi (c = kunci); harus di 0 atau ≥ 2 opsi; opsi c · M2d-13: angka-di-kartu: pilihan a: angka di luar rujukan kartu: 2025 · M2d-13: angka-di-kart |
| 3 | 1 | kode | pemeriksa: ANGKA_TANPA_RUJUKAN: Pilihan a memuat angka di luar rujukan: 58. Tulis tiap angka sebagai [[fact_id/teks]]. · pemeriksa: ANGKA_TANPA_RUJUKAN: Penjelasan memuat angka di luar rujukan: 58, 25. Tulis tiap angka sebagai [[fact_id/teks]]. · pemeriksa: G-angka-cukup: Pilihan kunci b bisa dihitung dari angka yang sudah ada di pesan dan pilihan, tanpa kartu: "2,21" = 106 ÷ 48 = 2,21. Penebak akan menghitungnya. Jangan taruh di pesan dan pilihan semua angka yang dibutuhkan untuk menghitung klaim kunci — biarkan angka penentunya hanya ada di kartu. · pemeriksa: G-panjang: 13 kata; paling bany |
| 1 | 2 | kode | pemeriksa: G-panjang: 12 kata; paling banyak 11 · M2d-13: label pengecoh: pengecoh b: label (jenis, rujukan, umpan_balik) tidak ada · M2d-13: label pengecoh: pengecoh d: percaya-otoritas hanya sah bila pengecoh berawalan "Betul" dan kunci berawalan "Keliru" (pengecoh membenarkan teman yang salah) · M2d-13: umpan balik: umpan balik d: harus memuat nama jenis kesalahannya "percaya omongan tanpa cek" |
| 2 | 2 | kode | pemeriksa: ANGKA_TANPA_RUJUKAN: Penjelasan memuat angka di luar rujukan: 1, 2. Tulis tiap angka sebagai [[fact_id/teks]]. · pemeriksa: G-panjang: 12 kata; paling banyak 11 · pemeriksa: G-satu-klausa: koma kedua memulai klausa baru (", seperti …") · M2d-13: angka-di-kartu: penjelasan: angka di luar rujukan kartu: 1, 2 · M2d-13: label pengecoh: pengecoh d: label (jenis, rujukan, umpan_balik) tidak ada · M2d-13: umpan balik: umpan balik c: harus memuat nama jenis kesalahannya "salah periode" |
| 3 | 2 | kode | pemeriksa: ANGKA_TANPA_RUJUKAN: Penjelasan memuat angka di luar rujukan: 1. Tulis tiap angka sebagai [[fact_id/teks]]. · pemeriksa: G-angka-cukup: Pilihan kunci b bisa dihitung dari angka yang sudah ada di pesan dan pilihan, tanpa kartu: "48" = 106 − 58 = 48; "2,21" = 106 ÷ 48 = 2,21. Penebak akan menghitungnya. Jangan taruh di pesan dan pilihan semua angka yang dibutuhkan untuk menghitung klaim kunci — biarkan angka penentunya hanya ada di kartu. · pemeriksa: G-panjang: 12 kata; paling banyak 11 · pemeriksa: G-panjang: 13 kata; paling banyak 11 · pemeriksa: G-satu-klausa: koma kedua memulai k |
| 1 | 3 | kode | M2d-13: umpan balik: umpan balik b: harus menyebut "kartu 1" (nomor urut rujukan susp-2025-12-10) |
| 2 | 3 | kode | M2d-13: umpan balik: umpan balik d: harus menyebut "kartu 2" (nomor urut rujukan susp-2025-12-10) · M2d-13: sudut: sudut sama dengan omongan 1: kartu penentu susp-2025-12-10 sudah dipakai; pilih fakta penentu lain |
| 3 | 3 | kode | pemeriksa: ANGKA_TANPA_RUJUKAN: Pilihan a memuat angka di luar rujukan: 48, 106. Tulis tiap angka sebagai [[fact_id/teks]]. · pemeriksa: ANGKA_TANPA_RUJUKAN: Pilihan c memuat angka di luar rujukan: 48.. Tulis tiap angka sebagai [[fact_id/teks]]. · pemeriksa: OPSI_PANJANG_TIMPANG: Panjang pilihan timpang: 42 lawan 75 karakter; yang terpendek harus ≥ 60% yang terpanjang. · pemeriksa: ANGKA_TANPA_RUJUKAN: Penjelasan memuat angka di luar rujukan: 1. Tulis tiap angka sebagai [[fact_id/teks]]. · pemeriksa: ANGKA_TAK_COCOK: Penjelasan: [[susp-2025-12-10/kartu 4]] menampilkan 4, yang tidak ada di fakt |

</details>

<details><summary>m2d13-deepseek-2: alasan penolakan per versi</summary>

| omongan | versi | berhenti | alasan |
|---|---|---|---|
| 1 | 1 | tulis-gagal | keluaran penulis tak terbaca dua kali |
| 2 | 1 | tulis-gagal | keluaran penulis tak terbaca dua kali |
| 3 | 1 | tulis-gagal | keluaran penulis tak terbaca dua kali |
| 1 | 2 | tulis-gagal | keluaran penulis tak terbaca dua kali |
| 2 | 2 | tulis-gagal | keluaran penulis tak terbaca dua kali |
| 3 | 2 | tulis-gagal | keluaran penulis tak terbaca dua kali |
| 1 | 3 | tulis-gagal | keluaran penulis tak terbaca dua kali |
| 2 | 3 | tulis-gagal | keluaran penulis tak terbaca dua kali |
| 3 | 3 | tulis-gagal | keluaran penulis tak terbaca dua kali |

</details>

## 3. Tabel per penulis

| penulis | jalan (tersensor) | lulus ≤ 3 versi | lulus ≤ 2 versi (post-hoc) | V̄ versi/omongan | versi per omongan lulus | distribusi berhenti (versi) | terbit | biaya | biaya per omongan lulus | panggilan penulis (terpotong) · token masuk/keluar/penalaran | kunci pilihan-saja (H1b) | kunci pesan+pilihan | mutu GLM (rata, n, layak) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Opus 5.5 | 2 (2) | 2/6 | 2/6 | 2,67 | 6,00 | penebak 4, kode 5, kartu 1, lolos 2 | 0 | US$0.7825 (penulis US$0.6516) | US$0.3912 | 4 (0) · 39209/24737/13152 | 28 % [19 %–39 %] (kepekaan 33 %; n 78, tak terbaca 6; butir 7) | 32 % (n 84) | 10,00 (2, 2) |
| Haiku 4.5 | 2 (0) | 0/6 | 0/6 | 3,00 | — | kode 17, penebak 1 | 0 | US$0.1771 (penulis US$0.1614) | — | 6 (0) · 53982/21476/5378 | 44 % [19 %–73 %] (kepekaan 58 %; n 9, tak terbaca 3; butir 1) | 8 % (n 12) | 9,00 (3, 2) |
| DeepSeek V4.1 Flash | 2 (0) | 0/6 | 0/6 | 3,00 | — | tulis-gagal 18 | 0 | US$0.0455 (penulis US$0.0455) | — | 12 (12) · 62608/96000/80463 | — (kepekaan —; n 0, tak terbaca 0; butir 0) | — (n 0) | — (0, 0) |

**Penilai GLM:** pra-registrasi (effort "medium") sah 1/18 butir (penjaga penalaran 500 token; US$0.0417). Skor mutu di laporan ini dari **amandemen teknis effort "high"** (setelan kritikus; rubrik, butir, penjaga, `max_tokens` sama) — `eval/keluaran-m2d13/mutu/glm-tinggi.json`.

GLM menilai 7/18 butir sebelum pagu D-D US$0,40 habis (urutan buta, sehingga butir yang tidak dinilai acak); 6/7 diberi 10/10. **Tafsiran:** dengan rubrik ini GLM nyaris tidak membedakan (efek langit-langit) — skor mutu GLM tidak cukup untuk membandingkan penulis; bagian mutu H4 bergantung pada penilai Opus.

Pembanding mutu GLM: templat TIRT-7 10,00 (n 2, layak 2); DADA tayang — (n 0, layak 0). Skala 0–10 (rubrik pra-registrasi §7). Templat M2d-11 butuh 29 versi untuk 3 omongan lulus (9,7 versi per omongan lulus).

## 4. Hipotesis

### H1 — keluaran LLM berpola khas yang mudah dikenali LLM

- **H1a (prior huruf penebak, semua jawaban rotasi D-B): tak bisa disimpulkan.** Haiku a/b/c/d 9/22/14/10 → b 40 % (n 55; n < 200, tak terukur); DeepSeek a/b/c/d 12/18/12/22 → d 34 % (n 64; n < 200, tak terukur); GLM a/b/c/d 14/19/17/14 → b 30 % (n 64; n < 200, tak terukur). Ambang: satu huruf ≥ 0,32 dengan n ≥ 200; ≥ 2 dari 3 = mendukung.
- **H1b (kunci pilihan-saja, butir rotasi D-B): tak bisa disimpulkan.** Gabungan 30 % [21 %–40 %] (n 87 jawaban terbaca, tak terbaca 9; kepekaan 36 %); per penulis Opus 5.5 28 %, Haiku 4.5 44 %, DeepSeek V4.1 Flash —. Ambang: gabungan ≥ 0,40 dan ≥ 2 penulis ≥ 0,35 = mendukung; gabungan ≤ 0,30 = tidak.
- **H1c (deskriptif, huruf kunci pilihan penulis per versi):** Opus 5.5 a/b/c/d 1/9/1/1; Haiku 4.5 a/b/c/d 7/5/6/0; DeepSeek V4.1 Flash a/b/c/d 0/0/0/0.

### H2 — penebak sekeluarga buta terhadap bocoran penulisnya

- **Putusan (pesan+pilihan, rotasi tiga keluarga): tak bisa disimpulkan.** Δ_DS —, Δ_H — (semodel Haiku→Haiku: —); butir rotasi DeepSeek 0, Anthropic 8. Pilihan-saja (pelengkap): Δ_DS —, Δ_H —. Ambang: keduanya ≤ −0,10 = mendukung; keduanya ≥ 0 = tidak.

| penulis | kondisi | Haiku | DeepSeek | GLM |
|---|---|---|---|---|
| Opus 5.5 | pilihan-saja | 36 % (n 22, tak 6) | 25 % (n 28, tak 0) | 25 % (n 28, tak 0) |
| Opus 5.5 | pesan-pilihan | 25 % (n 28, tak 0) | 39 % (n 28, tak 0) | 32 % (n 28, tak 0) |
| Haiku 4.5 | pilihan-saja | 100 % (n 1, tak 3) | 25 % (n 4, tak 0) | 50 % (n 4, tak 0) |
| Haiku 4.5 | pesan-pilihan | 0 % (n 4, tak 0) | 0 % (n 4, tak 0) | 25 % (n 4, tak 0) |
| DeepSeek V4.1 Flash | pilihan-saja | — (n 0, tak 0) | — (n 0, tak 0) | — (n 0, tak 0) |
| DeepSeek V4.1 Flash | pesan-pilihan | — (n 0, tak 0) | — (n 0, tak 0) | — (n 0, tak 0) |

**Pembaur jenis soal (wajib):** penulis memilih sudutnya sendiri. Sebaran kartu penentu (sudut) dan label pengecoh per penulis, atas semua versi terbaca:

- Opus 5.5: sudut volume-2025-12-10 4, susp-2025-12-10 3, hari-naik-beruntun 2, naik-2025-11-26-2025-12-09 1, susp-2025-01-21 1, kelipatan-2025-11-26-2025-12-09 1; label salah-periode 13, salah-entitas 6, sebagian-benar 6, percaya-otoritas 5, pertanyaan-lain 4, nyaris-benar-angka 2.
- Haiku 4.5: sudut susp-2025-12-10 9, susp-2025-01-21 6, naik-2025-11-26-2025-12-09 3, kelipatan-2025-11-26-2025-12-09 3; label salah-periode 16, salah-entitas 9, sebagian-benar 8, nyaris-benar-angka 6, pertanyaan-lain 4, percaya-otoritas 3, percaya-omongan-tanpa-cek 2.
- DeepSeek V4.1 Flash: sudut —; label —.

- **H2-Opus (auditor Opus tanpa kartu, D-C): tak bisa disimpulkan.** Opus pada butir Opus 71 % (17/24), pada butir DeepSeek — (0/0); GLM (rotasi, versi akhir) 0 % vs —; selisih —.

### H3 — keluaran Haiku terasa "masuk akal" bagi Opus

- **H3a (auditor Opus): tak bisa disimpulkan.** Opus pada butir Haiku 63 % (15/24), pada butir DeepSeek —; GLM 25 % vs —; selisih —.
- **H3b (self-preference penilai): tak bisa disimpulkan.** S = — (Opus − GLM pada butir Anthropic dikurangi pada butir DeepSeek).

### Kesepakatan dua penilai

n 7 butir; ρ Spearman total 0,62; rata-rata |selisih| 2,29; layak tayang sama 4/7.

| asal | GLM | Opus |
|---|---|---|
| opus | 10,00 | 8,83 |
| haiku | 9,00 | 5,00 |
| deepseek | — | — |
| templat-m2d11 | 10,00 | 7,67 |
| tayang-dada | — | 8,00 |

### H4 — Opus 5.5 tanpa penyempurna: soal lebih baik, revisi lebih sedikit (effort "low")

- **Putusan (semua jalan): tak bisa disimpulkan — SEMENTARA (mutu GLM saja; penilai Opus menunggu reviewer).** L_Opus 2 vs max lain 0 (ya ≥ +1); V̄_Opus 2.67 vs min lain 3.00 (ya); versi/omongan lulus 6.00 < 9,7: ya; mutu hanya dari satu penilai → bagian mutu sementara; "mendukung" tidak mungkin
- **Tanpa jalan tersensor** (tersensor: m2d13-opus-1, m2d13-opus-2): tak bisa dihitung (ada penulis tanpa jalan tak tersensor).
- **Post-hoc, bukan pra-registrasi** (perbandingan adil bila jalan Opus terpotong sebelum versi 3): lulus dalam ≤ 2 versi — Opus 5.5 2/6, Haiku 4.5 0/6, DeepSeek V4.1 Flash 0/6.

## 5. Draf terbaik tiap penulis

Jalan dengan omongan lulus terbanyak (seri: jalan pertama). Label pengecoh dan umpan balik ditulis penulis; isi label tidak divalidasi kode (hanya struktur). Tidak dipasang ke produk.

### Opus 5.5 — m2d13-opus-2 (2/3 lulus)

**Omongan 1** — versi 2, **LULUS**; kunci b; kartu susp-2025-12-10, susp-2025-01-21, rups-2025-09-25 (penentu susp-2025-01-21)

Pesan (Sinta, 16.20): "Ini bukan pertama kali disetop lho, awal tahun juga pernah. Alasannya sama kayak sekarang, harganya naik kenceng."

- a) Betul, penghentian awal tahun juga karena harga naik tajam. — _percaya-otoritas_ (susp-2025-01-21): Ini percaya omongan tanpa cek: kartu 2 menyebut alasan awal tahun adalah keraguan atas kelangsungan usaha, bukan kenaikan harga.
- b) Keliru, penghentian awal tahun karena bursa ragu usahanya berlanjut. ← kunci
- c) Betul, keduanya disebut bursa sebagai perlindungan bagi investor. — _sebagian-benar_ (susp-2025-01-21): Ini sebagian benar: perlindungan investor memang disebut, tetapi hanya di kartu Desember. Kartu 2 tidak menyebutnya.
- d) Keliru, kartu awal tahun itu jadwal rapat, bukan penghentian. — _salah-entitas_ (rups-2025-09-25): Ini salah entitas: kartu 3 memang jadwal rapat, tetapi penghentian awal tahun tetap tercatat di kartu lain.

Penjelasan: Ada dua kartu penghentian dengan alasan berbeda. Kartu 21 Januari 2025 menyebut bursa menilai ada keraguan atas kelangsungan usaha perusahaan. Kartu 10 Desember 2025 yang menyebut kenaikan harga dan perlindungan bagi investor. Frasa perlindungan investor hanya ada di kartu Desember. Kartu rapat pemegang saham hanya berisi jadwal rapat, tidak terkait penghentian. Salah-kaprah yang umum: mengira semua penghentian oleh bursa punya alasan yang sama.

Pertanyaan cek: Alasan resmi apa yang tertulis di kartu penghentian tanggal itu?

**Omongan 2** — versi 2, tidak lulus; kunci b; kartu harga-2025-11-26, harga-2025-12-09, kelipatan-2025-11-26-2025-12-09, naik-2025-11-26-2025-12-09 (penentu kelipatan-2025-11-26-2025-12-09)

Pesan (Wulan, 19.45): "Gw cek, dari Rp48 ke Rp106 dalam dua mingguan. Berarti harganya udah lebih dari dua kali lipat ya?"

- a) Keliru, naiknya Rp58, belum sampai dua kali lipat. — _nyaris-benar-angka_ (naik-2025-11-26-2025-12-09): Ini angka nyaris benar: kartu 4 mencatat selisih harga, bukan kelipatan. Selisihnya malah lebih besar dari harga awal.
- b) Betul, kartu hitungan mencatat 2,21 kali penutupan awal. ← kunci
- c) Betul, kelipatan 2,21 kali itu dihitung sejak awal tahun. — _salah-periode_ (kelipatan-2025-11-26-2025-12-09): Ini salah periode: kartu 3 menghitung kelipatan sejak akhir November, bukan sejak awal tahun.
- d) Keliru, kenaikan Rp58 itu terjadi bertahap, bukan sekaligus. — _pertanyaan-lain_ (kelipatan-2025-11-26-2025-12-09): Ini menjawab pertanyaan lain: soalnya berapa kali lipat, dan kartu 3 menjawab lebih dari dua kali.

Penjelasan: Kartu hitungan mencatat harga penutupan 9 Desember 2025 adalah 2,21 kali harga penutupan 26 November 2025. Lebih dari dua kali lipat, jadi Wulan betul. Angka Rp58 adalah selisihnya, bukan kelipatannya. Selisih itu malah lebih besar dari harga awal. Hitungannya dimulai akhir November, bukan awal tahun. Salah-kaprah yang umum: mencampur selisih rupiah dengan kelipatan harga.

Pertanyaan cek: Angka di kartu ini selisih atau kelipatan?

**Omongan 3** — versi 2, **LULUS**; kunci b; kartu volume-2025-12-10, volume-2025-12-09, susp-2025-12-10, volume-2025-11-26 (penentu volume-2025-12-10)

Pesan (Yoga, 21.10): "Hari ini volumenya 1.461.200 lembar, rame banget yang jual-beli."

- a) Betul, angka itu tercatat di kartu volume hari ini. — _salah-periode_ (volume-2025-12-09): Ini salah periode: angka itu ada di kartu 2, bertanggal sehari sebelum perdagangan dihentikan.
- b) Keliru, kartu volume hari ini mencatat tidak ada transaksi. ← kunci
- c) Betul, bursa menyetopnya karena transaksinya terlalu ramai. — _percaya-otoritas_ (susp-2025-12-10): Ini percaya omongan tanpa cek: kartu 3 menyebut alasan penghentian adalah kenaikan harga, bukan ramainya transaksi.
- d) Keliru, angka itu milik kartu volume akhir November. — _salah-periode_ (volume-2025-11-26): Ini salah periode: kartu 4 untuk akhir November mencatat angka lain. Angka itu milik sehari sebelum penghentian.

Penjelasan: Kartu volume 10 Desember 2025 mencatat 0 lembar, karena hari itu perdagangan dihentikan. Angka 1.461.200 lembar milik 9 Desember 2025, sehari sebelumnya. Akhir November volumenya 178.100 lembar. Alasan penghentian adalah kenaikan harga, bukan ramainya transaksi. Salah-kaprah yang umum: memakai angka terbaru yang terlihat tanpa mengecek tanggal di kartunya.

Pertanyaan cek: Tanggal berapa yang tertulis di kartu angka ini?

### Haiku 4.5 — m2d13-haiku-1 (0/3 lulus)

**Omongan 1** — versi 3, tidak lulus; kunci a; kartu susp-2025-12-10, susp-2025-01-21 (penentu susp-2025-12-10)

Pesan (Arif, 21.45): "Bursa stop T hari ini karena harga naik signifikan ya? Ini cooling down deh."

- a) Betul, alasan resminya peningkatan harga untuk perlindungan investor. ← kunci
- b) Keliru, penghentian hari ini adalah karena keraguan atas usaha perusahaan. — _salah-periode_ (susp-2025-01-21): Alasan itu tepat untuk kartu 2 (penghentian Januari), bukan penghentian hari ini yang disebabkan kenaikan harga — salah periode.
- c) Betul, cooling down adalah nama resmi tindakan bursa hari ini. — _sebagian-benar_ (susp-2025-12-10): Nama tindakannya benar, tetapi kartu 1 menyebutkan alasan resminya adalah kenaikan harga — sebagian benar saja.
- d) Keliru, tindakan bursa hari ini bukan respons terhadap kenaikan harga. — _salah-entitas_ (susp-2025-12-10): Kartu 1 menunjukkan penghentian hari ini justru karena kenaikan harga — salah entitas.

Penjelasan: Pengumuman 10 Desember 2025 menyebut alasan penghentian adalah peningkatan harga kumulatif yang signifikan, dalam rangka cooling down untuk perlindungan investor — persis dengan ucapan Arif. Penghentian 21 Januari 2025 memiliki alasan berbeda: keraguan atas kelangsungan usaha. Kedua peristiwa berbeda penyebabnya. Salah-kaprah yang umum: mengira setiap penghentian perdagangan adalah sinyal masalah fundamental perusahaan.

Pertanyaan cek: Apa alasan penghentian yang tercatat di pengumuman itu?

**Omongan 2** — versi 3, tidak lulus; kunci b; kartu susp-2025-01-21, susp-2025-12-10 (penentu susp-2025-01-21)

Pesan (Indra, 19.30): "Pernah ada penghentian di Januari juga, tapi penyebabnya beda."

- a) Keliru, kedua penghentian terjadi karena hal yang mirip satu sama lain. — _sebagian-benar_ (susp-2025-01-21): Betul ada perbedaan, tetapi pernyataan Indra memastikan perbedaan itu ada — bukan keliru. Baca kartu 1 untuk alasan masing-masing — sebagian benar.
- b) Betul, penghentian Januari terjadi karena keraguan atas kelangsungan usaha. ← kunci
- c) Betul, penghentian hari ini juga disebabkan keraguan fundamental. — _salah-entitas_ (susp-2025-12-10): Kartu 2 menunjukkan penghentian hari ini adalah karena kenaikan harga, bukan keraguan fundamental — salah entitas.
- d) Keliru, penghentian Januari adalah respons atas keraguan fundamental, tidak sama dengan hari ini. — _percaya-otoritas_ (susp-2025-12-10): Penghentian Januari memang karena keraguan fundamental, tetapi penghentian hari ini bukan — lihat kartu 2 sebelum setuju — percaya omongan tanpa cek.

Penjelasan: Indra benar. Penghentian 21 Januari 2025 dicatat karena keraguan atas kelangsungan usaha perusahaan — faktor fundamental. Penghentian 10 Desember 2025 disebabkan peningkatan harga kumulatif — faktor teknis pasar. Dua penyebab yang sangat berbeda, bukan sama-sama masalah perusahaan. Salah-kaprah yang umum: mengira setiap penghentian adalah sinyal keraguan fundamental, padahal cooling down adalah mekanisme perlindungan teknis pasar.

Pertanyaan cek: Apa perbedaan alasan kedua penghentian itu?

**Omongan 3** — versi 3, tidak lulus; kunci a; kartu harga-2025-11-26, harga-2025-12-09, naik-2025-11-26-2025-12-09 (penentu naik-2025-11-26-2025-12-09)

Pesan (Siti, 18.15): "Aku lihat dari akhir November sampai kemarin harganya naik Rp58."

- a) Betul, hitungan Siti mencocok dengan catatan kenaikan nominal harga. ← kunci
- b) Keliru, Rp58 adalah angka kelipatan harga, bukan kenaikan. — _salah-entitas_ (kelipatan-2025-11-26-2025-12-09): Rp58 adalah selisih nominal, bukan kelipatan. Angka kelipatan ada di kartu 3 sebagai nilai lain — salah entitas.
- c) Betul, periode dari 26 November ke 9 Desember tepat. — _nyaris-benar-angka_ (harga-2025-11-26): Tanggal itu memang tercatat di kartu 1, tetapi ini mengacaukan kesimpulan tentang angka kenaikan itu sendiri — angka nyaris benar.
- d) Keliru, angka itu milik penghentian hari ini, bukan kenaikan harga periode itu. — _salah-periode_ (susp-2025-12-10): Rp58 adalah angka harga dari dua tanggal berbeda, bukan dari pengumuman penghentian hari ini — salah periode.

Penjelasan: Kenaikan Rp58 per lembar adalah angka yang tercatat di kartu. Periode "akhir November sampai kemarin" menunjuk rentang yang tepat, sebab harga 26 November adalah Rp48 per lembar dan harga 9 Desember adalah Rp106 per lembar. Selisihnya memang Rp58. Siti membaca dengan tepat. Salah-kaprah yang umum: mencampur antara kenaikan nominal dalam rupiah dengan kelipatan harga yang merupakan angka lain.

Pertanyaan cek: Berapa besaran kenaikan nominal harga antara dua tanggal itu?

### DeepSeek V4.1 Flash — m2d13-deepseek-1 (0/3 lulus)

(tidak ada versi terbaca)
(tidak ada versi terbaca)
(tidak ada versi terbaca)
## 6. Biaya nyata (ledger `usage.cost`, tag `m2d13/` + `penyusun/m2d13-`)

| model | entri | biaya |
|---|---|---|
| anthropic/claude-haiku-4.5 | 79 | US$0.2240 |
| anthropic/claude-opus-5.5 | 4 | US$0.6516 |
| deepseek/deepseek-v4.1-flash | 82 | US$0.0521 |
| z-ai/glm-5.3 | 110 | US$0.4027 |
| **total** | 275 | **US$1.3304** |

Bagian: D-B US$1.0050 (pagu US$2.1000); D-D penilai GLM US$0.3254 (pagu US$0.4000). Kumulatif ledger US$18.7040 (4824 entri).

## 7. Keterbatasan

- n kecil (≤ 18 omongan, satu sampel per panggilan penulis), satu emiten (TIRT) dan satu tanggal; LLM bukan pemula — mutu yang diukur adalah mutu menurut penilai LLM.
- Prompt, rubrik, teladan DADA, eksekutor dan reviewer semuanya keluarga Anthropic (pembaur H3/H4).
- Pagu jalan pra-registrasi: Opus US$0,60. Dengan effort "low" penulis Opus tetap berpikir ~3.000–4.600 token per panggilan (US$0,15–0,20), dan perkiraan maksimum panggilan berikutnya (≈ US$0,25) dicek sebelum kirim — jalan Opus bisa terpotong sebelum versi 3 (tersensor; aturan pra-registrasi §6). Perbandingan "≤ 2 versi" di H4 adalah post-hoc.
- Ketepatan isi label pengecoh tidak diperiksa kode (hanya struktur); dinilai penilai mutu (kriteria 2).
- Angka yang ditulis dengan kata tidak diperiksa aturan angka-di-kartu.
- Penyedia OpenRouter bisa berganti antar panggilan (dicatat di jejak/ledger).

## 8. Menunggu reviewer

- **Audit Opus satu soal (D-C):** sudah dinilai — `eval/keluaran-m2d13/audit-opus/` (PETUNJUK.md).
- **Penilai mutu Opus (D-D):** sudah dinilai — `eval/keluaran-m2d13/mutu-opus/` (PETUNJUK.md).
- Sesudah keduanya: `npm run penulis:audit -- --nilai`, `npm run penulis:mutu -- --nilai-opus`, `npm run penulis:laporan`.

