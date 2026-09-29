# Bukti: lingkar agen TIRT di OpenRouter (M2d-5)

Berkas ini ditulis oleh `npm run tirt:laporan` dari keluaran mentah di `eval/keluaran-m2d5/` (riwayat dan jejak lingkar TIRT, probe penalaran, ledger OpenRouter dengan biaya NYATA dari `usage.cost`, bahan dan jawaban mentah penguji eksternal) dan dari arsip ledger Featherless. Semua angka dihitung ulang tiap kali perintah itu dijalankan; hanya bagian "Catatan penulis" yang ditulis tangan (`eval/keluaran-m2d5/laporan-tangan.md`). Draf **tidak** dipasang ke produk.

## Metode

Lingkar berperan M2d-4 (`factory/llm/peran.md`, urutan pemeriksa → pembaca kartu → kritikus → penebak ×3) dengan perubahan M2d-5, semuanya ditetapkan kode (`GENERASI_M2D5` di `factory/llm/agen-peran.ts`), hanya untuk TIRT:

- **OpenRouter + pagar penyedia (D-1).** `deepseek/deepseek-v4.1-flash` (penulis, pembaca kartu, penebak 1–2) dan `z-ai/glm-5.3` (kritikus, penebak 3), tanpa sufiks. Setiap permintaan membawa `provider` = kuantisasi fp8/mxfp8/fp16/bf16/fp32/unknown (fp4, nvfp4, int4, int8, fp6 ditolak), `max_price` = harga daftar standar (DeepSeek 0,30/1,20; GLM 1,40/4,40 USD per juta token), `require_parameters: true`, `data_collection: "deny"`, `allow_fallbacks: true`, tanpa `sort` (`factory/llm/openrouter.ts`).
- **Biaya nyata (D-2).** Ledger mencatat `usage.cost` dari respons; perkiraan sebelum kirim = `max_price` × (batas atas token masuk + `max_tokens`). Pagu milestone US$4,00 dan pagu kumulatif `LLM_PAGU_USD` menegakkan biaya nyata + perkiraan panggilan berikutnya.
- **Batas penalaran (D-3)** dari probe (`eval/keluaran-m2d5/probe/putusan.md`): penulis 12000 / 20000, kritikus 8000 / 12000, penebak GLM 3000 / 5000, pembaca kartu 6000 / 12000 (`reasoning.max_tokens` / `max_tokens`). Jawaban kosong karena penalaran habis = terpotong (dibayar).
- **Posisi kunci diatur kode (D-4)**: pola TIRT c, d, d (sha256 id paket); penjelasan/pilihan dilarang merujuk huruf.
- **G-penilaian (D-5)** dan **G-mirip (D-6)** di pemeriksa; ambang G-mirip 0,40 = 4 × kemiripan manusia terbesar.
- **Pembaca kartu menandai kalimat membingungkan (D-7)**: tulisan penulis → menolak; teks kartu paket → dicatat.
- **Teks kartu paket diperjelas (D-8)** di `factory/llm/paket.ts` (`PERJELAS_KLAIM` dan `sebutan` turunan).

## Hasil TIRT

| jalan | hasil | putaran | versi diperiksa | panggilan (ledger) | biaya NYATA | waktu |
|---|---|---:|---:|---:|---:|---:|
| tirt | **terbit (lolos penuh)** | 4 | 10 | 59 | US$0.1609 | 36,2 menit |

### tirt — sudut, keputusan, gerbang baru

| omongan | sudut (fakta penentu) → hasil, putaran |
|---:|---|
| 1 | 1. `susp-2025-12-10` → lolos (1–4) |
| 2 | 1. `naik-2025-11-26-2025-12-09` → lolos (1–2) |
| 3 | 1. `rups-2025-09-25` → lolos (1–4) |

- Status per versi: ditolak-tebak 6, lolos 3, ditolak-kartu 1.
- Penolakan pemeriksa per kode (versi): —.
- Posisi kunci diatur kode: 10 versi ditulis, 9 dipindah hurufnya; rujukan huruf ditolak 0 kali.
- G-penilaian menolak 0 versi.
- G-mirip menolak 0 versi; kemiripan terbesar yang terukur 0,23.
- Penulis: 13 panggilan, terpotong/kosong 3, cadangan tanpa berpikir 3. Kritikus: 9 putusan, terpotong 0, tidak menjawab 0; keberatan per jenis: —.
- Penebak di dalam (benar tanpa kartu / tebakan): `deepseek/deepseek-v4.1-flash` 11/18, `z-ai/glm-5.3` 5/9.

Kalimat yang ditandai membingungkan oleh pembaca kartu (D-7):

| putaran | omongan | asal | bagian | kutipan |
|---:|---:|---|---|---|
| 3 | 3 | penulis (menolak) | pesan | Aku ragu rapat pemegang saham 25 September 2025 itu cuma dijadwalin, keputusannya ga dicatat. |

### Putaran demi putaran (jalan terakhir)

**Putaran 1** — tulis 1, 2, 3.

