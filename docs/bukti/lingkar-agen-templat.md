# Bukti: mesin penulis "templat" + penyempurna Haiku + penebak keluarga campur (M2d-10)

Berkas ini ditulis oleh `npm run templat:laporan` dari keluaran mentah (`eval/keluaran-m2d10/`, `eval/penyusun/m2d10-tirt/`) dan ledger OpenRouter (biaya NYATA `usage.cost`, tag `m2d10/` dan `penyusun/m2d10-`). Hanya "Catatan penulis" yang ditulis tangan (`eval/keluaran-m2d10/laporan-tangan.md`). Soal DADA/ULTJ yang hidup disebut **soal tayang (Claude + pemilik)**. Tidak ada yang dipasang ke produk.

## Pra-registrasi (D-0)

`docs/bukti/m2d10-praregistrasi.md` di-commit **1b755d2 2026-09-30T23:37:45+07:00**; panggilan berbayar M2d-10 pertama di ledger: **2026-09-30T17:17:25.728Z**. Berkas itu dan pra-registrasi M2d-7 dites tidak berubah sejak commit masing-masing (`templat/praregistrasi.test.ts`).

## Templat (D-1)

Enam pola diturunkan dari POLA enam soal tayang (Claude + pemilik), bukan dari kalimatnya (`factory/llm/templat/pola.ts`). Tiap pilihan membawa proposisi; nilai kebenarannya dihitung kode dari fakta paket (`proposisi.ts`), dan `bukti.ts` membuktikan tepat satu pilihan benar untuk SETIAP varian yang boleh dipilih penyempurna (tes: `templat.test.ts`, termasuk sabotase "dua pilihan benar").

| pola | dari soal tayang |
|---|---|
| sebab-resmi | DADA s1 (soal tayang): alasan yang disebut teman lain dari alasan di dokumen |
| angka-lain-waktu | ULTJ s1 (soal tayang): angka hari lain dipakai untuk hari yang dibicarakan |
| setengah-benar | ULTJ s2 (soal tayang): klaim dua bagian, satu benar satu salah |
| benar-berincian | ULTJ s3 (soal tayang): klaim betul, kunci dengan rincian tepat |
| arah-kali-tingkat | DADA s3 (soal tayang): kisi arah × tingkat, satu sel benar |
| besaran-hitungan | DADA s2 (soal tayang): besaran hitungan yang disebut teman dengan kata-kata |

### Rencana di paket TIRT 10 Des 2025 (6 rencana, semua lolos bukti)

**sebab-resmi** (sudut `susp-2025-12-10`, klaim Keliru, bukti sah) — klaim: Teman yakin bursa menghentikan perdagangan saham Perusahaan T hari ini karena bursa ragu usahanya bisa terus berjalan.

- kunci (Keliru + alasan resmi di dokumen): Keliru, alasan resmi hari ini: kenaikan harganya terlalu tajam. — proposisi BENAR
- p1 (Betul + alasan yang disebut teman): Betul, bursa menghentikannya hari ini karena usahanya diragukan bisa terus berjalan. — proposisi salah
- p2 (Betul + alasan tambahan yang tidak ada di dokumen): Betul, pengumuman hari ini juga menyebut rencana pengambilalihan belum diumumkan. — proposisi salah
- p3 (Keliru + alasan lain yang tidak ada di dokumen): Keliru, alasan resmi hari ini: laporan keuangannya terlambat diserahkan. — proposisi salah

**angka-lain-waktu** (sudut `harga-2025-12-09`, klaim Keliru, bukti sah) — klaim: Teman menyebut harga penutupan kemarin (9 Desember) Rp97.

- kunci (Keliru + angka yang benar, bukan angka teman): Keliru, penutupan 9 Desember Rp106, bukan Rp97. — proposisi BENAR
- p1 (Betul + angka teman): Betul, penutupan 9 Desember memang Rp97. — proposisi salah
- p2 (Betul + kesimpulan dari angka teman): Betul, Rp97 itu penutupan tertinggi sebelum hari ini. — proposisi salah
- p3 (Keliru + angka lain yang juga bukan angka hari itu): Keliru, penutupan 9 Desember Rp115, bukan Rp97. — proposisi salah

**setengah-benar** (sudut `susp-2025-01-21`, klaim Keliru, bukti sah) — klaim: Teman bilang harga penutupannya naik 9 hari bursa berturut-turut, dan sebelum hari ini sahamnya belum pernah dihentikan bursa sepanjang tahun ini.

- kunci (Keliru: bagian pertama benar, bagian kedua salah): Keliru, naiknya memang beruntun, tapi 21 Januari sudah pernah dihentikan. — proposisi BENAR
- p1 (Betul: kedua bagian dibenarkan): Betul, naik beruntun dan baru kali ini dihentikan tahun ini. — proposisi salah
- p2 (Betul + salah membaca alasan penghentian lama): Betul, penghentian 21 Januari pun karena kenaikan harganya terlalu tajam. — proposisi salah
- p3 (Keliru: bagian yang benar dibantah, bagian yang salah dibenarkan): Keliru, harganya sempat turun, tapi memang belum pernah dihentikan. — proposisi salah

**benar-berincian** (sudut `hari-naik-beruntun`, klaim Betul, bukti sah) — klaim: Teman bilang sejak 26 November harga penutupannya naik terus setiap hari bursa, tidak pernah turun sekali pun.

