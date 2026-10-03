# Lingkar agen M2d-15 — Opus 5.5 ditingkatkan (penalaran lebih panjang — effort "medium", lalu 8.000 token sesudah amandemen T1 — aturan kode di prompt, pra-periksa kode gratis, bank sudut)

> Laporan ini dibangun skrip (`npm run opus:laporan`, `factory/llm/bebas/laporan-opus.ts`) dari keluaran tersimpan (`eval/penyusun/m2d15-opus-*/`, `eval/keluaran-m2d15/`, pembanding M2d-11 & M2d-13) dan ledger OpenRouter. Kalimat bertanda **Tafsiran** adalah bacaan eksekutor. Pra-registrasi: `docs/bukti/m2d15-praregistrasi.md` (commit f98427f, sebelum panggilan berbayar pertama) + amandemen pra-data `docs/bukti/m2d15-amandemen-A1.md` (A1 label bank, A2 pagu jalan US$2,00, A3 tag `m2d15/`; commit 36f7cca, juga sebelum panggilan berbayar; keduanya dites).

## Ringkasan

- **Jalan:** 2 dari maks 2. m2d15-opus-1: tidak terbit; m2d15-opus-2: tidak terbit.
- **Omongan lulus gerbang (≤ 3 versi):** 0/6; versi 6 (tulis-gagal 6); versi per omongan lulus — (Opus M2d-13 6,00; templat M2d-11 9,67).
- **Biaya nyata:** D-4 US$1.9259 dari US$2.70; penilai GLM US$0.0000 dari US$1.0741; milestone US$1.9259 dari US$3.00. Kumulatif ledger US$13.1935 (3180 entri).

## Penyimpangan, amandemen, dan keputusan eksekutor

- **Amandemen pra-data A1–A3** (reviewer, sebelum panggilan berbayar): label "terbukti" bank sudut juga butuh tertebak penebak ≤ 0,5; pagu jalan US$2,00; tag `m2d15/` diizinkan. Dites.
- **Amandemen teknis T1** (aturan pra-registrasi §9 butir kedua): dua panggilan penulis pertama jalan 1 (effort "medium") habis di max_tokens 16.000 tanpa JSON → `reasoning.max_tokens` 8.000 untuk sisa milestone (`docs/bukti/m2d15-amandemen-teknis-T1.md`). Proses jalan 1 dihentikan eksekutor.
- **Henti-rugi T2 (penyimpangan, keputusan eksekutor, tidak terdaftar):** panggilan pertama jalan 2 dengan `reasoning.max_tokens` 8.000 juga memakai 16.000 token penalaran dan berhenti tanpa JSON. Tidak ada amandemen lain yang terdaftar; T1 menulis "jalan berlanjut menurut aturan tulis-gagal", tetapi eksekutor menghentikan proses jalan 2 supaya sisa pagu tidak terbakar (±US$0,37 per panggilan tanpa keluaran terbaca; bila dilanjutkan, ±4 panggilan lagi sampai pagu jalan habis). Akibatnya: jalan 2 = tidak terbit, sama dengan hasil yang hampir pasti bila dilanjutkan; tidak ada gerbang atau patokan yang berubah.
- **Biaya perkiraan maksimum di ledger:** 2 panggilan penulis yang sudah terkirim saat proses dihentikan dicatat konservatif US$0.8256 (penyusun/m2d15-opus-1/p2/tulis-bebas, penyusun/m2d15-opus-2/p1/tulis-bebas/u1); tagihan sebenarnya tidak diketahui, paling banyak sebesar itu. Biaya nyata `usage.cost` US$1.1003.
- **Token penulis yang tercatat:** m2d15-opus-1/p1/tulis-bebas: keluar 16000, penalaran 16000 (diminta {"effort":"medium"}); m2d15-opus-1/p1/tulis-bebas/u1: keluar 16000, penalaran 14372 (diminta {"effort":"medium"}); m2d15-opus-2/p1/tulis-bebas: keluar 16000, penalaran 16000 (diminta {"max_tokens":8000}).
- **Akibat untuk D-5:** 0 omongan terbaca → paket audit Opus satu soal kosong (patokan §2 b tak terukur); penilai mutu GLM **tidak dijalankan** (tidak ada butir M2d-15; menilai pembanding saja tidak menjawab pertanyaan milestone, jadi pagu tidak dipakai).

**Tafsiran.** Lewat OpenRouter (penyedia Azure), Opus 5.5 dengan effort "low" berpikir 2,6–4,6 rb token (M2d-13), tetapi dengan effort "medium" — dan juga dengan batas eksplisit `reasoning.max_tokens` 8.000 — berpikir sampai seluruh 16.000 token habis (3 dari 3 panggilan yang punya respons). Batas penalaran yang diminta tidak dipatuhi. Hipotesis "Opus ditingkatkan lebih efektif" **tidak teruji**: tidak ada satu pun omongan yang ditulis, jadi aturan di prompt, pra-periksa, dan bank sudut tidak pernah diuji pada keluaran nyata. Ini hasil negatif teknis, bukan bukti bahwa Opus effort lebih tinggi menulis lebih buruk.