- omongan 1: **ditolak-tebak** — "Gw yakin banget disetopnya hari ini gara-gara keraguan kelangsungan usaha, bukan soal harga-harga itu." (kunci c)
  - [penebak tanpa kartu] 2/3 penebak TANPA kartu memilih kunci "c", rata-rata keyakinan 68 (tebakan: c/70, c/65, b/65). Alasan mereka: "Penghentian saham hari ini lebih wajar karena kenaikan harga kumulatif, dan opsi b hanya mengulang klaim Fikri." "Dalam kasus saham disetop, alasan resmi yang paling umum adalah kenaikan 
- omongan 2: **ditolak-tebak** — "Gw hafal polanya, kenaikan dari 26 November sampe 9 Desember cuma Rp58 doang." (kunci d)
  - [penebak tanpa kartu] 2/3 penebak TANPA kartu memilih kunci "d", rata-rata keyakinan 60 (tebakan: a/60, d/60, d/60). Alasan mereka: "Angka Rp58 paling wajar sebagai selisih harga penutupan dua tanggal yang bisa dicek langsung dari data saham." "Kenaikan Rp58 antara dua tanggal spesifik paling mungkin merujuk selisih ha
- omongan 3: **ditolak-tebak** — "gw baru liat, kayaknya isi keputusan RUPS 25 September 2025 udah ketulis lengkap deh" (kunci d)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "d", rata-rata keyakinan 65 (tebakan: d/70, d/60, d/65). Alasan mereka: "Dokumen RUPS yang beredar biasanya baru memuat jadwal, bukan hasil keputusan, jadi klaim Nadia tidak cocok." "Dokumen RUPS yang beredar sebelum rapat biasanya hanya memuat jadwal, bukan h

**Putaran 2** — tulis 1, 2, 3.

- omongan 1: **ditolak-tebak** — "Gw yakin banget disetopnya gara-gara harga naik kumulatif, dan kapan bukanya lagi udah ketulis di pengumumannya." (kunci c)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "c", rata-rata keyakinan 65 (tebakan: c/65, c/65, c/65). Alasan mereka: "Pengumuman suspensi saham biasanya memuat alasan resmi, tetapi tidak selalu mencantumkan kapan saham akan dibuka kembali, sehingga klaim Yoga tentang tanggal buka kemungkinan keliru." "Pe
- omongan 2: **lolos** — "Gw udah hafal polanya, dari 26 November sampe 9 Desember harganya naik 58 rupiah. Itu angka pastinya." (kunci d)
- omongan 3: **ditolak-tebak** — "aku ragu sih, kayaknya rapat pemegang saham 25 September 2025 itu dibatalin gara-gara ada penghentian perdagangan" (kunci d)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "d", rata-rata keyakinan 67 (tebakan: d/70, d/65, d/65). Alasan mereka: "Pernyataan Tika terdengar ragu dan klaim pembatalan biasanya tidak didukung dokumen, jadi pilihan yang paling wajar adalah bahwa pembatalan itu tidak tercatat." "Klaim Tika bahwa rapat di

**Putaran 3** — tulis 1, 3.

- omongan 1: **ditolak-tebak** — "Gw yakin banget disetopnya gara-gara harga naik kumulatif, dan besok pagi sahamnya udah bisa ditransaksikan lagi." (kunci c)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "c", rata-rata keyakinan 67 (tebakan: c/80, c/65, c/55). Alasan mereka: "Pengumuman suspensi biasanya mencantumkan alasan kenaikan harga kumulatif, tetapi tidak memastikan saham dibuka kembali besok pagi." "Pengumuman suspensi biasanya memuat alasan kenaikan h
- omongan 3: **ditolak-kartu** — "Aku ragu rapat pemegang saham 25 September 2025 itu cuma dijadwalin, keputusannya ga dicatat." (kunci d)
  - [pembaca kartu] Pembaca yang memegang kartu bingung dengan kalimat tulisanmu: "Aku ragu rapat pemegang saham 25 September 2025 itu cuma dijadwalin, keputusannya ga dicatat." (pesan). Tulis ulang bagian itu dengan bahasa awam yang hanya bisa dibaca satu arti.

**Putaran 4** — tulis 1, 3.

- omongan 1: **lolos** — "Gw yakin Januari 2025 saham ini udah pernah disetop juga, dan alasannya beda dari yang sekarang." (kunci c)
- omongan 3: **lolos** — "Kayaknya hasil putusan rapat pemegang saham 25 September 2025 ada di catatan resmi ya?" (kunci d)

## Draf akhir

TIRT **terbit** — draf utuh apa adanya (tidak disunting tangan):

**Omongan 1**

> **Rian (20.11):** Gw yakin Januari 2025 saham ini udah pernah disetop juga, dan alasannya beda dari yang sekarang.

- a) Keliru, tidak ada penghentian saham di awal tahun itu.
- b) Betul, penghentian Januari 2025 beralasan kenaikan harga kumulatif.
- **c) Betul, penghentian Januari 2025 beralasan keraguan kelangsungan usaha.** (kunci)
- d) Keliru, penghentian Januari 2025 tidak mencatat alasan resmi apa pun.