- kunci (Betul + rincian yang tepat): Betul, naik 9 hari bursa berturut-turut tanpa sekali pun turun. — proposisi BENAR
- p1 (Keliru: menyangkal rangkaian yang tercatat): Keliru, harganya sempat turun satu hari di tengah rangkaian itu. — proposisi salah
- p2 (Betul + rincian yang salah): Betul, tapi naik beruntunnya hanya 4 hari bursa. — proposisi salah
- p3 (Keliru: arah dibalik): Keliru, harga penutupannya malah turun beruntun sejak itu. — proposisi salah

**arah-kali-tingkat** (sudut `hari-naik-beruntun`, klaim Keliru, bukti sah) — klaim: Teman bilang harga penutupan 9 Desember masih puluhan rupiah per lembar, jadi harganya belum ke mana-mana.

- kunci (arah benar × tingkat benar): Keliru, harganya naik sampai ratusan rupiah pada 9 Desember. — proposisi BENAR
- p1 (arah benar × tingkat salah): Betul, harganya naik tapi 9 Desember masih puluhan rupiah. — proposisi salah
- p2 (arah salah × tingkat salah): Betul, harganya turun sampai puluhan rupiah pada 9 Desember. — proposisi salah
- p3 (arah salah × tingkat benar): Keliru, harganya turun tapi 9 Desember masih ratusan rupiah. — proposisi salah

**besaran-hitungan** (sudut `kelipatan-2025-11-26-2025-12-09`, klaim Betul, bukti sah) — klaim: Teman bilang sejak 26 November harga penutupannya sudah lebih dari dua kali lipat.

- kunci (Betul + angka hitungan): Betul, penutupan 9 Desember 2,21 kali penutupan 26 November. — proposisi BENAR
- p1 (Betul + angka hitungan yang salah): Betul, penutupan 9 Desember 2,02 kali penutupan 26 November. — proposisi salah
- p2 (Keliru: selisih rupiah dikira kelipatan): Keliru, naiknya cuma Rp58, bukan dua kali lipat. — proposisi salah
- p3 (Keliru: arah dibalik): Keliru, penutupan 9 Desember malah lebih rendah dari 26 November. — proposisi salah

## Kalibrasi singkat (D-5)

Biaya US$0.3150 dari pagu US$0.35 (ditegakkan kode). Kritikus lima soal tayang = hasil M2d-8 (setelan & teks sama, dicek kode); kritikus ULTJ s3 diukur baru. Soal yang tidak lengkap tidak dilengkapi tangan.

| soal | kelompok | kunci | kode | penebak Haiku · DeepSeek · GLM | pembaca kartu | kritikus |
|---|---|---|---|---|---|---|
| dada-s1-kata-bursa | tayang | b | PENJELASAN_TANPA_PENENTU | d/65 · d/78 · d/75 | b | m2d8: tanpa keberatan |
| dada-s2-dividen-pemilik-kecil | tayang | a | ANDAIAN_DI_PENJELASAN, G-register | b/45 · c/70 · c/65 | a | m2d8: tertebak |
| dada-s3-siapa-yang-menjual | tayang | c | — | b/72 · d/65 · b/60 | c | m2d8: tanpa keberatan |
| ultj-turun-di-tanggal-ex | tayang | b | — | c/72 · c/60 · c/60 | b | m2d8: tanpa keberatan |
| ultj-riwayat-dividen | tayang | a | G-register | b/55 · a/72 · b/60 | b | m2d8: tanpa keberatan |
| ultj-siapa-yang-membeli | tayang | d | G-register | b/55 · a/82 · tak terbaca | b | m2d10: kunci, ambigu |
| m2d5-tirt-o2 | bocor | d | — | d/62 · d/72 · tak terbaca | d | — |
| m2d5-tirt-o3 | bocor | d | G-pilihan-kembar | b/45 · b/55 · b/65 | d | — |
| m2d4-tirt-o3 | bocor | a | — | a/55 · b/75 · a/60 | a | — |
| m2d4-tirt-o1 | bocor | a | — | — | — | — (PaguMilestoneTercapai: Pagu milestone tercapai: biaya milestone (tag m2d10/kalib) |

Langkah aturan pra-registrasi §4:

- S1: tumpukan menerima 4/6 soal tayang
- S2: tumpukan menerima 4/6 soal tayang
- S3: tumpukan menerima 4/6 soal tayang
- S4: tumpukan menerima 4/6 soal tayang
- S5: tumpukan menerima 4/6 soal tayang
- S6: tumpukan menerima 4/6 soal tayang
- S7: tumpukan menerima 4/6 soal tayang
- S7 + pembaca kartu dicatat: tumpukan menerima 5/6 soal tayang

**Setelan hasil (dipakai persis oleh mesin):** S7 + pembaca kartu dicatat — penebak dicatat, pembaca kartu dicatat, kritikus kunci/makna/aturan.

**Syarat:** soal tayang diterima 5/6 (terpenuhi). Tangkapan soal bocor sebelum kritikus di bawah setelan hasil: 1/3.

| gerbang | S1: tayang ditolak | S1: bocor ditolak | hasil: tayang ditolak | hasil: bocor ditolak |
|---|---:|---:|---:|---:|
| kode | 0/6 | 1/3 | 0/6 | 1/3 |
| penebak | 0/6 | 2/3 | 0/6 | 0/3 |
| kartu | 2/6 | 0/3 | 0/6 | 0/3 |
| kritikus | 1/6 | 0/3 | 1/6 | 0/3 |
| sebelum_kritikus | 2/6 | 3/3 | 0/6 | 1/3 |
| ditolak | 2/6 | 3/3 | 1/6 | 1/3 |

## Soal pemanasan (D-7a, mode dipandu)

Rencana `sebab-resmi:susp-2025-12-10`; **LOLOS** di percobaan 1; biaya US$0.0214. Tebak buta tidak disyaratkan (pra-registrasi §5).

**Percobaan 1** — lolos

> **Dita (20.15):** Gw yakin banget bursa stop dagang saham Perusahaan T hari ini, soalnya bursa ragu usaha Perusahaan T bisa terus jalan.

- a) Betul, bursa menghentikannya hari ini karena usahanya diragukan bisa terus berjalan.
- **b) Keliru, alasan resmi hari ini: kenaikan harganya terlalu tajam.** (kunci)
- c) Betul, pengumuman hari ini juga menyebut rencana pengambilalihan belum diumumkan.
- d) Keliru, alasan resmi hari ini: laporan keuangannya terlambat diserahkan.

