# Bukti: kalibrasi gerbang terhadap soal manusia (M2d-8)

Berkas ini ditulis oleh `npm run kalibrasi:laporan` dari keluaran mentah di `eval/keluaran-m2d8/` (probe, kalibrasi, soal pemanasan, jalan TIRT, uji luar/putusan, draf terbaik) dan ledger OpenRouter (biaya NYATA `usage.cost`, tag `m2d8/`). Hanya bagian "Catatan penulis" yang ditulis tangan (`eval/keluaran-m2d8/laporan-tangan.md`). Tidak ada yang dipasang ke produk.

## Pra-registrasi (D-0)

`docs/bukti/m2d8-praregistrasi.md` di-commit **9631099 2026-09-30T17:18:40+07:00**; panggilan berbayar M2d-8 pertama di ledger: **2026-09-30T10:21:28.280Z**. Berkas itu dan pra-registrasi M2d-7 dites tidak berubah sejak commit masing-masing. Isi: himpunan beku (6 soal manusia teks tayang `ad0bf21`, 4 bocor, 6 aman, 2 tambahan), tumpukan tujuh gerbang, kode pelindung, urutan dan batas pelonggaran, penurunan ke "dicatat", syarat ≥ 5/6 manusia diterima dan ≥ 3/4 bocor ditolak, aturan penalar "high", soal pemanasan, draf terbaik.

## Penalar GLM `effort: "high"` (D-1)

