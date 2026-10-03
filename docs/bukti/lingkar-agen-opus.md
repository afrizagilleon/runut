# Lingkar agen M2d-15 — Opus 5.5 ditingkatkan: prompt v2 (aturan gerbang kode), pra-periksa kode gratis, bank sudut (effort "medium" gagal teknis; diuji pada effort "low" sesudah amandemen T2)

> Laporan ini dibangun skrip (`npm run opus:laporan`, `factory/llm/bebas/laporan-opus.ts`) dari keluaran tersimpan (`eval/penyusun/m2d15-opus-*/`, `eval/keluaran-m2d15/`, pembanding M2d-11 & M2d-13) dan ledger OpenRouter. Kalimat bertanda **Tafsiran** adalah bacaan eksekutor. Pra-registrasi: `docs/bukti/m2d15-praregistrasi.md` (commit f98427f, sebelum panggilan berbayar pertama) + amandemen pra-data `docs/bukti/m2d15-amandemen-A1.md` (A1 label bank, A2 pagu jalan US$2,00, A3 tag `m2d15/`; commit 36f7cca) + amandemen teknis `docs/bukti/m2d15-amandemen-teknis-T1.md` (commit 9ac55e1) dan `docs/bukti/m2d15-amandemen-T2.md` (commit c18e1e7) — semuanya di-commit sebelum panggilan berbayar yang dipengaruhinya, dan dites.

## Ringkasan

- **Jalan:** 3 (2 pra-registrasi + 1 amandemen T2; maks 3). m2d15-opus-1: tidak terbit; m2d15-opus-2: tidak terbit; m2d15-opus-3: tersensor (tidak terbit).
- **Jalan 3 (effort "low" + prompt v2 + pra-periksa + bank sudut):** 1/3 omongan lulus gerbang, 6 versi, 1 tersensor pagu sebelum versi 3; biaya US$0.6395. **Tidak ada simulasi utuh yang lulus gerbang (a).**
- **Omongan lulus gerbang (≤ 3 versi), semua jalan:** 1/9; versi 12 (tulis-gagal 6); versi per omongan lulus 12,00 (Opus M2d-13 6,00; templat M2d-11 9,67).
- **Biaya:** D-4 (jalan) US$2.5654; penilai GLM US$0.3269 dari US$0.4346; milestone US$2.8922 dari US$3.00 (termasuk perkiraan maksimum, lihat Penyimpangan). Kumulatif ledger US$14.1599 (3370 entri).

## Penyimpangan, amandemen, dan keputusan eksekutor

- **Amandemen pra-data A1–A3** (reviewer, sebelum panggilan berbayar): label "terbukti" bank sudut juga butuh tertebak penebak ≤ 0,5; pagu jalan US$2,00; tag `m2d15/` diizinkan. Dites.
- **Amandemen teknis T1** (aturan pra-registrasi §9 butir kedua): dua panggilan penulis pertama jalan 1 (effort "medium") habis di max_tokens 16.000 tanpa JSON → `reasoning.max_tokens` 8.000 untuk sisa milestone (`docs/bukti/m2d15-amandemen-teknis-T1.md`). Proses jalan 1 dihentikan eksekutor.
- **Henti-rugi jalan 2 (penyimpangan, keputusan eksekutor; diterima reviewer):** panggilan pertama jalan 2 dengan `reasoning.max_tokens` 8.000 juga memakai 16.000 token penalaran dan berhenti tanpa JSON. T1 menulis "jalan berlanjut menurut aturan tulis-gagal", tetapi eksekutor menghentikan proses jalan 2 supaya sisa pagu tidak terbakar (±US$0,37 per panggilan tanpa keluaran terbaca). Jalan 2 = tidak terbit; tidak ada gerbang atau patokan yang berubah. (Di `eval/penyusun/m2d15-opus-2/dihentikan.json` disebut "henti-rugi T2" — itu bukan amandemen T2 di bawah.)
- **Amandemen teknis T2** (reviewer + izin pemilik, `docs/bukti/m2d15-amandemen-T2.md`): penulis effort "low" (setelan M2d-13 yang terbukti terbaca di Azure), `max_tokens` 16.000, prompt v2 + bank A1 + pra-periksa + aturan versi sama; penjaga probe dulu (panggilan pertama tanpa JSON, atau panggilan mana pun yang habis di max_tokens tanpa JSON → jalan berhenti tanpa ulangan); satu jalan tambahan `m2d15-opus-3` dengan pagu = US$3,00 − biaya milestone termasuk perkiraan. **Jalan ini menguji prompt v2 + pra-periksa + bank sudut pada effort "low"; effort "medium" TIDAK teruji.**
- **Biaya perkiraan maksimum di ledger:** 2 panggilan penulis yang sudah terkirim saat proses dihentikan dicatat konservatif US$0.8256 (penyusun/m2d15-opus-1/p2/tulis-bebas, penyusun/m2d15-opus-2/p1/tulis-bebas/u1); tagihan sebenarnya tidak diketahui, paling banyak sebesar itu. Biaya nyata `usage.cost` US$2.0666.
- **Panggilan penulis yang tercatat (token, penyedia):** m2d15-opus-1/p1/tulis-bebas: keluar 16000, penalaran 16000, penyedia Azure (diminta {"effort":"medium"}); m2d15-opus-1/p1/tulis-bebas/u1: keluar 16000, penalaran 14372, penyedia Azure (diminta {"effort":"medium"}); m2d15-opus-2/p1/tulis-bebas: keluar 16000, penalaran 16000, penyedia Azure (diminta {"max_tokens":8000}); m2d15-opus-3/p1/tulis-bebas: keluar 6820, penalaran 3976, penyedia Azure (diminta {"effort":"low"}); m2d15-opus-3/p1/tulis-praperiksa/k1: keluar 3376, penalaran 2379, penyedia Azure (diminta {"effort":"low"}); m2d15-opus-3/p2/tulis-bebas: keluar 8919, penalaran 6069, penyedia Azure (diminta {"effort":"low"}).