Kartu: `susp-2025-12-10` (penentu), `susp-2025-01-21`

Penjelasan: Yang terbaca: perdagangan saham Perusahaan T dihentikan sementara oleh bursa pada 10 Desember. Alasan resminya kenaikan harga kumulatif yang signifikan, sebagai cooling down perlindungan investor. Karena itu, tuduhan bahwa bursa ragu usaha Perusahaan T bisa terus jalan tidak cocok untuk penghentian hari ini. Alasan keraguan kelangsungan usaha justru tercatat untuk penghentian pada 21 Januari, bukan untuk kejadian hari ini. Jadi isi yang benar: keliru, alasan resmi hari ini kenaikan harganya terlalu tajam. Yang menggoda, yaitu membenarkan karena usaha diragukan, keliru karena mencampur alasan penghentian berbeda. Salah-kaprah yang umum: mengira alasan penghentian yang lebih dulu juga berlaku untuk penghentian hari ini.

- pembaca kartu: b (kartu susp-2025-12-10) · b (kartu susp-2025-12-10) · b (kartu susp-2025-12-10)
- kritikus: tanpa keberatan
- dicatat: [kritikus: arahan] Perketat redaksi pilihan b agar lebih menempel pada 'peningkatan harga kumulatif yang signifikan' di kartu, sebab 'terlalu tajam' bisa diperdebatkan pembaca teliti.

### Soal pemanasan utuh (`eval/keluaran-m2d10/pemanasan/soal.json`, belum dipasang ke produk)

Petunjuk: Pemanasan: jawabannya ada di kartu 1. Baca alasan resmi di kartu itu, lalu cocokkan dengan omongan Dita.

Pertanyaan: Omongan Dita cocok dengan dokumennya?

## Jalan TIRT lewat pintu penyusun (D-7b)

`npm run templat:jalan` → pintu penyusun, mesin `templat`, TIRT 10 Des 2025, satu jalan (`eval/penyusun/m2d10-tirt/`: aliran.jsonl, jejak-agen.json, hasil.json, keadaan.json, paket.json). Setelan: penebak dicatat, pembaca kartu dicatat, kritikus kunci/makna/aturan.

**TIDAK TERBIT** sesudah 2 versi (omongan 1: rencana besaran-hitungan:kelipatan-2025-11-26-2025-12-09 habis dan tidak ada rencana pengganti; simulasi tidak terbit). Rencana awal: sebab-resmi:susp-2025-12-10, angka-lain-waktu:harga-2025-12-09, benar-berincian:hari-naik-beruntun.

### Distribusi: di gerbang mana tiap versi berhenti

| berhenti | versi |
|---|---:|
| kritikus | 2 |

Versi yang sampai ke kritikus: 2 dari 2.

| omongan | rencana | versi | berhenti | alasan (ringkas) | penebak (dicatat/menolak) | pembaca kartu | titik buta |
|---|---|---:|---|---|---|---|---|
| 1 | sebab-resmi:susp-2025-12-10 | 1 | kritikus | kritikus tidak menjawab (dua kali) | claude-haiku-4.5 d/62 · deepseek-v4.1-flash c/60✓ · glm-5.3 c/100✓ | c (kunci c) |  |
| 1 | besaran-hitungan:kelipatan-2025-11-26-2025-12-09 | 1 | kritikus | kritikus tidak menjawab (dua kali) | claude-haiku-4.5 c/72✓ · deepseek-v4.1-flash c/55✓ · glm-5.3 a/45 | c (kunci c) |  |

### Penyempurna Haiku

Tidak dipanggil (tidak ada penolakan di pilihan oleh gerbang yang menolak).


### Omongan yang dikunci

Tidak ada.

### Uji luar dan putusan mekanis (pra-registrasi M2d-7, tidak diubah)

| syarat | hasil | terpenuhi |
|---|---|---|
| (a) terbit | tidak terbit | **tidak** |
| (b) tebak buta luar ≥ 2/6 | 0/0 | **tidak** |
| (c) jawab-dengan-kartu penuh | 0/0 | **tidak** |
| (d) nol masalah makna | 0 masalah | **tidak** |