Penjelasan: Pengumuman penghentian 10 Desember 2025 menuliskan alasan resminya: naiknya harga kumulatif yang signifikan, sebagai langkah cooling down demi melindungi investor. Sementara itu 21 Januari 2025 juga memuat penghentian perdagangan, dengan alasan resmi keraguan atas kelangsungan usaha. Dua penghentian itu memang beralasan tidak sama, jadi klaim teman soal alasan yang berbeda cocok dengan catatan. Yang tidak ada di kedua pengumuman cuma tanggal kapan perdagangannya dibuka lagi. Salah-kaprah yang umum: orang menyangka satu saham cuma bisa kena penghentian sekali dalam setahun, padahal di sini tercatat dua kali dengan alasan yang tidak sama.

**Omongan 2**

> **Sari (19.32):** Gw udah hafal polanya, dari 26 November sampe 9 Desember harganya naik 58 rupiah. Itu angka pastinya.

- a) Keliru, kenaikan periode itu tidak pernah dihitung.
- b) Betul, angka itu kenaikan sejak awal tahun, bukan periode itu.
- c) Keliru, harga dua tanggal itu tidak tercatat di mana pun.
- **d) Betul, kenaikan periode itu memang Rp58.** (kunci)

Penjelasan: Data bursa memuat penutupan 26 November dan penutupan 9 Desember, dan kartu penentu menghitung selisih keduanya: Rp58. Kartu lain mencatat harga naik 9 hari bursa berturut-turut, dan kenaikan itu memang diukur dari dua tanggal tersebut, bukan dari awal tahun. Jadi angka yang diucapkan teman sama dengan yang tercatat, dan pilihan yang bilang angka ini tidak dihitung atau tidak tercatat tidak cocok dengan dokumen. Salah-kaprah yang umum: orang merasa angka kenaikan harus dihitung sendiri dari daftar harga, padahal sudah tersedia satu angka jadi.

**Omongan 3**

> **Nia (22.14):** Kayaknya hasil putusan rapat pemegang saham 25 September 2025 ada di catatan resmi ya?

- a) Betul, hasil putusannya tercatat di dokumen.
- b) Betul, hasil putusannya ada di catatan resmi.
- c) Keliru, rapat itu tidak dijadwalkan.
- **d) Keliru, hasil putusannya tidak tercatat di dokumen.** (kunci)

Penjelasan: Catatan resmi hanya menulis bahwa rapat pemegang saham dijadwalkan 25 September 2025. Di bagian yang sama disebut isi keputusan rapatnya tidak tercatat, jadi tidak ada bahan untuk memastikan hasil putusannya. Tidak ada pula keterangan yang mengaitkan rapat itu dengan penghentian perdagangan hari ini. Karena yang tercatat cuma jadwal, anggapan bahwa hasil putusannya sudah ada di catatan resmi tidak cocok dengan dokumen. Salah-kaprah yang umum: orang mengira rapat pemegang saham yang sudah dijadwalkan pasti meninggalkan catatan hasil, padahal di sini justru tidak dicatat.