| panggilan | penyedia | selesai | token penalaran | biaya | hasil |
|---|---|---|---:|---:|---|
| penebak/p2-o2 | Wafer | stop | 2.123 | US$0.0069 | d/60 (kunci d) |
| penebak/p4-o2 | Wafer | stop | 6.463 | US$0.0198 | a/60 (kunci d) |
| penebak/p5-o2 | Wafer | stop | 240 | US$0.0012 | tak terbaca |
| penebak/p6-o2 | Wafer | stop | 3.775 | US$0.0117 | a/60 (kunci d) |
| kritikus/p5-o2 | Wafer | length | 32.001 | US$0.0965 | tak terbaca |
| kritikus/p6-o2 | — | tidak dikirim (pagu) | — | — | PaguMilestoneTercapai: Pagu milestone tercapai: biaya milestone (tag m2d8/probe/ |

- effort "high": 0 panggilan probe ditolak penyedia (4xx)
- kritikus: keluaran selesai terpanjang 16121 (M2d-6 43 selesai + probe 0/1 selesai); ada kritikus probe yang habis di 32.000 → max_tokens 40000; ambang 1000
- penebak: kumpulan 70 (M2d-6 Wafer 66 + probe 4), kuartil bawah 508 → ambang 250; habis token 6/76 → max_tokens 8000

Setelan yang dipakai (`PENALAR_M2D8`): kritikus `max_tokens` 40.000, ambang 1.000; penebak ×3 `max_tokens` 8.000, ambang 250; `provider.order` ["wafer"].

## Kalibrasi (D-2)

Biaya kalibrasi US$0.5907 dari pagu US$0.7000. Terukur lengkap di semua gerbang: **5 soal** (dada-s1-kata-bursa, dada-s2-dividen-pemilik-kecil, dada-s3-siapa-yang-menjual, ultj-turun-di-tanggal-ex, ultj-riwayat-dividen); tidak lengkap: ultj-siapa-yang-membeli; belum dimulai: 12 soal (semua soal bocor, aman, dan tambahan). Yang tidak terukur tidak dilengkapi tangan.

Jalan pertama (konkurensi 2) berhenti karena perkiraan maksimum panggilan kritikus yang sedang berjalan ikut dihitung pagu, sebelum biaya nyata mencapai pagu (`mentah-jalan-1.json`). Lanjutan (`--lanjut`, prosedur dan urutan sama, satu soal sekaligus, gerbang yang sudah terukur tidak diukur ulang): ultj-riwayat-dividen, ultj-siapa-yang-membeli.

### Data mentah per soal

| soal | kunci | kode | meresmikan / keseimbangan | pilihan-saja | pembaca kartu | kritikus (token penalaran) | penebak GLM "high" |
|---|---|---|---|---|---|---|---|
| dada-s1-kata-bursa | b | PENJELASAN_TANPA_PENENTU | — / 0.909 | d/55 · d/70 | b | tanpa keberatan (12.444) | tak terbaca · d/80 · d/70 |
| dada-s2-dividen-pemilik-kecil | a | ANDAIAN_DI_PENJELASAN, G-register | viden / 0.981 | c/70 · c/65 | a | tertebak: Ketiga pilihan selain a bisa dieliminasi tanpa kartu karena bertentangan dengan nada 'receh' dan 'kebagian' di pesan, sehingga penebak yang tak membaca kartu punya peluang besar menebak a hanya dari nada. (26.987) | tak terbaca · c/60 · c/65 |
| dada-s3-siapa-yang-menjual | c | — | — / 1.043 | b/40 · d/40 | c | tanpa keberatan (16.770) | d/60 · b/45 · tak terbaca |
| ultj-turun-di-tanggal-ex | b | — | — / 0.804 | b/60 · d/30 | b | tanpa keberatan (9.046) | c/60 · tak terbaca · b/80 |
| ultj-riwayat-dividen | a | G-register | — / 0.985 | c/55 · c/45 | b | tanpa keberatan (29.812) | tak terbaca · b/50 · b/60 |
| ultj-siapa-yang-membeli | d | G-register | — / 1.058 | d/45 · d/60 | b | — | — |

Penebak "tak terbaca" = dua jawaban habis `max_tokens` 8.000 atau tidak terbukti berpikir (penjaga) — dihitung memilih kunci dengan yakin 100 (aturan M2d-2).

### Matriks sebelum (setelan §2)

| gerbang | manusia ditolak | bocor ditolak | aman ditolak | tambahan ditolak |
|---|---:|---:|---:|---:|
| kode | 3/5 | 0/0 | 0/0 | 0/0 |
| meresmikan | 0/5 | 0/0 | 0/0 | 0/0 |
| keseimbangan | 0/5 | 0/0 | 0/0 | 0/0 |
| pilihan_saja | 0/5 | 0/0 | 0/0 | 0/0 |
| kartu | 1/5 | 0/0 | 0/0 | 0/0 |
| kritikus | 1/5 | 0/0 | 0/0 | 0/0 |
| penebak | 5/5 | 0/0 | 0/0 | 0/0 |
| tumpukan | 5/5 | 0/0 | 0/0 | 0/0 |

### Langkah aturan §3

- awal: tumpukan menerima 0/5 soal manusia
- kode G-register (menolak 2 soal manusia) → dicatat; tumpukan menerima 0/5
- kode ANDAIAN_DI_PENJELASAN (menolak 1 soal manusia) → dicatat; tumpukan menerima 0/5
- kode PENJELASAN_TANPA_PENENTU (menolak 1 soal manusia) → dicatat; tumpukan menerima 0/5
- penebak → tingkat 1: penebak menolak 1 soal manusia; tumpukan menerima 2/5
- penebak → tingkat 2: penebak menolak 0 soal manusia; tumpukan menerima 3/5
- kritikus → tingkat 1: kritikus menolak 0 soal manusia; tumpukan menerima 4/5
- kartu → tingkat 1: kartu menolak 1 soal manusia; tumpukan menerima 4/5
- kartu di batas masih menolak soal manusia → DITURUNKAN menjadi "dicatat"; tumpukan menerima 5/5

### Matriks sesudah

| gerbang | manusia ditolak | bocor ditolak | aman ditolak | tambahan ditolak |
|---|---:|---:|---:|---:|
| kode | 0/5 | 0/0 | 0/0 | 0/0 |
| meresmikan | 0/5 | 0/0 | 0/0 | 0/0 |
| keseimbangan | 0/5 | 0/0 | 0/0 | 0/0 |
| pilihan_saja | 0/5 | 0/0 | 0/0 | 0/0 |
| kartu (dicatat) | 1/5 | 0/0 | 0/0 | 0/0 |
| kritikus | 0/5 | 0/0 | 0/0 | 0/0 |
| penebak | 0/5 | 0/0 | 0/0 | 0/0 |
| tumpukan | 0/5 | 0/0 | 0/0 | 0/0 |

**Setelan hasil (dipakai persis oleh lingkar TIRT):** penebak tingkat 2, pilihan-saja 0, meresmikan 0, keseimbangan 0, kritikus 1, pembaca kartu 1; "dicatat": kartu; kode diturunkan: G-register, ANDAIAN_DI_PENJELASAN, PENJELASAN_TANPA_PENENTU.

**Syarat tumpukan:** manusia diterima 5/5 → terpenuhi; bocor ditolak 0/0 → TIDAK terpenuhi (tidak terukur).

### Gerbang yang diturunkan menjadi "dicatat" (dengan data)

- **kartu** — di batas pelonggaran masih menolak 1 soal manusia: ultj-riwayat-dividen (pembaca memilih b, kunci a; alasannya "Kartu 2 menyatakan pembagian dividen tunai tercatat beruntun tanpa lompatan selama 7 tahun, sesuai klaim tiap tahun tanpa putus.").
- **kode G-register** — menolak 2 soal manusia: dada-s2-dividen-pemilik-kecil ("Pesan memakai "gue"; pakai "gw" atau "aku" (dan "lu" atau "kamu") seperti contoh gaya."); ultj-riwayat-dividen ("Pesan memakai "gue"; pakai "gw" atau "aku" (dan "lu" atau "kamu") seperti contoh gaya.").
- **kode ANDAIAN_DI_PENJELASAN** — menolak 1 soal manusia: dada-s2-dividen-pemilik-kecil ("Penjelasan memakai [[misal\|…]]; penjelasan hanya menyebut isi dokumen.").
- **kode PENJELASAN_TANPA_PENENTU** — menolak 1 soal manusia: dada-s1-kata-bursa ("Penjelasan tidak merujuk satu pun kartu penentu.").

Kritikus di kalibrasi: 5 panggilan, habis token 0 (target ≤ 1/10); penalaran 12.444, 26.987, 16.770, 9.046, 29.812. Penebak: 15 tebakan, tak terbaca 5.

### Pembanding tanpa jaringan (BUKAN bagian putusan)

Soal bocor/aman tidak terukur karena pagu. Gerbang yang gratis dan pasti (kode, meresmikan, keseimbangan) di bawah setelan hasil, hanya sebagai gambaran:

| soal | kelompok | kode menolak | meresmikan | keseimbangan |
|---|---|---|---|---|
| m2d5-tirt-o2 | bocor | — | tolak | — |
| m2d5-tirt-o3 | bocor | G-pilihan-kembar | — | — |
| m2d4-tirt-o3 | bocor | — | tolak | — |
| m2d4-tirt-o1 | bocor | — | — | — |
| m2d4-ultj-o1 | aman | G-penilaian | — | — |
| m2d4-ultj-o2 | aman | — | tolak | — |
| m2d4-ultj-o3 | aman | — | — | — |
| m2d4-dada-o2 | aman | — | — | tolak |
| m2d4-dada-o1 | aman | — | — | — |
| m2d5-tirt-o1 | aman | — | — | — |
| m2d6-tirt-o1 (tambahan) | bocor | — | — | — |
| m2d6-tirt-o2 (tambahan) | aman | — | — | tolak |

Penebak GLM "high" pada himpunan yang sama sudah pernah diukur di M2d-6 (susunan K3, `eval/keluaran-m2d6/kalibrasi/K3-s1.json`, penjaga ambang 300): keempat soal bocor ditolak menurut K-05, tetapi juga soal aman ULTJ o1/o2 (3/3 benar) — datanya dari milestone lain dan setelan penjaga lain, jadi tidak dipakai untuk syarat.

## Soal pemanasan (D-3, mode dipandu)

Kartu `susp-2025-12-10` + `susp-2025-01-21`, klaim teman Keliru, huruf kunci b (kode). **Tidak ada soal: 4 percobaan tanpa soal yang lolos semua gerbang.** Biaya US$0.0179.

**Percobaan 1** — ditolak (US$0.0029)

> **sinta (20.15):** Gw dengar saham itu dihentikan hari ini karena ada keraguan atas kelangsungan usahanya, ya?

- a) Betul, penghentian hari ini karena keraguan atas kelangsungan usaha.
- b) Keliru, alasan resmi peningkatan harga kumulatif yang signifikan. (kunci)
- c) Betul, bursa menilai ada keraguan atas kelangsungan usaha.
- d) Keliru, alasan resmi karena keraguan atas kelangsungan usaha.