**Putusan: TIDAK layak tayang.**


### Uji luar TAMBAHAN (bukan putusan)

TAMBAHAN — bukan putusan pra-registrasi (tidak ada omongan dikunci). Diuji: 1 = jalan versi 1 (sebab-resmi), 2 = jalan versi 2 (besaran-hitungan), 3 = soal pemanasan. Prosedur sama (3 penguji tebak buta + 3 penguji kartu, subagent Claude opus baru, sinkron; bahan & jawaban mentah di `eval/keluaran-m2d10/penguji-tambahan/`). Omongan 1 dan 3 hampir sama (pola, kartu, dan pilihan yang sama; pesan berbeda).

- 1 (kunci c): tebak c/50 · a/45 · a/35 → tidak lolos; kartu c/1 · c/1+2 · c/1+2 → lolos; masalah makna: tidak ada
- 2 (kunci c): tebak c/40 · c/35 · c/50 → tidak lolos; kartu c/1 · c/1 · c/1 → lolos; masalah makna: M2 setiap bagian klaim tercek kartu (3/3 penguji kartu ("tak_tercek")); M3 tanpa penilaian investasi (3/3 penguji kartu ("penilaian"))
- 3 (kunci b): tebak b/50 · a/45 · a/35 → tidak lolos; kartu b/1 · b/1+2 · b/1+2 → lolos; masalah makna: tidak ada

## Biaya NYATA M2d-10 (OpenRouter, `usage.cost`)

Entri ledger bertag `m2d10/` + `penyusun/m2d10-`: **US$0.6862 dalam 155 panggilan**, dari pagu milestone US$1.20 (ditegakkan kode).

| bagian · peran · model | panggilan | token keluar | biaya nyata |
|---|---:|---:|---:|
| jalan TIRT · kritikus · z-ai/glm-5.3 | 8 | 5.818 | US$0.0194 |
| jalan TIRT · pembaca kartu · deepseek/deepseek-v4.1-flash | 2 | 4.454 | US$0.0021 |
| jalan TIRT · penebak · anthropic/claude-haiku-4.5 | 2 | 255 | US$0.0026 |
| jalan TIRT · penebak · deepseek/deepseek-v4.1-flash | 2 | 5.467 | US$0.0053 |
| jalan TIRT · penebak · z-ai/glm-5.3 | 3 | 931 | US$0.0030 |
| jalan TIRT · penulis (penjelasan) · deepseek/deepseek-v4.1-flash | 2 | 3.926 | US$0.0025 |
| jalan TIRT · penulis (pesan) · deepseek/deepseek-v4.1-flash | 2 | 2.715 | US$0.0017 |
| jalan TIRT A-1 · kritikus · z-ai/glm-5.3 | 3 | 10.414 | US$0.0466 |
| jalan TIRT A-1 · pembaca kartu · deepseek/deepseek-v4.1-flash | 2 | 5.486 | US$0.0028 |
| jalan TIRT A-1 · penebak · anthropic/claude-haiku-4.5 | 8 | 1.249 | US$0.0115 |
| jalan TIRT A-1 · penebak · deepseek/deepseek-v4.1-flash | 7 | 30.861 | US$0.0184 |
| jalan TIRT A-1 · penebak · z-ai/glm-5.3 | 4 | 18.252 | US$0.0808 |
| jalan TIRT A-1 · penulis (penjelasan) · deepseek/deepseek-v4.1-flash | 10 | 21.746 | US$0.0160 |
| jalan TIRT A-1 · penulis (pesan) · deepseek/deepseek-v4.1-flash | 4 | 6.946 | US$0.0048 |
| jalan TIRT A-1 · penyempurna · anthropic/claude-haiku-4.5 | 4 | 944 | US$0.0131 |
| jalan TIRT A-2 · kritikus · z-ai/glm-5.3 | 1 | 9.328 | US$0.0414 |
| jalan TIRT A-2 · pembaca kartu · deepseek/deepseek-v4.1-flash | 3 | 6.539 | US$0.0070 |
| jalan TIRT A-2 · penebak · anthropic/claude-haiku-4.5 | 8 | 1.090 | US$0.0107 |
| jalan TIRT A-2 · penebak · deepseek/deepseek-v4.1-flash | 7 | 32.047 | US$0.0222 |
| jalan TIRT A-2 · penebak · z-ai/glm-5.3 | 4 | 1.615 | US$0.0047 |
| jalan TIRT A-2 · penulis (penjelasan) · deepseek/deepseek-v4.1-flash | 9 | 22.299 | US$0.0151 |
| jalan TIRT A-2 · penulis (pesan) · deepseek/deepseek-v4.1-flash | 5 | 10.833 | US$0.0062 |
| jalan TIRT A-2 · penyempurna · anthropic/claude-haiku-4.5 | 4 | 900 | US$0.0121 |
| kalibrasi · kritikus · z-ai/glm-5.3 | 1 | 34.002 | US$0.1021 |
| kalibrasi · pembaca kartu · deepseek/deepseek-v4.1-flash | 9 | 14.331 | US$0.0085 |
| kalibrasi · penebak · anthropic/claude-haiku-4.5 | 10 | 1.432 | US$0.0135 |
| kalibrasi · penebak · deepseek/deepseek-v4.1-flash | 11 | 32.150 | US$0.0220 |
| kalibrasi · penebak · z-ai/glm-5.3 | 14 | 55.978 | US$0.1689 |
| pemanasan · kritikus · z-ai/glm-5.3 | 1 | 5.392 | US$0.0165 |
| pemanasan · pembaca kartu · deepseek/deepseek-v4.1-flash | 3 | 5.228 | US$0.0028 |
| pemanasan · penulis (penjelasan) · deepseek/deepseek-v4.1-flash | 1 | 1.403 | US$0.0014 |
| pemanasan · penulis (pesan) · deepseek/deepseek-v4.1-flash | 1 | 1.067 | US$0.0007 |