```json
{
  "omongan": [
    {
      "nama": "Rian",
      "jam": "20.11",
      "pesan": "Gw yakin Januari 2025 saham ini udah pernah disetop juga, dan alasannya beda dari yang sekarang.",
      "angka_pesan": [
        {
          "teks": "Januari 2025",
          "fact_id": "susp-2025-01-21"
        }
      ],
      "kartu": [
        "susp-2025-12-10",
        "susp-2025-01-21"
      ],
      "kartu_penentu": [
        "susp-2025-12-10",
        "susp-2025-01-21"
      ],
      "pilihan": {
        "a": "Keliru, tidak ada penghentian saham di awal tahun itu.",
        "b": "Betul, penghentian [[susp-2025-01-21|Januari 2025]] beralasan kenaikan harga kumulatif.",
        "c": "Betul, penghentian [[susp-2025-01-21|Januari 2025]] beralasan keraguan kelangsungan usaha.",
        "d": "Keliru, penghentian [[susp-2025-01-21|Januari 2025]] tidak mencatat alasan resmi apa pun."
      },
      "kunci": "c",
      "penjelasan": "Pengumuman penghentian [[susp-2025-12-10|10 Desember 2025]] menuliskan alasan resminya: naiknya harga kumulatif yang signifikan, sebagai langkah cooling down demi melindungi investor. Sementara itu [[susp-2025-01-21|21 Januari 2025]] juga memuat penghentian perdagangan, dengan alasan resmi keraguan atas kelangsungan usaha. Dua penghentian itu memang beralasan tidak sama, jadi klaim teman soal alasan yang berbeda cocok dengan catatan. Yang tidak ada di kedua pengumuman cuma tanggal kapan perdagangannya dibuka lagi. Salah-kaprah yang umum: orang menyangka satu saham cuma bisa kena penghentian sekali dalam setahun, padahal di sini tercatat dua kali dengan alasan yang tidak sama."
    },
    {
      "nama": "Sari",
      "jam": "19.32",
      "pesan": "Gw udah hafal polanya, dari 26 November sampe 9 Desember harganya naik 58 rupiah. Itu angka pastinya.",
      "angka_pesan": [
        {
          "teks": "26 November",
          "fact_id": "naik-2025-11-26-2025-12-09"
        },
        {
          "teks": "9 Desember",
          "fact_id": "naik-2025-11-26-2025-12-09"
        },
        {
          "teks": "58 rupiah",
          "fact_id": "naik-2025-11-26-2025-12-09"
        }
      ],
      "kartu": [
        "naik-2025-11-26-2025-12-09",
        "harga-2025-11-26",
        "harga-2025-12-09",
        "hari-naik-beruntun"
      ],
      "kartu_penentu": [
        "naik-2025-11-26-2025-12-09"
      ],
      "pilihan": {
        "a": "Keliru, kenaikan periode itu tidak pernah dihitung.",
        "b": "Betul, angka itu kenaikan sejak awal tahun, bukan periode itu.",
        "c": "Keliru, harga dua tanggal itu tidak tercatat di mana pun.",
        "d": "Betul, kenaikan periode itu memang [[naik-2025-11-26-2025-12-09|Rp58]]."
      },
      "kunci": "d",
      "penjelasan": "Data bursa memuat [[harga-2025-11-26|penutupan 26 November]] dan [[harga-2025-12-09|penutupan 9 Desember]], dan kartu penentu menghitung selisih keduanya: [[naik-2025-11-26-2025-12-09|Rp58]]. Kartu lain mencatat harga naik [[hari-naik-beruntun|9 hari bursa]] berturut-turut, dan kenaikan itu memang diukur dari dua tanggal tersebut, bukan dari awal tahun. Jadi angka yang diucapkan teman sama dengan yang tercatat, dan pilihan yang bilang angka ini tidak dihitung atau tidak tercatat tidak cocok dengan dokumen. Salah-kaprah yang umum: orang merasa angka kenaikan harus dihitung sendiri dari daftar harga, padahal sudah tersedia satu angka jadi."
    },
    {
      "nama": "Nia",
      "jam": "22.14",
      "pesan": "Kayaknya hasil putusan rapat pemegang saham 25 September 2025 ada di catatan resmi ya?",
      "angka_pesan": [
        {
          "teks": "25 September 2025",
          "fact_id": "rups-2025-09-25"
        }
      ],
      "kartu": [
        "rups-2025-09-25",
        "susp-2025-12-10"
      ],
      "kartu_penentu": [
        "rups-2025-09-25"
      ],
      "pilihan": {
        "a": "Betul, hasil putusannya tercatat di dokumen.",
        "b": "Betul, hasil putusannya ada di catatan resmi.",
        "c": "Keliru, rapat itu tidak dijadwalkan.",
        "d": "Keliru, hasil putusannya tidak tercatat di dokumen."
      },
      "kunci": "d",
      "penjelasan": "Catatan resmi hanya menulis bahwa rapat pemegang saham dijadwalkan [[rups-2025-09-25|25 September 2025]]. Di bagian yang sama disebut isi keputusan rapatnya tidak tercatat, jadi tidak ada bahan untuk memastikan hasil putusannya. Tidak ada pula keterangan yang mengaitkan rapat itu dengan penghentian perdagangan hari ini. Karena yang tercatat cuma jadwal, anggapan bahwa hasil putusannya sudah ada di catatan resmi tidak cocok dengan dokumen. Salah-kaprah yang umum: orang mengira rapat pemegang saham yang sudah dijadwalkan pasti meninggalkan catatan hasil, padahal di sini justru tidak dicatat."
    }
  ]
}
```

## Biaya NYATA (OpenRouter, `usage.cost`)

Entri ledger bertag `m2d5/`, dipotong 2026-09-29T05:32:52.320Z: **US$0.2245 dalam 75 panggilan**, dari pagu milestone US$4,00 (ditegakkan kode).

| peran | panggilan | token keluar | biaya nyata | penalaran rata / maks (token) |
|---|---:|---:|---:|---|
| kritikus | 9 | 2599 | US$0.0214 | 128 / 260 |
| pembaca-kartu | 10 | 10239 | US$0.0069 | 949 / 3796 |
| penebak DeepSeek | 18 | 102120 | US$0.0515 | 5614 / 15344 |
| penebak GLM | 9 | 1029 | US$0.0058 | 39 / 123 |
| penulis | 13 | 154638 | US$0.0753 | 11525 / 20000 |
| probe | 16 | 74836 | US$0.0636 | 4499 / 24000 |