**Pilihan untuk milestone berikut (tidak dijalankan; keputusan pemilik/reviewer):** (i) effort "medium" dengan `max_tokens` ±32.000 — perkiraan maksimum sebelum kirim ±US$0,73 per panggilan, biaya nyata ±US$0,40 (≈ 16 rb penalaran + 3 rb jawaban), sehingga satu jalan 3 versi butuh pagu ±US$3; (ii) effort "low" (terbukti menghasilkan JSON di M2d-13) dengan prompt v2 + pra-periksa + bank sudut — menguji ketiga perubahan itu tanpa mengubah effort, ±US$0,16–0,20 per panggilan; (iii) mode streaming tidak membantu biaya karena penalaran tetap ditagih.

## 1. Jalan D-4 (hasil vs patokan §2)

Setelan: Opus 5.5, `max_tokens` 16.000, suhu 1,0; penalaran `reasoning.effort: "medium"` (pra-registrasi) di jalan 1, lalu `reasoning.max_tokens` 8.000 sesudah **amandemen teknis T1** (`docs/bukti/m2d15-amandemen-teknis-T1.md`: dua panggilan pertama effort "medium" habis 16.000 token tanpa JSON); prompt v2 + bank sudut beku (A1); pra-periksa ≤ 2 tulis-ulang per versi; pagu jalan min(US$2.00; US$2,70 − biaya sebelumnya) (A2). Paket TIRT-7 sha256 f7cabc6b….

| jalan | kelas | versi per omongan (berhenti) | tulis-ulang pra-periksa | panggilan penulis (terpotong) · token masuk/keluar/penalaran | biaya penulis | biaya gerbang | total | sha prompt | berhenti |
|---|---|---|---|---|---|---|---|---|---|
| m2d15-opus-1 | tidak terbit | o1: tulis-gagal; o2: tulis-gagal; o3: tulis-gagal | 0 dikirim, 0 dilewati pagu | 3 (2) · 23376/32000/30372 | US$1.1477 | US$0.0000 | US$1.1477 | … | Jalan 1 M2d-15 dihentikan eksekutor (PID 10544) untuk amandemen teknis T1 (pra-registrasi §9 butir kedua; docs/bukti/m2d15-amandemen-teknis-T1.md). Pintu tidak menulis hasil.json. |
| m2d15-opus-2 | tidak terbit | o1: tulis-gagal; o2: tulis-gagal; o3: tulis-gagal | 0 dikirim, 0 dilewati pagu | 2 (1) · 11688/16000/16000 | US$0.7782 | US$0.0000 | US$0.7782 | … | Jalan 2 M2d-15 dihentikan eksekutor (PID 14972) sebagai henti-rugi T2: setelan amandemen teknis T1 (reasoning.max_tokens 8.000) juga diabaikan — panggilan penulis pertama memakai 16.000 token penalara |

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

## 2. Audit Opus satu soal tanpa kartu (patokan §2 b — dijalankan reviewer)

**Tak terukur:** tidak ada versi omongan terbaca di jalan M2d-15, jadi paket audit satu soal kosong (0 berkas).

## 3. Kenapa Opus — efisien → efektif

| | templat murah (M2d-11) | Opus 5.5 effort "low" (M2d-13) | Opus 5.5 ditingkatkan (M2d-15) |
|---|---|---|---|
| jalan · omongan lulus gerbang | 7 jalan · 3 | 2 jalan · 2/6 (tersensor 2) | 2 jalan · 0/6 (tersensor 0) |
| versi per omongan lulus | 9,67 (29 versi) | 6,00 | — |
| biaya nyata per omongan lulus | US$0.1462 (7 jalan, US$0.4385) | US$0.3912 | — |
| simulasi terbit | 1 (jalan ke-7) | 0 | 0 |
| kunci dipilih dari pilihan-saja (rotasi, terbaca; acak 25 %) | 35 % (n 263) | 28 % [19 %–39 %] (n 78) | — (n 0) |
| kunci dari pesan+pilihan | — | 32 % (n 84) | — (n 0) |
| mutu penilai Opus buta (0–10) | 7,67 (n 3, layak 2) | 8,83 (n 6, layak 5) | tak ada butir |
| mutu penilai GLM "high" (0–10) | — | — (2 butir lulus) | — |
| DADA tayang (pembanding) | Opus M2d-13 8,00 (n 3, layak 2) | | Opus M2d-15 —; GLM — |

## 4. Penolakan per jenis — sebelum / sesudah aturan di prompt