| model | panggilan | biaya nyata |
|---|---:|---:|
| z-ai/glm-5.3 | 39 | US$0.4834 |
| deepseek/deepseek-v4.1-flash | 80 | US$0.1394 |
| anthropic/claude-haiku-4.5 | 36 | US$0.0634 |

## Catatan penulis

### Singkatnya

- **Templat (D-1):** enam pola dari POLA enam soal tayang (Claude + pemilik). Kode menghitung nilai kebenaran tiap pilihan dari fakta paket dan membuktikan tepat satu pilihan benar, untuk setiap varian yang boleh dipilih penyempurna. Di paket TIRT keenam pola berlaku, dan keenam rencananya sah. Tes anti-salin: tidak ada potongan 5 kata dari soal tayang.
- **Kalibrasi (D-5):** biaya nyata US$0,3150 dari pagu 0,35. Pagu berhenti di soal bocor keempat, jadi 3 dari 6 soal bocor terukur.
  - Penebak keluarga campur tidak menolak satu pun soal tayang (0/6) dan menolak 2 dari 3 soal bocor.
  - Pembaca kartu DeepSeek salah di 2 soal tayang (ULTJ s2 dan s3). Kegagalannya sama dengan M2d-8.
  - Kritikus baru untuk ULTJ s3 berkeberatan `kunci`.
  - Aturan pra-registrasi §4 mencoba keadaan penebak S1…S7 LEBIH DULU. Akibatnya setelan pertama yang memenuhi syarat adalah **"S7 + pembaca kartu dicatat"**: penebak dan pembaca kartu tidak menolak lagi. Lihat temuan 1.
- **Soal pemanasan (D-7a):** lolos di percobaan pertama (US$0,0214). Pembaca kartu 3/3 memilih kunci dan menunjuk kartu 1. Kritikus tidak berkeberatan. Arahannya dicatat: "terlalu tajam" bisa diperdebatkan pembaca teliti.
- **Jalan TIRT (D-7b):** **tidak terbit** sesudah 2 versi (US$0,0365). Kedua versi sampai ke kritikus, dan kritikus "tidak menjawab" di keduanya (temuan 2). Tidak ada omongan yang dikunci, jadi putusan mekanis M2d-7 = **TIDAK** (syarat a).
- **Biaya nyata M2d-10:** US$0,3728 dari pagu US$1,20.
  - Per model: GLM US$0,3099, DeepSeek US$0,0469, Haiku US$0,0161.
  - Kumulatif ledger kini ±US$8,64 dari `LLM_PAGU_USD` 10.

### Temuan yang paling penting

1. **Aturan kalibrasi pra-registrasi saya cacat urutannya.**
   - Tabel §4 hanya mengurutkan keadaan penebak. Pembaca kartu baru boleh diturunkan sesudah S7 (penebak "dicatat"). M2d-8 punya klausa "lewati gerbang yang tidak menolak soal manusia"; pra-registrasi ini tidak memuatnya.
   - Akibatnya penebak diturunkan menjadi "dicatat" walau ia tidak menolak satu pun soal tayang, dan walau ia menangkap 2 dari 3 soal bocor.
   - Tangkapan bocor sebelum kritikus turun dari 3/3 (S1) ke 1/3 (setelan hasil).
   - Aturan itu tetap saya jalankan PERSIS, tanpa diubah sesudah melihat data, dan setelan itulah yang dipakai jalan TIRT.
   - Kalau penyimpangan diizinkan, pembanding yang masuk akal adalah "S1 + pembaca kartu dicatat": 5/6 soal tayang diterima (ULTJ s3 ditolak kritikus), 3/3 bocor tertangkap. Setelan ini **tidak** dipakai; reviewer yang memutuskan.
2. **Jalan TIRT gagal karena infrastruktur, lalu cacat mesin memperburuknya.**
   - Semua panggilan GLM di jalan ini dilayani SiliconFlow dan Phala, bukan Wafer (kalibrasi 10 menit sebelumnya masih dilayani Wafer). Kedua penyedia itu berpikir 333–886 token, di bawah ambang kritikus 1.000.
   - Dua kali panggilan kritik (empat percobaan) per versi = "tidak menjawab".
   - Mesin lalu **membuang rencana sesudah satu versi**. Pra-registrasi §3 membolehkan ≤ 4 versi per rencana, jadi mesin menyimpang dari prosedur yang didaftarkan.
   - Omongan 1 hanya mencoba 2 dari 3 rencana. Rencana ketiga tidak ada karena bentrok penentu dengan posisi lain, jadi jalan berhenti di omongan 1. Omongan 2 dan 3 tidak pernah ditulis.
   - Cacat itu sudah diperbaiki sesudah jalan (kritikus diam = versi ditolak, rencana tetap; dites, sabotase T07-S1 merah).
   - Jalan **tidak diulang**, karena pra-registrasi §6 menulis tepat satu jalan. Sisa pagu milestone ±US$0,83.