Penjelasan: Di 10 Desember 2025, alasan resmi penghentian adalah peningkatan harga kumulatif yang signifikan untuk cooling down. Klaim teman soal keraguan atas kelangsungan usaha tidak cocok dengan kartu ini. Salah-kaprah yang umum: alasan resmi penghentian 21 Januari 2025 dikira alasan penghentian hari ini.

- menolak: [RUJUKAN_PANJANG] Penjelasan: teks rujukan "peningkatan harga kumulatif yang signifikan" 43 karakter, lebih dari 36.

**Percobaan 2** — ditolak (US$0.0055)

> **maya (20.15):** Gw dengar saham itu dihentikan hari ini karena ada keraguan atas kelangsungan usahanya, ya?

- a) Betul, penghentian hari ini karena keraguan atas kelangsungan usaha.
- b) Keliru, alasan resmi peningkatan harga kumulatif yang signifikan. (kunci)
- c) Betul, bursa menilai ada keraguan atas kelangsungan usaha.
- d) Keliru, alasan resmi karena keraguan atas kelangsungan usaha.

Penjelasan: Di 10 Desember 2025, alasan resmi penghentian adalah peningkatan harga kumulatif untuk cooling down. Klaim teman soal keraguan atas kelangsungan usaha tidak cocok dengan kartu ini. Salah-kaprah yang umum: alasan resmi penghentian 21 Januari 2025 dikira alasan penghentian hari ini.