| ukuran | Opus M2d-13 (prompt v1, tanpa pra-periksa) | Opus M2d-15 |
|---|---|---|
| versi terbaca berhenti di gerbang 1 kode resmi | 5/12 | 0/0 |
| tulisan pertama tiap versi ditolak aturan kode (M2d-13: gerbang 1; M2d-15: pra-periksa ke-1) | 5/12 | 0/0 |
| jenis aturan pada tulisan pertama (versi per jenis) | D9 3, G-satu-klausa 2, G-angka-cukup 2, ANGKA_TANPA_RUJUKAN 1, angka-di-kartu 1, G-pilihan-kembar 1, D2 1 | — |
| jenis aturan, semua pra-periksa | — | — |
| jenis aturan di gerbang 1 resmi | D9 3, G-satu-klausa 2, G-angka-cukup 2, ANGKA_TANPA_RUJUKAN 1, angka-di-kartu 1, G-pilihan-kembar 1, D2 1 | — |
| berhenti di gerbang berbayar: penebak / kartu / kritikus | 4 / 1 / 0 | 0 / 0 / 0 |
| tulis-gagal · tersensor | 0 · 2 jalan | 6 · 0 jalan |

## 5. Sudut yang dipilih penulis (bank sudut A1)

(tidak ada versi terbaca di jalan M2d-15 — penulis tidak sempat memilih sudut)

| jalan | omongan | kartu penentu versi akhir | label bank | lulus |
|---|---|---|---|---|

## 6. Ramalan arah (pra-registrasi §8)

| ramalan | hasil | putusan |
|---|---|---|
| R1 versi berhenti di gerbang 1 kode ≤ 1/6 | 0/0 versi terbaca | tak terukur (tidak ada versi terbaca) |
| R2 lolos pra-periksa pada tulisan pertama versi 1 ≥ 2/3 | 0/0 | tak terukur (tidak ada tulisan terbaca) |
| R3 jalan 1 terbit (a) | tidak terbit | tidak |
| R4 versi per omongan lulus ≤ 2,0 | — | tidak (tak ada yang lulus) |
| R5 biaya per omongan lulus ≤ US$0,50 | — | tidak (tak ada yang lulus) |
| R6 kunci pilihan-saja ≤ 30 % | — (n 0) | tak terukur |
| R7 ≥ 2 dari 3 omongan lulus dengan audit ≤ 2/4 (jalan terbit) | tidak ada jalan terbit | tak terukur (tidak ada jalan terbit) |
| R8 mutu Opus buta versi akhir ≥ 8,5 | tidak ada butir | tak terukur (tidak ada butir) |

## 7. Draf lengkap (versi akhir tiap omongan)

(tidak ada versi terbaca di jalan M2d-15)

Label pengecoh dan umpan balik ditulis penulis; isi label tidak divalidasi kode (hanya struktur). Tidak dipasang ke produk; tidak ada yang ditulis ke `cases/`.

### m2d15-opus-1 — tidak terbit

### m2d15-opus-2 — tidak terbit

## 8. Biaya nyata (ledger `usage.cost`, tag `penyusun/m2d15-` + `m2d15/`)

| model | entri | biaya |
|---|---|---|
| anthropic/claude-opus-5.5 | 5 | US$1.9259 |
| **total** | 5 | **US$1.9259** |

Bagian: D-4 US$1.9259 (pagu US$2.70); penilai GLM US$0.0000. Kumulatif ledger US$13.1935.

## 9. Keterbatasan

- n sangat kecil: 1–2 jalan, ≤ 6 omongan, satu emiten (TIRT), satu tanggal, satu sampel per panggilan penulis.
- Empat perubahan sekaligus (effort, prompt v2, pra-periksa, bank sudut + pagu jalan): hasil tidak bisa diatribusikan ke satu faktor.
- Penulis, auditor (b), penilai Opus, eksekutor, reviewer sekeluarga (Anthropic); penilai GLM M2d-13 menunjukkan efek langit-langit.
- LLM bukan pemula: "layak tayang" = lulus gerbang + audit model, bukan bukti pemain belajar.
- Percobaan berulang (≤ 3 versi, ≤ 2 jalan, ≤ 2 tulis-ulang pra-periksa per versi) menaikkan peluang lulus karena kebetulan.
- Ketepatan isi label pengecoh tidak diperiksa kode; angka yang ditulis dengan kata tidak diperiksa aturan angka-di-kartu.

## 10. Bahan README & video (angka bersumber laporan ini)

- "Kami mulai dari efisien: mesin templat murah butuh 29 versi di 7 jalan untuk 3 omongan lulus (9,67 versi per omongan, US$0.1462 per omongan lulus). Opus 5.5 dengan penalaran pendek (effort "low") butuh 6,00 versi per omongan lulus (US$0.3912), dan penilai Opus buta memberinya 8,83 (n 6, layak 5) lawan templat 7,67 (n 3, layak 2). Menaikkan penalaran ke "medium" justru gagal teknis: lewat OpenRouter penalarannya tidak bisa dibatasi dan menghabiskan 16.000 token tanpa satu soal pun." — sumber: §3 tabel, bagian Penyimpangan; M2d-13 `docs/bukti/lingkar-agen-penulis.md`.

## 11. Menunggu reviewer

- Tidak ada yang menunggu: tanpa omongan terbaca, paket audit dan paket penilai mutu M2d-15 tidak berisi butir baru (§2 b dan mutu tak terukur).