3. **Tujuan struktur templat terlihat di uji luar tambahan, walau n kecil.**
   - Tiga soal diuji: dua versi jalan yang sampai ke kritikus dan soal pemanasan.
   - Ketiganya dijawab benar 3/3 oleh penguji kartu Opus, dan **tidak ada satu pun penguji yang menyebut pilihan lain juga benar**. Di M2d-8, 3/3 penguji kartu menyebut "a juga benar".
   - Dua soal sebab-resmi gagal tebak buta hanya lewat klausa keyakinan: 1/3 penguji memilih kunci, dengan yakin 50.
   - Soal besaran-hitungan tertebak 3/3. Pesannya ("ini gila banget!") ditandai tak tercek dan berpenilaian oleh 3/3 penguji.
   - Semua ini BUKAN putusan: tidak ada omongan yang dikunci.
4. **Penyempurna Haiku (D-3) tidak pernah dipanggil di panggilan sungguhan.**
   - Dengan setelan hasil, penebak dan pembaca kartu tidak menolak. Kritikus tidak menjawab.
   - Karena itu tidak ada penolakan di pilihan yang memicunya. Perilakunya hanya terbukti dengan model palsu: kode membuang perubahan angka, rujukan, label, dan varian slot lain (T03, T04).
   - Titik buta Haiku ↔ penguji luar Anthropic tetap risiko teoretis. Belum ada draf yang disempurnakan Haiku lalu ditebak Haiku.
5. **Haiku sebagai penebak** tidak menebak satu pun soal tayang. Di soal bocor ia memilih kunci 2/3 (d/62, a/55), dan dengan A = 60 hanya satu yang menolak. Haiku, DeepSeek, dan GLM sering berbeda pilihan; keluarga campur memang memberi suara yang berbeda.

### Keputusan yang diambil eksekutor (bisa ditolak reviewer)

1. Kritikus lima soal tayang dipakai ulang dari M2d-8. Ini tertulis di pra-registrasi §4, dengan pengecekan kode bahwa teks soal sama. Hanya ULTJ s3 yang diukur baru.
2. Model ketiga ditambahkan ke `MODEL_OPENROUTER`. Skrip M2d-5/M2d-7/M2d-8 dibatasi ke `MODEL_DUA` supaya tetap dua model. Pemanggil pintu kini menerima ketiga model.
3. Dengan penebak "dicatat", ketiga penebak tetap dipanggil tiap versi, supaya tebakannya terlihat di jejak (±US$0,005/versi).
4. Uji luar tambahan atas versi yang tidak dikunci dan soal pemanasan dijalankan untuk laporan saja, di folder terpisah.
5. Skrip uji luar dan laporan dinamai `templat/uji-luar.ts` dan `templat/tulis-laporan.ts`. Nama `penguji.ts` dan `laporan.ts` memicu penjaga `main` milik `factory/llm/penguji.ts` dan `factory/llm/laporan.ts` (regex akhiran nama berkas; `laporan.ts` ikut termuat lewat `kalibrasi-setelan.ts`). Penjaga penguji menulis ulang berkas M2d-1 dengan isi sama byte demi byte. Penjaga laporan menulis ulang `docs/bukti/uji-tanding-model.md` dan `eval/keluaran-m2d/*.json` dengan ledger kini; ketiga berkas itu dipulihkan dengan `git checkout` sebelum commit.
6. Penjelasan penulis boleh diawali "Yang terbaca:". Prompt penjelasan templat tidak melarangnya, dan validator juga tidak.

### Perbandingan jalan TIRT M2d-4…M2d-10

| milestone | mesin | hasil | biaya jalan | catatan uji luar |
|---|---|---|---:|---|
| M2d-4 | lingkar gaya | tidak terbit | US$1,18 | — |
| M2d-5 | lingkar OpenRouter | terbit | US$0,16 | gagal uji luar |
| M2d-6 | penalar "high" | tidak terbit | US$1,84 | omongan dikunci bocor |
| M2d-7 | pengecoh dari data (2 jalan) | tidak terbit | US$0,34 + 1,15 | — |
| M2d-8 | kalibrasi soal manusia | tidak terbit | US$0,91 | 1 dikunci: tebak 3/3, "a juga benar" 3/3 |
| M2d-9 | pintu penyusun (lingkar M2d-8) | tidak terbit | US$0,44 | — |
| M2d-10 | templat lewat pintu | tidak terbit | US$0,04 | 0 dikunci; tambahan: kartu 3/3, kunci lain 0/9 |

### Keterbatasan

- n sangat kecil: 6 soal tayang, 3 soal bocor terukur, 2 versi jalan, 3 soal di uji tambahan.
- Soal pemanasan dan omongan 1 jalan memakai pola dan kartu yang sama (sebab-resmi, penghentian 10 Des + 21 Jan). Di produk keduanya akan terasa berulang.
- Kalimat templat "kenaikan harganya terlalu tajam" diberi arahan kritikus: kurang menempel ke "peningkatan harga kumulatif yang signifikan".
- Penguji luar dan Haiku sekeluarga (Anthropic). Hipotesis pemilik tentang bias keluarga berlaku ke arah ini juga.
- Tidak ada panggilan Sectors. `web/`, `server/`, `cases/`, `factory/verifikasi/`, `factory/kasus/`, `deploy/` tidak disentuh. Tidak ada yang dipasang ke produk.