- menolak: [pembaca kartu 1] memilih "c" (kunci "b"), tidak menunjuk kartu 1; alasannya: "Kartu 2 menyatakan alasan resmi penghentian sementara adalah keraguan atas kelangsungan usaha, cocok dengan omongan Maya."

**Percobaan 3** — ditolak (US$0.0042)

> **sinta (20.15):** Gw dengar saham itu dihentikan sementara hari ini karena ada keraguan atas kelangsungan usahanya, ya?

- a) Betul, penghentian hari ini karena keraguan atas kelangsungan usaha.
- b) Keliru, alasan resmi peningkatan harga kumulatif yang signifikan. (kunci)
- c) Betul, bursa menilai ada keraguan atas kelangsungan usaha.
- d) Keliru, penghentian dibuka lagi tidak lama.

Penjelasan: Di 10 Desember 2025, alasan resmi penghentian adalah peningkatan harga kumulatif yang signifikan. Klaim teman soal keraguan atas kelangsungan usaha tidak cocok dengan kartu ini. Salah-kaprah yang umum: alasan resmi penghentian 21 Januari 2025 dikira alasan penghentian hari ini.

- menolak: [RUJUKAN_PANJANG] Penjelasan: teks rujukan "peningkatan harga kumulatif yang signifikan" 43 karakter, lebih dari 36.

**Percobaan 4** — ditolak (US$0.0052)

> **tania (20.15):** Gw dengar saham itu dihentikan sementara hari ini karena ada keraguan atas kelangsungan usahanya, ya?

