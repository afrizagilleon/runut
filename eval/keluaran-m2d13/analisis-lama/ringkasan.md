# D-A M2d-13 — analisis gratis data M2d-11 (EKSPLORATIF)

Dibangun `npm run penulis:analisis-lama` (`factory/llm/bebas/analisis-lama.ts`) dari `eval/keluaran-m2d11/uji-ulang/mentah.json`, `eval/penyusun/m2d11-tirt-*/hasil.json`, `eval/keluaran-m2d11/audit-opus/satu-soal/nilai.json` dan jejak model penulis. Laju utama = jawaban terbaca; kepekaan (aturan M2d-11) di kurung.

## Butir per kelompok penulis

| kelompok | butir |
|---|---:|
| opus-pemilik | 6 |
| deepseek | 21 |
| templat-m2d10 | 6 |
| templat-m2d11 | 23 |

## Laju kunci penulis × penebak

| kelompok | kondisi | haiku-4.5 | deepseek | glm-5.3 |
|---|---|---|---|---|
| opus-pemilik | pilihan-saja | 39 % (54 %; n 18, tak 6; konsisten 1/6) | 46 % (46 %; n 24, tak 0; konsisten 2/6) | 17 % (17 %; n 24, tak 0; konsisten 1/6) |
| opus-pemilik | pesan-pilihan | 33 % (33 %; n 24, tak 0; konsisten 1/6) | 29 % (29 %; n 24, tak 0; konsisten 1/6) | 21 % (21 %; n 24, tak 0; konsisten 0/6) |
| deepseek | pilihan-saja | 26 % (46 %; n 61, tak 23; konsisten 1/21) | 43 % (45 %; n 80, tak 4; konsisten 6/21) | 39 % (42 %; n 80, tak 4; konsisten 5/21) |
| deepseek | pesan-pilihan | 23 % (23 %; n 84, tak 0; konsisten 4/21) | 40 % (42 %; n 81, tak 3; konsisten 6/21) | 37 % (38 %; n 83, tak 1; konsisten 5/21) |
| templat-m2d10 | pilihan-saja | 50 % (63 %; n 18, tak 6; konsisten 2/6) | 46 % (46 %; n 24, tak 0; konsisten 2/6) | 67 % (67 %; n 24, tak 0; konsisten 3/6) |
| templat-m2d10 | pesan-pilihan | 50 % (50 %; n 24, tak 0; konsisten 3/6) | 42 % (42 %; n 24, tak 0; konsisten 1/6) | 33 % (33 %; n 24, tak 0; konsisten 1/6) |
| templat-m2d11 | pilihan-saja | 30 % (40 %; n 79, tak 13; konsisten 2/23) | 35 % (35 %; n 92, tak 0; konsisten 0/23) | 38 % (38 %; n 92, tak 0; konsisten 3/23) |
| templat-m2d11 | pesan-pilihan | 64 % (64 %; n 92, tak 0; konsisten 11/23) | 35 % (35 %; n 92, tak 0; konsisten 3/23) | 51 % (51 %; n 92, tak 0; konsisten 5/23) |

## Prior huruf per penebak (semua butir)

| penebak | a | b | c | d | n | huruf terbanyak | bias (≥ 0,32, n ≥ 200) |
|---|---:|---:|---:|---:|---:|---|---|
| haiku-4.5 | 81 | 167 | 77 | 75 | 400 | b 42 % | ya |
| deepseek | 96 | 155 | 91 | 99 | 441 | b 35 % | ya |
| glm-5.3 | 110 | 148 | 98 | 87 | 443 | b 33 % | ya |

## Δ sekeluarga (GLM kendali; anthropic = soal tayang Opus+pemilik, deepseek = M2d-3…M2d-8)

| data | kondisi | Δ_DeepSeek | Δ_Haiku |
|---|---|---:|---:|
| semua butir | pilihan-saja | -0,25 | 0,35 |
| semua butir | pesan-pilihan | -0,06 | 0,27 |
| bank 33 | pilihan-saja | -0,25 | 0,35 |
| bank 33 | pesan-pilihan | -0,06 | 0,27 |

## Opus

| sumber | kelompok | butir | kunci / jawaban | laju |
|---|---|---:|---:|---:|
| satu-soal tanpa kartu (4 rotasi, audit reviewer) | templat-m2d11 | 3 | 7/12 | 58 % |
| satu-soal tanpa kartu (4 rotasi, audit reviewer) | deepseek | 3 | 10/12 | 83 % |
| satu-soal tanpa kartu (4 rotasi, audit reviewer) | opus-pemilik | 2 | 3/8 | 38 % |
| luar lama (3 penguji, tanpa rotasi, dibundel) | deepseek | 21 | 30/63 | 48 % |
| luar lama (3 penguji, tanpa rotasi, dibundel) | templat-m2d10 | 6 | 10/18 | 56 % |

## Pembaur (wajib dibaca bersama angka di atas)

- **Seleksi:** omongan M2d-3…M2d-8 masuk bank karena LOLOS penebak di dalam lingkar (jejak: M2d-3 penebak DeepSeek; M2d-4/M2d-5 DeepSeek ×2 + GLM; M2d-6 GLM; M2d-8 GLM ×3). Butir DeepSeek sudah tersaring agar tidak tertebak DeepSeek dan/atau GLM — keduanya kolom pembanding Δ — sehingga Δ_DeepSeek (dan kendali GLM) tercampur seleksi, bukan titik buta murni.
- **Jenis soal dan masa pembuatan** berbeda antar kelompok: soal tayang = DADA/ULTJ/(tanpa TIRT) buatan Claude+pemilik; DeepSeek = TIRT/DADA/ULTJ M2d-3…M2d-8 dengan lingkar dan gerbang yang berubah tiap milestone; templat = TIRT dengan enam pola yang sama.
- **Tangan manusia** ikut di soal tayang (bukan keluaran LLM murni). Templat = campuran (kode Claude + DeepSeek + Haiku).
- **Opus luar lama** dibundel beberapa soal per berkas dan tanpa rotasi (audit M2d-11 menunjukkan pembundelan membocorkan jawaban); Opus satu-soal hanya 8 butir yang sudah lolos rotasi tiga keluarga (bias seleksi).
- Versi jalan TIRT M2d-11 berulang dari rencana yang sama (bukan butir independen).