### Usul untuk reviewer

- (a) Tulis pra-registrasi tambahan dengan aturan kalibrasi yang melewati gerbang yang tidak menolak soal tayang. Setelan pembandingnya "S1 + pembaca kartu dicatat".
- (b) Izinkan satu jalan TIRT lagi dengan mesin yang sudah diperbaiki, dengan sisa pagu ±US$0,83.
- (c) Pertimbangkan pagar GLM yang tidak jatuh ke penyedia yang tidak berpikir: `allow_fallbacks: false` untuk kritikus, atau ulangan yang menunggu Wafer.

### Amandemen A-1 (satu jalan TIRT lagi)

- **Pra-registrasi A-1** (`docs/bukti/m2d10-praregistrasi-a1.md`) di-commit sebelum panggilan berbayar A-1 pertama. Isinya: setelan S1 + pembaca kartu "dicatat" (penebak tetap menolak), kritikus dikunci ke Wafer (`order: ["wafer"]`, `allow_fallbacks: false`, tanpa `ignore`), mesin yang diperbaiki, dan pagu jalan US$0,45. Pada data kalibrasi yang sama, setelan ini menerima 5/6 soal tayang dan menangkap 3/3 soal bocor sebelum kritikus.
- **Hasil: TIDAK TERBIT** sesudah 10 versi (US$0,1939 dari pagu 0,45).
  - Omongan 1 (sebab-resmi) dikunci di versi 1. Omongan 2 (angka-lain-waktu) dikunci di versi 2; versi 1-nya ditolak kode karena penjelasan memuat angka telanjang.
  - Omongan 3 habis di kedua rencana Betul yang ada: benar-berincian 3 versi, besaran-hitungan 4 versi. Keenam versi yang sampai ke penebak ditolak penebak campur. Rencana ketiga tidak ada, karena posisi 3 satu-satunya klaim Betul dan kedua pola Betul sudah terpakai.
  - Distribusi: kode 2, penebak 6, pembaca kartu 0, kritikus 0, lolos 2.
- **Kritikus:** 2 panggilan sampai ke Wafer, berpikir 5.305 dan 4.707 token. Satu percobaan HTTP pertama kena 429 (rate limit Wafer), lalu diulang klien ke Wafer juga; tidak ada pengalihan. Kedua versi yang diperiksa kritikus lolos tanpa keberatan yang menolak.
- **Penyempurna Haiku dipanggil sungguhan 4 kali** (omongan 3, jenis "tertebak"). Keempat usulannya diterima kode (varian K2/P1b/P2b/P3b, P2a, P1b, P1a; tanpa angka atau rujukan yang berubah). Tetapi penebak tetap memilih kunci. Titik buta tercatat di 4 versi, dengan pola ini: Haiku justru TIDAK memilih kunci di benar-berincian (a/45…a/62), sedangkan DeepSeek dan GLM memilihnya.
- **Penebak di omongan 3.**
  - Benar-berincian: DeepSeek dan GLM menebak "9 hari bursa berturut-turut sampai 9 Desember" dari rentang tanggal di pesan (26 November–9 Desember ≈ 9–10 hari bursa). Templat ini membocorkan kunci lewat hitungan kalender. Ini temuan tentang polanya.
  - Besaran-hitungan: dua pilihan Betul sama-sama cocok dengan "lebih dari dua kali lipat". Penebak memilih yang lebih wajar (2,21), bukan 3,51. Pengecoh angka yang terlalu jauh gampang disingkirkan.
- **Uji luar (resmi menurut prosedur M2d-7, hanya laporan karena tidak terbit)** atas 2 omongan yang dikunci, dengan 6 subagent opus baru, sinkron:
  - Omongan 1: tebak buta c/40 · c/40 · a/35 → 2/3 memilih kunci, tidak lolos.
  - Omongan 2: c/35 · c/30 · a/30 → 0/3, **lolos tebak buta**.
  - Kartu: 3/3 benar di kedua omongan, "kunci lain" 0/6.
  - Masalah makna: 1 (omongan 2 M2, "Gw hafal angka beginian" tak tercek oleh 2/3 penguji).
  - Putusan: **TIDAK layak tayang**: (a) tidak; (b) 1/2 ya; (c) 2/2 ya; (d) 1 masalah → tidak.
- **Biaya A-1** US$0,1939: GLM 0,1274, DeepSeek 0,0420, Haiku 0,0245. Milestone M2d-10 kini US$0,5668 dari 1,20; kumulatif ledger US$8,8320.
- **Yang perlu diputuskan reviewer:**
  1. Pola benar-berincian bisa ditebak dari rentang tanggal di pesan (panjang rentang ≈ jumlah hari naik). Perbaikannya di templat: pesan tanpa tanggal awal, atau pengecoh rincian yang sama masuk akalnya.
  2. Pengecoh angka "salah" di besaran-hitungan harus lebih dekat ke nilai benar.
  3. Kalimat pesan "Gw hafal angka beginian" lolos gerbang, tetapi ditandai tak tercek oleh penguji kartu Opus. Klaim tambahan yang tidak bisa dicek perlu ditolak kode di pesan.