- a) Betul, alasan resmi keraguan atas kelangsungan usaha.
- b) Keliru, alasan resmi peningkatan harga kumulatif. (kunci)
- c) Betul, bursa menilai ada keraguan atas kelangsungan usaha.
- d) Keliru, lama penghentian bisa dipastikan.

Penjelasan: Di 10 Desember 2025, alasan resmi penghentian adalah peningkatan harga kumulatif. Klaim teman soal keraguan atas kelangsungan usaha tidak cocok dengan kartu ini. Salah-kaprah yang umum: alasan resmi penghentian 21 Januari 2025 dikira alasan penghentian hari ini.

- menolak: [pembaca kartu 1] memilih "c" (kunci "b"), tidak menunjuk kartu 1; alasannya: "Kartu 2 menyebut alasan resmi penghentian sementara adalah karena bursa menilai ada keraguan atas kelangsungan usaha perseroan."

## Satu jalan TIRT (D-4)

**TIDAK TERBIT** sesudah 9 putaran (omongan 2 gagal di 3 sudut (naik-2025-11-26-2025-12-09, susp-2025-01-21, hari-naik-beruntun); simulasi tidak terbit); omongan dikunci: 1; 104 panggilan, US$0.9072.

- Status per versi: ditolak-pemeriksa 10, ditolak-tebak 2, lolos 1, ditolak-kritikus 5, ditolak-artefak 2.
- Penolakan yang DICATAT (gerbang/kode yang diturunkan, tidak menolak): kritikus 4, pembaca kartu 2.
- Kritikus: 9 panggilan, habis token 1 (target ≤ 1/10).
- omongan 1: `susp-2025-12-10` → lolos (1–2)
- omongan 2: `naik-2025-11-26-2025-12-09` → dibuang (1–3); `susp-2025-01-21` → dibuang (4–6); `hari-naik-beruntun` → dibuang (7–9)
- omongan 3: `rups-2025-09-25` → dibuang (1–3); `kelipatan-2025-11-26-2025-12-09` → dibuang (4–7); `volume-2025-12-10` → berjalan (8–…)

### Uji luar dan putusan mekanis (pra-registrasi M2d-7, tidak diubah)

| syarat | hasil | terpenuhi |
|---|---|---|
| (a) terbit | tidak terbit | **tidak** |
| (b) tebak buta luar ≥ 2/6 (proporsi soal manusia) | 0/1 | **tidak** |
| (c) jawab-dengan-kartu K-05 penuh | 1/1 | ya |
| (d) nol masalah makna | 1 masalah | **tidak** |

**Putusan: TIDAK layak tayang.**

- omongan 1 (kunci c): tebak c/50 · c/55 · c/55 → tidak; kartu c/1+2 · c/1+3 · c/1+2 → lolos; masalah makna: M1 kunci tunggal (3/3 penguji kartu ("kunci_lain"))

Kealamian (3 penilai opus baru, dilaporkan, bukan syarat): agen-m2d6 3/3/3 (rata-rata 3,00); agen-m2d8 3/4/3 (rata-rata 3,33); agen-m2d5 4/3/4 (rata-rata 3,67); manusia 5/4/4 (rata-rata 4,33); agen-m2d4 3/3/3 (rata-rata 3,00).

### Draf terbaik untuk penyetuju (tidak disunting)

Lengkap di `eval/keluaran-m2d8/penguji/draf-terbaik.md`. Ringkas: omongan 1 putaran 2 — lolos (tahap terjauh: dikunci); omongan 2 putaran 2 — ditolak-kritikus (tahap terjauh: kritikus); omongan 3 putaran 9 — ditolak-tebak (tahap terjauh: penebak).

## Biaya NYATA M2d-8 (OpenRouter, `usage.cost`)

Entri ledger bertag `m2d8/`: **US$1.6519 dalam 162 panggilan**, dari pagu milestone US$2.3000 (ditegakkan kode). Kumulatif ledger OpenRouter M2d-5…M2d-8: US$7.1693.