| model · penyedia yang melayani | panggilan | biaya nyata |
|---|---:|---:|
| deepseek/deepseek-v4.1-flash · AtlasCloud | 26 | US$0.1324 |
| deepseek/deepseek-v4.1-flash · Together | 4 | US$0.0248 |
| z-ai/glm-5.3 · Wafer | 11 | US$0.0234 |
| deepseek/deepseek-v4.1-flash · DeepInfra | 10 | US$0.0143 |
| deepseek/deepseek-v4.1-flash · CoreWeave | 9 | US$0.0076 |
| z-ai/glm-5.3 · Friendli | 3 | US$0.0076 |
| z-ai/glm-5.3 · Phala | 3 | US$0.0063 |
| z-ai/glm-5.3 · Morph | 3 | US$0.0045 |
| z-ai/glm-5.3 · Reka | 1 | US$0.0013 |
| z-ai/glm-5.3 · Sail Research | 3 | US$0.0011 |
| z-ai/glm-5.3 · AkashML | 1 | US$0.0007 |
| deepseek/deepseek-v4.1-flash · Relace | 1 | US$0.0006 |

| dasar biaya | panggilan | biaya |
|---|---:|---:|
| usage-cost | 75 | US$0.2245 |

## Temuan Featherless

Ledger Featherless (M2d-1…M2d-4, diarsipkan utuh: `ledger-sampai-2026-09-28.jsonl`, `ledger-featherless-sampai-2026-09-29.jsonl`) mencatat **US$7.7150 dalam 886 entri**, dihitung dari token × tabel tebakan (`HARGA_FEATHERLESS_USANG`). Kredit Featherless pemilik turun ±US$14,5 (dari US$15; angka pemilik, kontrak M2d-5 §0) — **tagihan nyata ±1,88 × ledger**: tabel harga "konservatif" itu ±separuh tagihan, sehingga pagu kode M2d-2…M2d-4 tidak konservatif seperti klaimnya. Di M2d-5 ledger memakai `usage.cost` dari tiap respons, dan perkiraan sebelum kirim memakai batas `max_price` yang juga dikirim ke penyedia.

## Pembanding eksternal

Penguji dan penilai: subagent Claude (opus) **baru**, tanpa konteks eksekutor, masing-masing hanya menerima isi satu berkas bahan (`eval/keluaran-m2d5/penguji/`); label acak. Jawaban mentah: `penguji/jawaban/`. Petunjuk sama persis dengan M2d-4, ditambah satu pertanyaan ke penguji kartu: "Adakah bagian pesan teman yang berupa penilaian (aman/bagus/pasti) yang tak bisa dicek dari kartu?".

| omongan | kunci | tebak di dalam | tebak di luar | benar luar | yakin benar | lolos luar | kartu luar (pilihan/kartu) | K-05 kartu | membingungkan | penilaian tak tercek |
|---:|---|---|---|---:|---:|---|---|---|---|---|
| 1 | c | b/65, b/50, b/40 | b/40, b/35, c/30 | 1/3 | 30 | ya | c/2+1, c/2, c/2+1 | ya | "Terjadinya peningkatan harga kumulatif yang signifikan pada saham Perusahaan T, dalam rangka cooling down sebagai bentuk perlindungan bagi investor."; "dalam rangka cooling down sebagai bentuk perlindungan bagi investor" | — |
| 2 | d | a/60, c/60, a/55 | d/40, d/40, d/40 | 3/3 | 40 | **tidak** | d/1+2+3, d/1, d/1+2+3 | ya | — | "Gw udah hafal polanya" |
| 3 | d | a/60, a/50, b/60 | d/55, d/60, d/55 | 3/3 | 57 | **tidak** | d/1, d/1, d/1 | ya | "dalam rangka cooling down sebagai bentuk perlindungan bagi investor"; "Betul, hasil putusannya ada di catatan resmi."; "a) Betul, hasil putusannya tercatat di dokumen. / b) Betul, hasil putusannya ada di catatan resmi." | — |

Tebak buta luar lolos 1/3; jawab-dengan-kartu K-05 penuh 3/3; omongan dengan kalimat membingungkan 2/3; omongan yang ditandai memuat penilaian tak tercek 1/3.

### Kealamian bahasa (buta, penilai yang sama)

| kelompok | sumber | rata-rata | n |
|---|---|---:|---:|
| tirt | m2d5 | 3,00 | 3 |
| tirt | m2d4 | 4,00 | 3 |
| tirt | m2d3 | 4,00 | 3 |
| ultj | manusia | 3,00 | 3 |
| ultj | m2d4 | 3,33 | 3 |