**Temuan negatif teknis.** Lewat OpenRouter (penyedia Azure), Opus 5.5 dengan effort "low" berpikir 2,6–4,6 rb token (M2d-13), tetapi dengan effort "medium" — dan juga dengan batas eksplisit `reasoning.max_tokens` 8.000 — berpikir sampai seluruh 16.000 token habis (3 dari 3 panggilan yang punya respons) tanpa JSON. Anggaran penalaran yang diminta diabaikan. Karena itu **effort "medium" tidak teruji** untuk mutu soal di milestone ini; bukan bukti bahwa Opus dengan penalaran lebih panjang menulis lebih buruk.

**Pilihan bila effort "medium" ingin diuji lagi (tidak dijalankan):** `max_tokens` ±32.000 — perkiraan maksimum sebelum kirim ±US$0,73 per panggilan, biaya nyata ±US$0,40 (≈ 16 rb penalaran + 3 rb jawaban), sehingga satu jalan 3 versi butuh pagu ±US$3.

## 1. Jalan D-4 (hasil vs patokan §2)

Setelan: Opus 5.5, `max_tokens` 16.000, suhu 1,0; penalaran `reasoning.effort: "medium"` (pra-registrasi) di jalan 1, `reasoning.max_tokens` 8.000 (amandemen T1) di jalan 2, `reasoning.effort: "low"` + penjaga probe (amandemen T2) di jalan 3; prompt v2 + bank sudut beku (A1); pra-periksa ≤ 2 tulis-ulang per versi; pagu jalan 1–2 min(US$2.00; US$2,70 − biaya sebelumnya) (A2), jalan 3 = sisa pagu milestone (T2). Paket TIRT-7 sha256 f7cabc6b….