| bagian · peran | panggilan | token keluar | biaya nyata |
|---|---:|---:|---:|
| jalan TIRT · kritikus | 9 | 204.428 | US$0.6167 |
| jalan TIRT · pembaca kartu | 8 | 12.111 | US$0.0080 |
| jalan TIRT · penebak | 14 | 22.440 | US$0.0701 |
| jalan TIRT · penulis (penjelasan) | 21 | 59.041 | US$0.0360 |
| jalan TIRT · penulis (pesan) | 8 | 7.659 | US$0.0066 |
| jalan TIRT · penulis (pilihan) | 22 | 144.931 | US$0.1097 |
| jalan TIRT · pilihan-saja | 22 | 92.070 | US$0.0600 |
| kalibrasi · kritikus | 5 | 96.356 | US$0.2911 |
| kalibrasi · pembaca kartu | 6 | 7.408 | US$0.0042 |
| kalibrasi · penebak | 22 | 87.843 | US$0.2670 |
| kalibrasi · pilihan-saja | 14 | 39.719 | US$0.0284 |
| pemanasan · pembaca kartu | 2 | 11.237 | US$0.0060 |
| pemanasan · penulis (pemanasan) | 4 | 23.004 | US$0.0118 |
| probe · kritikus | 1 | 32.000 | US$0.0965 |
| probe · penebak | 4 | 13.004 | US$0.0396 |

| model · penyedia | panggilan | biaya nyata |
|---|---:|---:|
| z-ai/glm-5.3 · Wafer | 51 | US$1.3767 |
| deepseek/deepseek-v4.1-flash · Relace | 27 | US$0.0692 |
| deepseek/deepseek-v4.1-flash · Phala | 3 | US$0.0247 |
| deepseek/deepseek-v4.1-flash · Morph | 13 | US$0.0243 |
| deepseek/deepseek-v4.1-flash · InferenceNet | 16 | US$0.0208 |
| deepseek/deepseek-v4.1-flash · Baidu | 2 | US$0.0208 |
| deepseek/deepseek-v4.1-flash · Modal | 2 | US$0.0187 |
| deepseek/deepseek-v4.1-flash · Wafer | 11 | US$0.0141 |
| deepseek/deepseek-v4.1-flash · GMICloud | 2 | US$0.0128 |
| deepseek/deepseek-v4.1-flash · Alibaba | 2 | US$0.0107 |
| deepseek/deepseek-v4.1-flash · Io Net | 4 | US$0.0100 |
| deepseek/deepseek-v4.1-flash · StreamLake | 4 | US$0.0093 |
| deepseek/deepseek-v4.1-flash · DekaLLM | 8 | US$0.0083 |
| deepseek/deepseek-v4.1-flash · Fireworks | 2 | US$0.0061 |
| deepseek/deepseek-v4.1-flash · Krea | 1 | US$0.0056 |
| deepseek/deepseek-v4.1-flash · Ionstream | 3 | US$0.0043 |
| deepseek/deepseek-v4.1-flash · CoreWeave | 2 | US$0.0042 |
| deepseek/deepseek-v4.1-flash · Makora | 1 | US$0.0027 |
| deepseek/deepseek-v4.1-flash · NextBit | 2 | US$0.0020 |
| deepseek/deepseek-v4.1-flash · DeepInfra | 1 | US$0.0014 |
| z-ai/glm-5.3 · Together | 1 | US$0.0013 |
| z-ai/glm-5.3 · Cloudflare | 1 | US$0.0013 |
| z-ai/glm-5.3 · SiliconFlow | 1 | US$0.0009 |
| deepseek/deepseek-v4.1-flash · Novita | 1 | US$0.0009 |
| z-ai/glm-5.3 · Phala | 1 | US$0.0007 |

## Catatan penulis

### Singkatnya