| paket | sumber | penilai | skor | alasan |
|---|---|---|---:|---|
| tirt | agen-m2d3 | alami-p1 | 4 | Pesannya sangat hidup dan terasa obrolan sungguhan, tetapi beberapa kalimat penjelasan agak tersendat, misalnya 'Yang bikin orang salah kalau angka itu disangka...' dan 'yang awal tahun ragu soal kelanjutan usaha'. |
| tirt | agen-m2d3 | alami-p2 | 4 | Pesannya paling hidup, seperti obrolan grup sungguhan ("Gila gue panik", "telat nyadar"), dan penjelasannya bernada teman. Masih ada kalimat yang tersandung, misalnya "Yang bikin orang salah kalau angka itu disangka..." dan "bursa menulis ragu soal kelanjutan usaha". |
| tirt | agen-m2d3 | alami-p3 | 4 | Pesannya sangat hidup dan pilihannya selaras dengan ragam santai, tetapi ada kalimat yang strukturnya janggal, seperti "Yang bikin orang salah kalau angka itu disangka..." dan "bursa menulis ragu soal kelanjutan usaha". |
| tirt | agen-m2d4 | alami-p1 | 4 | Pesan dan penjelasannya mengalir seperti teman menjelaskan ('kebablasan', 'mendinginkan harga'), hanya ada sedikit frasa janggal seperti 'tidak bisa dipindah ke hari ini'. |
| tirt | agen-m2d4 | alami-p2 | 4 | Pesan dan penjelasannya mengalir dan memakai ungkapan akrab seperti "naik kebablasan"; hanya frasa "klaim teman soal hari ini cocok dengan dokumennya" yang terasa sedikit formal dan berulang. |
| tirt | agen-m2d4 | alami-p3 | 4 | Pesan dan penjelasannya mengalir seperti teman yang menjelaskan (misalnya "naik kebablasan"), hanya sedikit terasa formal di bagian "klaim teman soal hari ini cocok dengan dokumennya". |
| tirt | agen-m2d5 | alami-p1 | 3 | Pesan grupnya wajar, tetapi penjelasannya memakai istilah kaku seperti 'kartu penentu' dan 'cocok dengan catatan', dan pesan Nia ('ada di catatan resmi ya?') lebih mirip bahasa dokumen daripada obrolan. |
| tirt | agen-m2d5 | alami-p2 | 3 | Pesan grupnya wajar. Penjelasannya kaku karena istilah seperti "kartu penentu" dan "kartu lain mencatat", juga susunan janggal seperti "21 Januari 2025 juga memuat penghentian perdagangan" dan "beralasan tidak sama". |
| tirt | agen-m2d5 | alami-p3 | 3 | Pesan obrolannya wajar, tetapi penjelasannya memakai frasa kaku seperti "kartu penentu menghitung selisih", "beralasan kenaikan harga kumulatif", dan "beralasan tidak sama", yang tidak lazim diucapkan penutur asli. |
| ultj | agen-m2d4 | alami-p1 | 3 | Pesannya wajar ('ga pernah bolos'), tetapi penjelasannya mengulang pola kaku 'Kalau ... dibuka' dan 'Yang tidak terbaca di situ', ada frasa rancu seperti 'muncul 2 laporan', dan pilihan 'laporannya cuma dua laporan' berulang kata. |
| ultj | agen-m2d4 | alami-p2 | 4 | Pesan dan pilihannya santai dan wajar ("ga pernah bolos. Aman lah"). Penjelasannya jelas, tetapi polanya berulang ("Kalau ... dibuka", "Yang tidak terbaca di situ") dan ada frasa canggung seperti "muncul 2 laporan" dan "laporannya cuma dua laporan". |
| ultj | agen-m2d4 | alami-p3 | 3 | Pesannya wajar ("ga pernah bolos"), tetapi penjelasannya berpola templat berulang ("Kalau daftar... dibuka", "Yang tidak terbaca di situ") dan ada frasa janggal seperti "muncul 2 laporan" dan "laporannya cuma dua laporan". |
| ultj | manusia | alami-p1 | 3 | Rujukan berulang ke 'kartu pertama/kedua/ketiga', 'Jangan kegeeran dulu' yang maknanya kurang pas, dan kalimat salah-kaprah yang panjang terasa seperti terjemahan. |
| ultj | manusia | alami-p2 | 3 | Pesan seperti "Jangan kegeeran dulu" terdengar asli, tetapi penjelasannya terus merujuk ke "kartu pertama/kedua/ketiga" dan memakai frasa berbau terjemahan seperti "menggerakkan porsi mereka" dan "dibaca sebagai satu blok besar". |
| ultj | manusia | alami-p3 | 3 | Ada frasa alami ("Setengah omongan Fajar cocok"), tetapi rujukan meta seperti "kartu kedua" dan "tidak dikatakan kartu mana pun", nada menggurui "Perhatikan...", serta "kegeeran" yang maknanya kurang pas membuatnya kurang wajar. |

## TIRT: M2d-3 → M2d-4 → M2d-5

| ukuran | M2d-3 (Featherless) | M2d-4 (Featherless) | M2d-5 (OpenRouter) |
|---|---|---|---|
| terbit | ya (putaran 7) | tidak (putaran 15) | ya (putaran 4) |
| omongan dikunci | 3 | 2 | 3 |
| tebak buta luar lolos (rata-rata benar) | 1/3 (2,00) | 0/2 (1,00) | 1/3 (2,33) |
| jawab-dengan-kartu K-05 penuh | 3/3 | 2/2 | 3/3 |
| omongan dengan kalimat membingungkan (luar) | 1 | 1 | 2 |
| kealamian (penilai milestone itu) | 4,00 | 4,00 | 3,00 |
| kealamian (penilai M2d-5 yang SAMA) | 4,00 | 4,00 | 3,00 |
| biaya jalan TIRT (ledger) | US$0.3294 (tabel tebakan) | US$1.1811 (tabel tebakan) | US$0.1609 (**nyata**) |