### Amandemen A-2 (perbaikan kode, lalu satu jalan TIRT)

- **Kode (gratis).** `factory/llm/templat/a2.ts` dan `a2.test.ts`. Tes ditulis dulu terhadap fungsi kosong: 6 dari 9 merah. Tiga yang hijau adalah pemeriksaan "tidak boleh salah tolak", dan pengikatannya dibuktikan lewat sabotase. Sabotase A2-S1…S9 semuanya merah.
  1. G-klaim-tambahan: 13 pola dari jejak M2d-8…A-1. Keenam pesan soal tayang lolos tanpa pengecualian.
  2. Kebocoran kalender: hitungan hari di kunci dibandingkan dengan hari kerja antara tanggal yang tampil tanpa kartu. Pilihan templat benar-berincian kini tanpa tanggal akhir rangkaian.
  3. Pengecoh besaran: dekat tetapi salah (≤ 15 %), diambil dari rasio harga penutupan nyata. Di TIRT 2,02 (8 Des ÷ 26 Nov) menggantikan 3,51.
  4. Anti-ulang pemanasan: sebab-resmi 10 Des tidak lagi dipakai simulasi. Posisi TIRT menjadi angka-lain-waktu, setengah-benar, besaran-hitungan.
- **Jalan `m2d10-tirt-a2` (pagu 0,25): TIDAK TERBIT** sesudah 9 versi, biaya nyata US$0,1195.
  - Jalan berhenti karena pagu. Biaya tercatat US$0,1195, ditambah cadangan satu panggilan kritikus (US$0,1845), melewati pagu 0,25. Dengan pagu 0,25, sesudah satu kritikus praktis tidak ada ruang untuk kritikus kedua.
  - Omongan 1 (angka-lain-waktu) dikunci di versi 1: kritikus Wafer, 9.159 token penalaran.
  - Omongan 2: setengah-benar ditolak di 3 versi karena Haiku sendiri memilih kunci dengan yakin 72 (≥ A = 60). Alasannya: pesan bilang "belum pernah disetop tahun ini", sedangkan kunci menyebut tanggal penghentian 21 Januari. Kunci berbentuk "Keliru + tanggal spesifik" terbaca tanpa kartu.
  - Pengganti posisi 2, benar-berincian: ditolak di 3 versi oleh DeepSeek dan GLM (Haiku tidak). Tanggal akhir sudah tidak tampil, tetapi penebak tetap memilih "Betul, naik N hari bursa berturut-turut" karena klaimnya spesifik dan wajar. Perbaikan kalender menutup satu jalur tebakan, tetapi bentuk polanya sendiri masih tertebak.
  - Pengganti berikutnya, arah-kali-tingkat: versi 1 ditolak kode (penjelasan memuat angka telanjang). Versi 2 lolos penebak dan pembaca kartu, lalu berhenti karena pagu sebelum kritikus.
  - Omongan 3 (besaran-hitungan dengan pengecoh 2,02) tidak pernah dicapai.
  - Penyempurna Haiku dipanggil 4 kali; semua usulannya diterima kode, tetapi tidak mengubah hasil.
- **Distribusi:** kode 1, penebak 6, kartu 0, kritikus 0, lolos 1, pagu 1.
- **Uji luar tambahan** atas 1 omongan yang dikunci (hanya laporan, subagent saja, 6 opus baru, sinkron):
  - Tebak buta: c/45 · c/45 · c/50, tertebak 3/3.
  - Kartu: 3/3 benar, "kunci lain" 0/3.
  - Masalah makna: "kemarin" ditandai tak tercek oleh 3/3 penguji. Bahan uji luar tidak menyebut tanggal hari ini, jadi "kemarin" tidak bisa dipetakan.
  - Putusan: TIDAK — (a) tidak, (b) 0/1, (c) 1/1, (d) 1 masalah.
  - Pembanding A-1: pola yang sama lolos tebak buta 0/3 ketika kuncinya di huruf d dan pengecoh Rp115 di c. Kali ini kuncinya di c dan pengecoh di d, dan ketiga penguji memilih c. Penguji tampaknya memilih "Keliru, penutupan … RpX" yang pertama, jadi hasil tebak buta pola ini bergantung pada letak huruf.
- **G-klaim-tambahan belum lengkap.** "itu angka yang gw inget banget" lolos karena "inget" tidak ada di daftar pola.
- **Biaya A-2** US$0,1195: DeepSeek 0,0505, GLM 0,0461, Haiku 0,0228. Milestone M2d-10 kini US$0,6862 dari 1,20; kumulatif ledger US$8,9514.
- **Yang perlu diputuskan reviewer:**
  1. Setengah-benar: kunci yang menyebut tanggal spesifik terbaca tanpa kartu. Pengecoh perlu tanggal yang sama spesifiknya.
  2. Benar-berincian: tertebak dari bentuknya. Polanya perlu pengecoh Betul yang sama spesifik dan wajar.
  3. Pagu jalan di bawah ±0,4 tidak cukup untuk tiga kritikus, karena cadangan kritikus 0,18 per panggilan.
  4. Bahan uji luar perlu menyebut tanggal "hari ini", atau pesan perlu menyebut tanggal alih-alih "kemarin".
  5. Pola G-klaim-tambahan perlu diperluas ("inget", "yakin deh…", dan sejenisnya).