- **Kalibrasi (D-2):** dengan setelan awal, tumpukan menolak **5 dari 5** soal manusia yang terukur. Aturan pra-registrasi menurunkan tiga kode gaya (G-register "gue", `ANDAIAN_DI_PENJELASAN`, `PENJELASAN_TANPA_PENENTU`), menaikkan penebak ke "3/3 memilih kunci", menaikkan kritikus ke tingkat 1 ("tertebak" tidak menolak), dan **menurunkan pembaca kartu menjadi "dicatat"** (ULTJ riwayat-dividen: pembaca DeepSeek memilih b, kunci a). Sesudahnya 5/5 diterima. **Syarat bocor tidak terukur (0/0)**: pagu kalibrasi habis sebelum satu pun soal bocor/aman diukur. Satu syarat terpenuhi, satu tidak.
- **Soal pemanasan (D-3):** **tidak ada soal** sesudah 4 percobaan (US$0,018). Dua kali label rujukan terlalu panjang; dua kali pembaca kartu memilih pengecoh "Betul, bursa menilai ada keraguan atas kelangsungan usaha." — kalimat yang memang benar untuk penghentian Januari. Gerbangnya benar menolak soal yang ambigu.
- **Jalan TIRT (D-4):** **tidak terbit** sesudah 9 putaran (US$0,907). Satu omongan dikunci. Uji luar hanya untuk laporan: 3/3 penguji buta memilih kunci, dan 3/3 penguji kartu menyebut pilihan a juga benar. Putusan mekanis terhadap pra-registrasi M2d-7: **TIDAK layak tayang**.
- **Biaya nyata M2d-8:** US$1,6519 dari pagu US$2,30 (probe 0,136 · kalibrasi 0,591 · pemanasan 0,018 · jalan 0,907). Kumulatif ledger M2d-5…M2d-8 US$7,169 dari `LLM_PAGU_USD` 8.

### Temuan yang paling penting

1. **Omongan yang lolos semua gerbang tetap bocor dan ambigu, dan penyebabnya bukan pelonggaran.** Versi yang dikunci (putaran 2, omongan 1) lolos di SETIAP gerbang pada setelan awal juga: pembaca kartu memilih kunci, kritikus "high" tanpa keberatan, penebak GLM memilih a/65 · a/75 · a/60 (0/3 kunci). Tidak ada satu pun catatan "dicatat" pada versi itu. Penguji Opus luar sebaliknya memilih kunci 3/3 tanpa kartu, dan 3/3 penguji kartu menyebut a juga benar: teman tidak menyebut penghentian yang mana, dan kartu Januari memang memuat alasan "keraguan atas kelangsungan usaha". Masalahnya ambiguitas rujukan waktu ("disetop" yang mana). Ambiguitas yang sama sudah ditangkap pembaca kartu di soal pemanasan, tetapi di sini lolos.
2. **Arah ketidaksesuaian GLM terhadap Opus bisa berbalik.** Di M2d-7 penebak GLM "max" lebih keras dari penguji luar (menebak soal aman). Di M2d-8 penebak GLM "high" memilih pengecoh yang sama, sementara Opus menebak kunci. Satu penebak GLM tanpa kartu bukan wakil penguji luar, dalam arah mana pun.
3. **Penebak "high" menolak semua soal manusia karena tebakan yang tak terbaca.** 5 dari 15 tebakan kalibrasi tak terbaca: habis `max_tokens` 8.000 dua kali, atau penalaran di bawah ambang 250 lalu ulangan jatuh ke penyedia dangkal. Tebakan tak terbaca dihitung "memilih kunci, yakin 100" (aturan M2d-2). Di kelima soal manusia yang terukur, penolakan penebak di tingkat awal datang dari aturan itu (empat soal hanya karena tebakan tak terbaca; ULTJ s1 karena satu benar + satu tak terbaca), bukan dari tebakan yang benar.
4. **Kritikus "high" berpikir sangat panjang pada soal manusia**: 9.046–29.812 token penalaran, US$0,03–0,09 per panggilan. Aturan probe memberi `max_tokens` 40.000 karena versi tersulit jalan 2 M2d-7 habis di 32.000 dengan "high" juga. Dengan 40.000, 1 dari 14 panggilan kritikus (kalibrasi + jalan) habis token. Itu 7%, dalam target ≤ 1/10. Di jalan saja 1 dari 9 (11%). Harganya: perkiraan maksimum per panggilan US$0,185 ikut dicadangkan pagu, sehingga kalibrasi berhenti di soal manusia keenam dengan biaya nyata US$0,59 dari 0,70.
5. **Pembaca kartu DeepSeek salah di dua soal manusia**: ULTJ riwayat-dividen terukur dan menyebabkan penurunan, dan ULTJ siapa-yang-membeli juga salah (memilih b, kunci d) walau soal itu tidak lengkap sehingga tidak dihitung. Gerbang K-05 dengan satu pembaca DeepSeek terlalu berisik untuk soal manusia yang dua sisinya benar ("setengah omongan cocok").