## Frasa kartu yang diperjelas (D-8) dan kasus tayang

Teks kartu paket lingkar LLM diperjelas di `factory/llm/paket.ts`. `cases/*.json` (kasus tayang) TIDAK diubah di milestone ini; frasa lama yang masih ada di kasus tayang, untuk milestone produk terpisah:

| frasa lama | masih ada di |
|---|---|
| Daftar itu sendiri tidak bisa dibuktikan habis, jadi yang tercatat bukan tentu saja yang pernah terjadi. | — |
| Tanggal pencabutan penghentian ini tidak ada di data, jadi lamanya tidak bisa dipastikan dari sumber mana pun yang dipakai kasus ini. | `cases/dada-2025-10-08.json` |
| Teks keputusannya tidak ada di data, jadi isinya tidak bisa dikutip. | `cases/ultj-2026-05-04.json` |
| lolos seluruh pemeriksaan | — |
| Jarak antara penutupan terakhir sebelum tanggal ex dan pembukaan hari ini | `cases/ultj-2026-05-04.json` |
| Jarak antara turunnya harga dan dividen per lembar | `cases/ultj-2026-05-04.json` |

## Catatan penulis

### Singkatnya

**TIRT terbit (lolos penuh) di putaran 4 dari 15, dengan biaya NYATA US$0,16** (59 panggilan; seluruh milestone termasuk probe US$0,22 dari pagu US$4,00). Di M2d-4 TIRT tidak terbit sesudah 15 putaran dan US$1,18 menurut tabel tebakan (tagihan nyatanya kira-kira dua kali itu). Ketiga posisi dikunci di sudut pertamanya; penolakan pemeriksa mekanis yang menjatuhkan TIRT M2d-4 (KUNCI_SERAGAM 5×, ANGKA_TANPA_RUJUKAN 7×) tidak terjadi lagi: huruf kunci diatur kode (9 dari 10 versi dipindah hurufnya), dan tidak ada penolakan pemeriksa sama sekali di jalan ini.

**Tetapi uji luar TIDAK lolos: tebak buta luar 1 dari 3.** Omongan 2 (Sari, "naik 58 rupiah") dan omongan 3 (Nia, "hasil putusan rapat … ada di catatan resmi ya?") ditebak benar oleh ketiga penguji luar tanpa kartu (yakin 40 dan 55–60). Penebak di dalam lingkar menebak keduanya SALAH (0 dari 3). Menurut keputusan pemilik (simulasi agen boleh tayang bila lolos semua gerbang **dan** uji luar), **draf TIRT M2d-5 ini belum layak dipasang ke produk.** Draf tidak dipasang.

### Kenapa gerbang di dalam lebih lunak dari penguji luar

- **Penebak GLM di OpenRouter hampir tidak berpikir**: 9 tebakan, penalaran rata-rata 39 token (maks 123), padahal batasnya 3.000. Di M2d-4 (Featherless) penebak GLM berpikir ratusan sampai ribuan token dan menjadi penebak terkuat (benar 57–80 %). Di sini ia benar 5 dari 9, dan pada dua omongan yang tertebak di luar ia ikut salah. Probe sudah memperlihatkan gejalanya (batas 1.500 → 1 token penalaran), tetapi pada batas 3.000 ia berpikir 425 token, jadi setelan 3.000 dianggap cukup. Di jalan sungguhan penyedia yang melayani (Wafer, Sail Research, AkashML, Friendli) memberi penalaran pendek.
- **Soal yang tertebak di luar mudah ditebak dengan akal sehat, bukan dengan menghitung**: omongan 2 mengulang angka di pesan ("58 rupiah") di pilihan kunci ("memang Rp58") — pola "pilihan mengulang omongan dengan rapi" yang justru disebut petunjuk penebak; omongan 3 memuat dua pengecoh yang sama isinya ("tercatat di dokumen" / "ada di catatan resmi"), sehingga pemain yang menyingkirkan keduanya tinggal memilih di antara dua. Dua dari tiga penguji kartu juga menandai pasangan pilihan itu membingungkan. Tidak ada gerbang yang menangkap "dua pengecoh identik" (G-mirip membandingkan antar-omongan, bukan antar-pilihan; kritikus menganggap keduanya sama-sama salah, jadi bukan ambigu kunci).

### Gerbang baru di jalan sungguhan