| jalan | kelas | versi per omongan (berhenti) | tulis-ulang pra-periksa | panggilan penulis (terpotong) · token masuk/keluar/penalaran | biaya penulis | biaya gerbang | total | sha prompt | berhenti |
|---|---|---|---|---|---|---|---|---|---|
| m2d15-opus-1 | tidak terbit | o1: tulis-gagal; o2: tulis-gagal; o3: tulis-gagal | 0 dikirim, 0 dilewati pagu | 3 (2) · 23376/32000/30372 · penyedia — | US$1.1477 | US$0.0000 | US$1.1477 | … | Jalan 1 M2d-15 dihentikan eksekutor (PID 10544) untuk amandemen teknis T1 (pra-registrasi §9 butir kedua; docs/bukti/m2d15-amandemen-teknis-T1.md). Pintu tidak menulis hasil.json. |
| m2d15-opus-2 | tidak terbit | o1: tulis-gagal; o2: tulis-gagal; o3: tulis-gagal | 0 dikirim, 0 dilewati pagu | 2 (1) · 11688/16000/16000 · penyedia — | US$0.7782 | US$0.0000 | US$0.7782 | … | Jalan 2 M2d-15 dihentikan eksekutor (PID 14972) sebagai henti-rugi T2: setelan amandemen teknis T1 (reasoning.max_tokens 8.000) juga diabaikan — panggilan penulis pertama memakai 16.000 token penalara |
| m2d15-opus-3 | tersensor (tidak terbit) | o1: penebak→penebak; o2: penebak→penebak; o3: penebak→lolos | 1 dikirim, 0 dilewati pagu | 3 (0) · 42318/19115/12424 · penyedia Azure | US$0.5516 | US$0.0879 | US$0.6395 | 30cc130e6179… | terpotong pagu: PaguMilestoneTercapai: Pagu milestone tercapai: biaya milestone (tag penyusun/m2d15-opus-3/*) US$0.639496 + perkiraan maksimum US$0.439500 untuk anthropic/claude-opus-5.5 > pagu milest |

<details><summary>m2d15-opus-1: pra-periksa dan alasan penolakan per versi</summary>

| versi | pra-periksa ke | omongan ditolak: jenis aturan | dilewati |
|---|---|---|---|

| omongan | versi | berhenti | alasan |
|---|---|---|---|
| 1 | 1 | tulis-gagal | keluaran penulis tak terbaca dua kali (max_tokens 16.000 habis untuk penalaran) |
| 2 | 1 | tulis-gagal | keluaran penulis tak terbaca dua kali (max_tokens 16.000 habis untuk penalaran) |
| 3 | 1 | tulis-gagal | keluaran penulis tak terbaca dua kali (max_tokens 16.000 habis untuk penalaran) |

</details>

<details><summary>m2d15-opus-2: pra-periksa dan alasan penolakan per versi</summary>

| versi | pra-periksa ke | omongan ditolak: jenis aturan | dilewati |
|---|---|---|---|

| omongan | versi | berhenti | alasan |
|---|---|---|---|
| 1 | 1 | tulis-gagal | keluaran penulis tak terbaca (max_tokens 16.000 habis untuk penalaran; jalan dihentikan, henti-rugi T2) |
| 2 | 1 | tulis-gagal | keluaran penulis tak terbaca (max_tokens 16.000 habis untuk penalaran; jalan dihentikan, henti-rugi T2) |
| 3 | 1 | tulis-gagal | keluaran penulis tak terbaca (max_tokens 16.000 habis untuk penalaran; jalan dihentikan, henti-rugi T2) |

</details>

<details><summary>m2d15-opus-3: pra-periksa dan alasan penolakan per versi</summary>

| versi | pra-periksa ke | omongan ditolak: jenis aturan | dilewati |
|---|---|---|---|
| 1 | 1 | o3: meresmikan 1 | — |

| omongan | versi | berhenti | alasan |
|---|---|---|---|
| 1 | 1 | penebak | tebak rotasi gagal: pesan-pilihan: kunci 8/12 (8,0/12); pilihan-saja: anthropic/claude-haiku-4.5 diabaikan (huruf "b" di ≥ 3/4 rotasi); pesan-pilihan: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: z-ai/glm-5.3 memilih isi kunci di ≥ 3/4 rotasi [pilihan-saja: claude-haiku-4.5 isi - (diabaikan), deepseek-v4.1-flash isi -, glm-5.3 isi -; pesan-pilihan: claude-haiku-4.5 isi opsi asal b, deepseek-v4.1-flash isi -, glm-5.3 isi opsi asal b] — kunci = pilihan b; tanpa kartu, penebak memilih isi kunci terlalu sering |
| 2 | 1 | penebak | tebak rotasi gagal: pesan-pilihan: kunci 6/12 (6,0/12); pilihan-saja: deepseek/deepseek-v4.1-flash diabaikan (huruf "c" di ≥ 3/4 rotasi); pilihan-saja: z-ai/glm-5.3 memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: z-ai/glm-5.3 memilih isi kunci di ≥ 3/4 rotasi [pilihan-saja: claude-haiku-4.5 isi -, deepseek-v4.1-flash isi - (diabaikan), glm-5.3 isi opsi asal b; pesan-pilihan: claude-haiku-4.5 isi opsi asal b, deepseek-v4.1-flash isi opsi asal a, glm-5.3 isi opsi asal b] — kunci = pilihan b; tanpa kartu, penebak memil |
| 3 | 1 | penebak | tebak rotasi gagal: pesan-pilihan: kunci 8/12 (8,0/12); pesan-pilihan: deepseek/deepseek-v4.1-flash memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: z-ai/glm-5.3 memilih isi kunci di ≥ 3/4 rotasi [pilihan-saja: claude-haiku-4.5 isi -, deepseek-v4.1-flash isi -, glm-5.3 isi -; pesan-pilihan: claude-haiku-4.5 isi -, deepseek-v4.1-flash isi opsi asal a, glm-5.3 isi opsi asal a] — kunci = pilihan a; tanpa kartu, penebak memilih isi kunci terlalu sering |
| 1 | 2 | penebak | tebak rotasi gagal: pesan-pilihan: kunci 3/12 (3,0/12); pesan-pilihan: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi [pilihan-saja: claude-haiku-4.5 isi -, deepseek-v4.1-flash isi -, glm-5.3 isi opsi asal a; pesan-pilihan: claude-haiku-4.5 isi opsi asal c, deepseek-v4.1-flash isi opsi asal d, glm-5.3 isi opsi asal d] — kunci = pilihan c; tanpa kartu, penebak memilih isi kunci terlalu sering |
| 2 | 2 | penebak | tebak rotasi gagal: pesan-pilihan: kunci 11/12 (11,0/12); pilihan-saja: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi; pilihan-saja: deepseek/deepseek-v4.1-flash memilih isi kunci di ≥ 3/4 rotasi; pilihan-saja: z-ai/glm-5.3 memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: anthropic/claude-haiku-4.5 memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: deepseek/deepseek-v4.1-flash memilih isi kunci di ≥ 3/4 rotasi; pesan-pilihan: z-ai/glm-5.3 memilih isi kunci di ≥ 3/4 rotasi [pilihan-saja: claude-haiku-4.5 isi opsi asal a, deepseek-v4.1-flash isi opsi asal a, glm-5.3 isi opsi asal  |
| 3 | 2 | lolos |  |

</details>

## 2. Audit Opus satu soal tanpa kartu (patokan §2 b — dijalankan reviewer)

**Menunggu reviewer.** Paket siap: `eval/keluaran-m2d15/audit-opus/` (satu soal × satu rotasi per berkas, kunci di luar `bahan/`, `PETUNJUK.md`). Sesudah dijalankan: `npm run opus:audit -- --nilai`, lalu `npm run opus:laporan`.

## 3. Kenapa Opus — efisien → efektif

Kolom "M2d-15 jalan 3" = effort "low" + prompt v2 + pra-periksa + bank sudut (amandemen T2) — pembanding langsung Opus M2d-13 (effort "low", prompt v1). Kolom "M2d-15 semua jalan" memasukkan dua jalan effort "medium"/batas 8.000 yang tidak menghasilkan JSON. **Effort "medium" tidak teruji.**

| | templat murah (M2d-11) | Opus 5.5 effort "low" (M2d-13) | M2d-15 jalan 3 (effort "low" + v2 + pra-periksa + bank) | M2d-15 semua jalan |
|---|---|---|---|---|
| jalan · omongan lulus gerbang | 7 jalan · 3 | 2 jalan · 2/6 (tersensor 2) | 1 jalan · 1/3 (tersensor 1) | 3 jalan · 1/9 (tersensor 1) |
| versi per omongan lulus | 9,67 (29 versi) | 6,00 | 6,00 | 12,00 |
| biaya per omongan lulus (termasuk perkiraan maksimum) | US$0.1462 (7 jalan, US$0.4385) | US$0.3912 | US$0.6395 | US$2.5654 |
| simulasi terbit | 1 (jalan ke-7) | 0 | 0 | 0 |
| kunci dipilih dari pilihan-saja (rotasi, terbaca; acak 25 %) | 35 % (n 263) | 28 % [19 %–39 %] (n 78) | 26 % [17 %–39 %] (n 57) | 26 % [17 %–39 %] (n 57) |
| kunci dari pesan+pilihan | — | 32 % (n 84) | 41 % (n 61) | 41 % (n 61) |
| mutu penilai Opus buta (0–10) | 7,67 (n 3, layak 2) | 8,83 (n 6, layak 5) | menunggu reviewer | sama |
| mutu penilai GLM "high" (0–10), paket M2d-15 | 10,00 (n 2, layak 2) | 10,00 (n 2, layak 2) (2 butir lulus) | 10,00 (n 3, layak 3) | sama |
| DADA tayang (pembanding) | Opus M2d-13 8,00 (n 3, layak 2) | | Opus M2d-15 —; GLM 10,00 (n 3, layak 3) | |

**Tafsiran.** Penilai GLM "high" memberi rata-rata 10,00 / 10,00 / 10,00 / 10,00 untuk semua asal — efek langit-langit yang sama dengan M2d-13; skor GLM tidak membedakan penulis. Pembanding mutu yang bermakna hanya penilai Opus buta (reviewer).

**Tafsiran (jalan 3).** Aturan kode di prompt + pra-periksa menurunkan penolakan kode: tulisan pertama ditolak aturan kode 1/6 versi (M2d-13: 5/12), dan tidak satu versi pun berhenti di gerbang 1 resmi. Tetapi penebak tetap menolak 5 dari 6 versi — masalahnya bergeser ke isi yang bisa ditebak tanpa kartu. Satu-satunya omongan lulus memakai sudut berlabel GAGAL (susp-2025-01-21; Opus tanpa kartu dulu 9/12), jadi audit (b) reviewer penting. n sangat kecil.

## 4. Penolakan per jenis — sebelum / sesudah aturan di prompt

| ukuran | Opus M2d-13 (effort "low", prompt v1, tanpa pra-periksa) | Opus M2d-15 (semua jalan; versi terbaca hanya dari jalan 3, effort "low" + prompt v2 + pra-periksa) |
|---|---|---|
| versi terbaca berhenti di gerbang 1 kode resmi | 5/12 | 0/6 |
| tulisan pertama tiap versi ditolak aturan kode (M2d-13: gerbang 1; M2d-15: pra-periksa ke-1) | 5/12 | 1/6 |
| jenis aturan pada tulisan pertama (versi per jenis) | D9 3, G-satu-klausa 2, G-angka-cukup 2, ANGKA_TANPA_RUJUKAN 1, angka-di-kartu 1, G-pilihan-kembar 1, D2 1 | meresmikan 1 |
| jenis aturan, semua pra-periksa | — | meresmikan 1 |
| jenis aturan di gerbang 1 resmi | D9 3, G-satu-klausa 2, G-angka-cukup 2, ANGKA_TANPA_RUJUKAN 1, angka-di-kartu 1, G-pilihan-kembar 1, D2 1 | — |
| berhenti di gerbang berbayar: penebak / kartu / kritikus | 4 / 1 / 0 | 5 / 0 / 0 |
| tulis-gagal · tersensor | 0 · 2 jalan | 6 · 1 jalan |

## 5. Sudut yang dipilih penulis (bank sudut A1)

| jalan | omongan | kartu penentu versi akhir | label bank | lulus |
|---|---|---|---|---|
| m2d15-opus-3 | 1 | volume-2025-12-10 | terbukti | tidak |
| m2d15-opus-3 | 2 | harga-2025-11-28, harga-2025-11-27 | belum dicoba, belum dicoba | tidak |
| m2d15-opus-3 | 3 | susp-2025-01-21 | gagal | ya |

## 6. Ramalan arah (pra-registrasi §8)

| ramalan | hasil | putusan |
|---|---|---|
| R1 versi berhenti di gerbang 1 kode ≤ 1/6 | 0/6 versi terbaca | sesuai |
| R2 lolos pra-periksa pada tulisan pertama versi 1 ≥ 2/3 | 2/3 (m2d15-opus-3; jalan sebelumnya tanpa tulisan terbaca) | sesuai |
| R3 jalan 1 terbit (a) | tidak terbit | tidak |
| R4 versi per omongan lulus ≤ 2,0 | 12,00 | tidak |
| R5 biaya per omongan lulus ≤ US$0,50 | US$2.5654 | tidak |
| R6 kunci pilihan-saja ≤ 30 % | 26 % (n 57) | sesuai |
| R7 ≥ 2 dari 3 omongan lulus dengan audit ≤ 2/4 (jalan terbit) | tidak ada jalan terbit | tak terukur (tidak ada jalan terbit) |
| R8 mutu Opus buta versi akhir ≥ 8,5 | menunggu reviewer | menunggu reviewer |

## 7. Draf lengkap (versi akhir tiap omongan)

Label pengecoh dan umpan balik ditulis penulis; isi label tidak divalidasi kode (hanya struktur). Tidak dipasang ke produk; tidak ada yang ditulis ke `cases/`.

### m2d15-opus-1 — tidak terbit

### m2d15-opus-2 — tidak terbit

### m2d15-opus-3 — tersensor (tidak terbit)

**Omongan 1** — versi 2, tidak lulus (berhenti: penebak); kunci c; kartu volume-2025-12-10, volume-2025-12-09, volume-2025-11-26 (penentu volume-2025-12-10)

Pesan (Sinta, 18.20): "Kemarin saham T ditransaksiin 1.461.200 lembar. Hari ini gw kira masih segitu juga, lu udah cek belum?"

- a) Betul, hari ini tercatat 1.461.200 lembar berpindah tangan. — _salah-periode_ (volume-2025-12-09): Ini salah periode: angka itu volume kemarin di kartu 2, bukan volume hari ini.
- b) Betul, hari ini tercatat 178.100 lembar berpindah tangan. — _nyaris-benar-angka_ (volume-2025-11-26): Ini angka nyaris benar: angka itu memang volume, tapi kartu 3 bertanggal akhir November, bukan hari ini.
- c) Keliru, hari ini tercatat 0 lembar berpindah tangan. ← kunci
- d) Keliru, hari ini lebih ramai dari kemarin, bukan sama. — _sebagian-benar_ (volume-2025-12-10): Ini sebagian benar: Sinta memang keliru, tapi kartu 1 menunjukkan hari ini kosong, bukan lebih ramai.

Penjelasan: Kartu volume bertanggal 10 Desember 2025 mencatat 0 lembar. Artinya hari ini tidak ada saham yang berpindah tangan sama sekali. Angka 1.461.200 lembar memang ada, tapi milik kemarin. Angka 178.100 lembar juga ada di kartu, tapi milik akhir November. Jadi hari ini bukan lebih ramai, malah kosong. Salah-kaprah yang umum: memakai angka kartu tanggal lain untuk menjawab soal hari ini, karena tidak melirik tanggal di kartunya.

Pertanyaan cek: Tanggal di kartu volume ini sama dengan hari yang sedang dibicarakan teman?

**Omongan 2** — versi 2, tidak lulus (berhenti: penebak); kunci a; kartu harga-2025-11-28, harga-2025-11-27, harga-2025-12-01, harga-2025-11-26 (penentu harga-2025-11-28, harga-2025-11-27)

Pesan (Wulan, 19.45): "Gw liat tanggal 28 November saham T tutup lebih tinggi dari hari sebelumnya. Lu inget nggak?"

- a) Betul, tutupnya Rp57 lebih tinggi dari Rp52 sehari sebelumnya. ← kunci
- b) Keliru, tutupnya Rp52 lebih rendah dari Rp57 sehari sebelumnya. — _salah-periode_ (harga-2025-11-27): Ini salah periode: kartu 2 menunjukkan angka itu milik sehari sebelumnya, jadi kedua tanggal tertukar.
- c) Betul, tutupnya Rp62 lebih tinggi dari Rp57 sehari sebelumnya. — _nyaris-benar-angka_ (harga-2025-12-01): Ini angka nyaris benar: angka itu penutupan di kartu 3, tanggalnya hari bursa berikutnya.
- d) Keliru, tutupnya Rp48 lebih rendah dari Rp52 sehari sebelumnya. — _sebagian-benar_ (harga-2025-11-26): Ini sebagian benar: angkanya memang ada, tapi kartu 4 bertanggal lebih awal, bukan tanggal yang ditanya.

Penjelasan: Kartu harga 28 November 2025 mencatat penutupan Rp57. Kartu sehari sebelumnya, 27 November 2025, mencatat Rp52. Jadi Wulan betul: harga tutupnya naik. Angka Rp62 dan Rp48 juga ada di kartu, tapi milik tanggal lain. Salah-kaprah yang umum: mengambil angka dari baris yang bersebelahan, sehingga harga dua hari tertukar.

Pertanyaan cek: Angka yang aku pakai berasal dari kartu bertanggal sama dengan omongan teman?

**Omongan 3** — versi 2, **LULUS gerbang**; kunci b; kartu susp-2025-01-21, susp-2025-12-10, rups-2025-09-25 (penentu susp-2025-01-21)

Pesan (Andi, 21.10): "Gw inget bursa juga pernah stop saham T bulan Januari. Alasannya sama kayak sekarang kan, harganya naik kekencengan, lu inget?"

- a) Betul, alasannya volume transaksi yang tiba-tiba melonjak. — _percaya-otoritas_ (susp-2025-01-21): Ini percaya omongan tanpa cek: kartu 1 tidak menyebut volume, alasannya soal kelangsungan usaha.
- b) Keliru, alasannya keraguan atas kelangsungan usaha. ← kunci
- c) Betul, alasannya cooling down untuk melindungi investor. — _salah-periode_ (susp-2025-12-10): Ini salah periode: alasan cooling down ada di kartu 2, pengumuman bulan Desember, bukan Januari.
- d) Keliru, alasannya keputusan rapat umum pemegang saham. — _salah-entitas_ (rups-2025-09-25): Ini salah entitas: kartu 3 hanya jadwal rapat pemegang saham, sedangkan penghentian diputuskan bursa.

Penjelasan: Pengumuman bursa 21 Januari 2025 memberi alasan yang lain sama sekali: bursa ragu usaha perusahaan bisa terus berjalan. Alasan cooling down karena harga naik terus baru muncul di pengumuman 10 Desember 2025. Rapat pemegang saham 25 September 2025 juga tidak ada hubungannya dengan penghentian itu. Salah-kaprah yang umum: mengira dua penghentian pada saham yang sama pasti punya alasan yang sama.

Pertanyaan cek: Alasan resmi apa yang tertulis di pengumuman bertanggal yang dibicarakan teman?

## 8. Biaya nyata (ledger `usage.cost`, tag `penyusun/m2d15-` + `m2d15/`)

| model | entri | biaya |
|---|---|---|
| anthropic/claude-haiku-4.5 | 58 | US$0.0443 |
| anthropic/claude-opus-5.5 | 8 | US$2.4775 |
| deepseek/deepseek-v4.1-flash | 59 | US$0.0043 |
| z-ai/glm-5.3 | 70 | US$0.3663 |
| **total** | 195 | **US$2.8922** |

Bagian: D-4 US$2.5654 (pagu US$2.70); penilai GLM US$0.3269. Kumulatif ledger US$14.1599.

## 9. Keterbatasan

- n sangat kecil: 1–2 jalan, ≤ 6 omongan, satu emiten (TIRT), satu tanggal, satu sampel per panggilan penulis.
- Empat perubahan sekaligus (effort, prompt v2, pra-periksa, bank sudut + pagu jalan): hasil tidak bisa diatribusikan ke satu faktor.
- Penulis, auditor (b), penilai Opus, eksekutor, reviewer sekeluarga (Anthropic); penilai GLM M2d-13 menunjukkan efek langit-langit.
- LLM bukan pemula: "layak tayang" = lulus gerbang + audit model, bukan bukti pemain belajar.
- Percobaan berulang (≤ 3 versi, ≤ 2 jalan, ≤ 2 tulis-ulang pra-periksa per versi) menaikkan peluang lulus karena kebetulan.
- Ketepatan isi label pengecoh tidak diperiksa kode; angka yang ditulis dengan kata tidak diperiksa aturan angka-di-kartu.

## 10. Bahan README & video (angka bersumber laporan ini)

- "Kami mulai dari efisien: mesin templat murah butuh 29 versi di 7 jalan untuk 3 omongan lulus (9,67 versi per omongan, US$0.1462 per omongan lulus). Opus 5.5 (effort "low") dengan aturan gerbang di prompt, pra-periksa kode gratis, dan bank sudut butuh 6,00 versi per omongan lulus (US$0.6395 per omongan lulus pada jalan itu); tanpa aturan itu (M2d-13) 6,00 versi. Menaikkan penalaran ke "medium" gagal teknis (penalaran tak bisa dibatasi lewat OpenRouter), sehingga biaya seluruh milestone US$2.8922." — sumber: §3 tabel, bagian Penyimpangan; amandemen T2.

## 11. Menunggu reviewer

- Audit Opus satu soal (§2 b): menunggu — `eval/keluaran-m2d15/audit-opus/`.
- Penilai mutu Opus buta: menunggu — `eval/keluaran-m2d15/mutu-opus/`.
- Sesudah keduanya: `npm run opus:audit -- --nilai`, `npm run opus:mutu -- --nilai-opus`, `npm run opus:laporan`.