### Keputusan yang diambil eksekutor (bisa ditolak reviewer)

1. **Lanjutan kalibrasi (`--lanjut`).** Jalan pertama (konkurensi 2) berhenti karena cadangan perkiraan maksimum kritikus yang sedang berjalan, pada biaya nyata US$0,470. Lanjutan memakai prosedur dan urutan yang sama, satu soal sekaligus, di pagu yang sama. Gerbang yang sudah terukur tidak diukur ulang. Untuk ULTJ riwayat-dividen, konteks kritikus memakai jawaban pembaca kartu yang tersimpan (medan kartu yang ditunjuk belum ada di entri lama, jadi diambil dari "menunjuk penentu"). Bila reviewer menganggap ini melanggar "berhenti di pagu", syaratnya menjadi 4 soal manusia terukur (dengan setelan yang mungkin lain).
2. **`ANDAIAN_DI_PENJELASAN` digolongkan bukan-pelindung**, dengan alasan tertulis di pra-registrasi. Saya sudah tahu DADA s2 memicunya saat menulis (pra-registrasi §6 mencatat semua hasil gerbang kode yang sudah diketahui).
3. **`KATA_PENILAIAN` memakai pengecualian "kabar buruk" M2d-5** yang sudah ada di G-penilaian. Tanpa itu, kode pelindung menolak ULTJ s1.
4. **Syarat 5/6 sebagai porsi dengan 5 soal terukur = 5/5.** Karena itu pembaca kartu diturunkan pada 4/5 (80% < 83%). Dengan 6 soal terukur, 5/6 mungkin cukup tanpa menurunkan pembaca kartu.
5. **Pemeriksa anti-bocor melepas frasa wajib validator** "Salah-kaprah yang umum:" sebelum memotong 5 kata, karena frasa itu templat, bukan isi kasus tayang.
6. **Pembanding M2d-6 K3 dan gerbang gratis atas soal bocor** ditampilkan hanya sebagai gambaran, tidak dipakai untuk syarat.

### Keterbatasan

- n sangat kecil: 5 soal manusia, 0 soal bocor/aman terukur, satu jalan TIRT, satu omongan diuji di luar.
- Satu penguji kartu menambahkan kalimat di luar JSON yang menyebut "T-03". Kemungkinan dari pesan commit di konteks git subagent, jadi subagent "baru" belum tentu tanpa konteks repo. Jawabannya dipakai, karena JSON-nya terbaca, dan sama dengan dua penguji lain (c, kunci_lain a).
- Kalimat kartu soal manusia = `klaim` fakta kasus. Di produk, 8 dari 62 kartu DADA tampil dengan versi awam (`awam.isi`).
- GLM: 55 panggilan, sebagian besar di Wafer (`order`). Ulangan penjaga penalaran jatuh ke Cloudflare, Together, SiliconFlow, dan Phala, yang berpikir dangkal.
- Tidak ada panggilan Sectors. `web/`, `server/`, `cases/`, `factory/verifikasi/`, `factory/kasus/`, `alat/`, `deploy/` tidak disentuh. Tidak ada yang dipasang ke produk.