- **G-penilaian dan G-mirip** tidak menolak satu versi pun: penulis mematuhi aturan 18–19; kemiripan pola pilihan terbesar 0,23 (ambang 0,40). Efeknya terlihat di hasil (tidak ada "aman lah", tidak ada templat "disetop karena …" ×2), bukan di jumlah penolakan. Penguji kartu diberi pertanyaan penilaian D-10; satu menandai "Gw udah hafal polanya" — gaya pamer, bukan penilaian investasi, dan bukan kata dari daftar G-penilaian.
- **Pembaca kartu menandai kalimat membingungkan** sekali (putaran 3, omongan 3: pesan "Aku ragu rapat … itu cuma dijadwalin, keputusannya ga dicatat." — tulisan penulis, menolak); versi berikutnya lolos. Pembaca kartu tidak menandai teks kartu paket. Penguji luar menandai **"dalam rangka cooling down sebagai bentuk perlindungan bagi investor"** (3 penguji, 2 omongan) — itu kutipan ALASAN RESMI bursa di kartu suspensi, bukan tulisan penulis dan bukan frasa sistem; tidak diubah di D-8 (mengubah kutipan resmi mengubah dokumennya). Kandidat: glos awam di samping kutipan (milestone produk).
- **Teks kartu yang diperjelas (D-8)** tidak lagi ditandai siapa pun: frasa M2d-4 ("dibuktikan habis", "lolos seluruh pemeriksaan") tidak muncul di bahan TIRT; frasa suspensi "Kapan perdagangannya dibuka lagi tidak tercatat" tidak ditandai.

### Batas penalaran dan penyedia (D-1, D-3)

- **AtlasCloud melayani 21 dari 41 panggilan DeepSeek di jalan TIRT** (26 dari 50 bila probe ikut; murah: 0,114/0,456) dan **tidak mematuhi `reasoning.max_tokens`**: penulis berpikir sampai 20.000 (habis, kosong, tetap ditagih) 3 kali → cadangan tanpa berpikir (3 dari 3 terbaca; omongan 2 yang dikunci justru tulisan cadangan tanpa berpikir); penebak DeepSeek berpikir sampai 15.344 dari batas 16.000 (nyaris terpotong). Batas penalaran efektif di penyedia lain; `max_tokens` menjadi batas keras yang sesungguhnya, dan perkiraan pagu memakainya.
- Kritikus GLM: 9 putusan, penalaran rata-rata 128 token, tidak ada yang terpotong, tidak ada "tidak menjawab" (M2d-4: 14/44 terpotong, 69 % biaya). Kritikus kini US$0,02 dari US$0,16 — biaya bukan lagi kritikus. Kritikus juga tidak mengajukan satu keberatan pun di 9 putusan; keberatan "minggu lalu tak tercek" yang muncul 2 dari 3 kali di probe menunjukkan kritikus GLM di OpenRouter cenderung lunak dan beragam antar-sampel.
- Semua 75 panggilan membawa `usage.cost` dan nama penyedia; tidak ada entri "tanpa cost".

### Keputusan yang diambil eksekutor (bisa ditolak reviewer)

1. **Probe dua putaran** (US$0,038 + US$0,026): putaran 2 dijalankan karena putaran 1 memperlihatkan AtlasCloud mengabaikan batas penalaran dan pembaca kartu DeepSeek berpikir 5.293 dari 8.000 token.
2. **Batas penalaran pembaca kartu (6.000/12.000)** ditambahkan walau D-3 hanya menyebut penulis, kritikus, dan penebak GLM — alasannya data probe (nyaris terpotong di 8.000). Ditetapkan sebelum jalan TIRT.
3. **Contoh bank gaya yang memuat "aman lah" (v2-056, v2-061) tidak ditunjukkan ke penulis M2d-5** (disaring kode dengan G-penilaian); berkas bank tidak diubah.
4. **Rujukan huruf: dilarang** (bukan disesuaikan otomatis) — dari 200 versi M2d-3/M2d-4 tidak ada satu pun yang merujuk huruf, dan larangan bisa dites persis.
5. **Jalan kedua tidak dijalankan**: D-9 hanya membolehkannya bila jalan pertama tidak terbit.
6. Kealamian memakai kelompok jangkar ULTJ (manusia + M2d-4) supaya skor TIRT bisa dibaca terhadap skor manusia dari penilai yang sama.

### Keterbatasan

- **n sangat kecil**: satu simulasi, 3 omongan, 3 penguji per uji. Perbedaan penilai kealamian antar-milestone besar (manusia ULTJ 4,00 di M2d-4, 3,00 di M2d-5).
- **Kealamian TIRT M2d-5 (3,00) di bawah draf TIRT M2d-4 dan M2d-3 (4,00) pada penilai yang sama**; kritikannya ada di penjelasan ("kartu penentu menghitung selisih", "beralasan tidak sama") — penjelasan tidak disentuh gerbang gaya, dan istilah "kartu penentu" bocor dari prompt ke penjelasan.
- **Temuan Featherless** memakai angka kredit pemilik yang dikutip kontrak (turun ±US$14,5 dari US$15); rasio 1,88 bergantung pada angka itu.
- Tidak ada panggilan Sectors; `web/`, `server/`, `cases/`, `factory/verifikasi/`, `deploy/` tidak disentuh; draf tidak dipasang ke produk.
